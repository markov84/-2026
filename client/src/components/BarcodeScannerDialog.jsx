import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography, CircularProgress, Box, TextField, LinearProgress } from "@mui/material";
import { useMobileDetection } from "../hooks/useMobileDetection";

function getCameraErrorMessage(error) {
  const name = String(error?.name || "");
  // Camera permission errors
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Няма достъп до камера. Разреши Camera за сайта от настройките на браузъра.";
  }
  // Device not found
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Не е открита камера на устройството.";
  }
  // Camera is in use
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Камерата е заета от друго приложение. Затвори другите приложения и опитай пак.";
  }
  // Security blocked
  if (name === "SecurityError") {
    return "Камерата е блокирана от настройките за сигурност на браузъра.";
  }
  // Camera doesn't support constraints
  if (name === "OverconstrainedError") {
    return "Камерата не поддържа избрания режим. Опитвам с алтернативни настройки.";
  }
  return error?.message || "Камерата не може да бъде стартирана. Провери достъпа на браузъра.";
}

export default function BarcodeScannerDialog({ open, onClose, onDetected, onError, title = "Сканирай баркод или QR", description = "Насочи камерата към баркод или QR код и изчакай резултата." }) {
  const isMobile = useMobileDetection();
  const [status, setStatus] = useState("initializing");
  const [message, setMessage] = useState("Подготвям камерата...");
  const [manualCode, setManualCode] = useState("");
  const [initProgress, setInitProgress] = useState(0);
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const controlsRef = useRef(null);
  const statusRef = useRef("initializing");

  function updateStatus(nextStatus, nextMessage) {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
    setMessage(nextMessage);
  }

  function stopScanner() {
    try {
      controlsRef.current?.stop?.();
    } catch (e) {
      // ignore
    }
    controlsRef.current = null;

    try {
      codeReaderRef.current?.reset?.();
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    if (!open) return undefined;

    let active = true;
    let codeReader = null;

    async function initializeScanner() {
      try {
        codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;

        updateStatus("initializing", "Подготвям камерата...");
        setInitProgress(0);

        // Чакам видеото елемент да е готов
        let videoElement = null;
        for (let i = 0; i < 60 && !videoElement; i += 1) {
          if (!active) return;
          videoElement = videoRef.current;
          if (!videoElement) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        if (!videoElement) {
          console.error("❌ Видеото елемент не е намерен");
          updateStatus("error", "Видеото елемент не е готово.");
          return;
        }

        console.log("✓ Видеото елемент е намерено");

        // Проверка за поддръжка на API
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error("mediaDevices API не е поддържан");
        }

        setMessage("Проверявам камерата...");
        setInitProgress(30);

        // Намираме достъпни камери
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        console.log("📷 Намерени камери:", devices.length, devices.map((d) => d.label));

        if (!devices || devices.length === 0) {
          throw new Error("Не е намерена камера");
        }

        setInitProgress(45);

        // Избираме задна камера
        const backCamera =
          devices.find((device) => /back|rear|environment|задна/i.test(device?.label || "")) ||
          devices[devices.length - 1] ||
          devices[0];

        console.log("📱 Избрана камера:", backCamera.label, backCamera.deviceId);
        setInitProgress(65);

        // Callback за сканиране
        const onResult = (result, error) => {
          if (!active) return;

          if (result) {
            const code = result.getText();
            console.log("✅ КОД ДЕТЕКТИРАН:", code);
            updateStatus("detected", `✓ Сканирано: ${code}`);
            active = false;
            controlsRef.current?.stop?.();
            onDetected?.(code);
            return;
          }

          if (error) {
            const name = error?.name || "";
            if (name === "NotFoundException") {
              if (statusRef.current !== "scanning") {
                console.log("🔍 Сканиране активно...");
                setInitProgress(100);
                updateStatus("scanning", "Камерата е активна. Насочи я към баркод.");
              }
            } else if (name !== "ChecksumException" && name !== "FormatException") {
              console.debug("⚠️ Грешка:", name);
            }
          }
        };

        console.log("🚀 Стартирам сканер...");
        const controls = await codeReader.decodeFromVideoDevice(backCamera.deviceId, videoElement, onResult);
        controlsRef.current = controls;

        if (active) {
          setInitProgress(100);
          updateStatus("scanning", "Камерата е активна. Насочи я към баркод.");
          console.log("✅ Сканер активен!");
        }
      } catch (error) {
        if (!active) return;
        console.error("❌ Грешка:", error?.message || error);
        const msg = getCameraErrorMessage(error);
        updateStatus("error", msg);
        onError?.(error);
      }
    }

    initializeScanner();

    return () => {
      active = false;
      controlsRef.current?.stop?.();
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            // ignore
          }
        });
        videoRef.current.srcObject = null;
      }
    };
  }, [open, onDetected, onError]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {!isMobile ? (
            <Typography variant="body2" color="text.secondary">
              💡 Камерата е налична само на мобилни устройства. Сканирай с телефона си или въведи баркод ръчно тук.
            </Typography>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
              <Box sx={{ position: "relative", borderRadius: 2, overflow: "hidden", bgcolor: "rgba(0,0,0,0.06)", minHeight: 260 }}>
                <video 
                  ref={videoRef} 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                  muted 
                  playsInline
                  autoPlay
                  webkitPlaysinline
                />
                <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none", border: "2px dashed rgba(255,255,255,0.9)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.45)" }} />
              </Box>
              {status === "initializing" && (
                <Box>
                  <LinearProgress variant="determinate" value={initProgress} sx={{ mb: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    Инициализиране {initProgress}%...
                  </Typography>
                </Box>
              )}
              <Stack direction="row" alignItems="center" spacing={1}>
                {status === "error" ? null : <CircularProgress size={18} />}
                <Typography variant="body2" color={status === "error" ? "error.main" : "text.secondary"}>
                  {message}
                </Typography>
              </Stack>
            </>
          )}
          <TextField
            size="small"
            fullWidth
            label="Код, ако камерата не работи"
            placeholder="Въведи или постави код тук"
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                const value = String(manualCode || "").trim();
                if (value) {
                  onDetected?.(value);
                  setManualCode("");
                }
              }
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            const value = String(manualCode || "").trim();
            if (value) {
              onDetected?.(value);
              setManualCode("");
            }
          }}
          disabled={!manualCode.trim()}
        >
          Използвай ръчно
        </Button>
        <Button onClick={onClose} color="inherit">
          Затвори
        </Button>
      </DialogActions>
    </Dialog>
  );
}
