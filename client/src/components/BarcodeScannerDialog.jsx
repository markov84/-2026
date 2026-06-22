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

    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;
    let active = true;

    async function waitForVideoElement(maxAttempts = 50) {
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (!active) return null;
        if (videoRef.current) {
          return videoRef.current;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 80));
      }
      return null;
    }

    async function startScanner() {
      updateStatus("initializing", "Подготвям камерата...");
      setInitProgress(0);

      const videoElement = await waitForVideoElement();
      if (!videoElement) {
        console.error("Видеото елемент не е готов");
        updateStatus("error", "Видеото не е готово. Опитай отново.");
        return;
      }

      const resultCallback = (result, error) => {
        if (!active) return;

        if (result) {
          try {
            const code = result.getText();
            console.log("✓ Код сканиран:", code);
            updateStatus("detected", `✓ Сканирано: ${code}`);
            active = false;
            stopScanner();
            onDetected?.(code);
          } catch (e) {
            console.log("Грешка при извличане на текст:", e?.message);
          }
          return;
        }

        if (error) {
          const errorName = error?.name || "";
          
          if (errorName === "NotFoundException") {
            if (statusRef.current !== "scanning") {
              setInitProgress(100);
              updateStatus("scanning", "Камерата е готова. Насочи я към баркод или QR код...");
            }
            return;
          }

          if (errorName === "ChecksumException" || errorName === "FormatException") {
            return;
          }

          if (errorName !== "NotSupportedError" && errorName !== "AbortError") {
            console.warn("Грешка при сканиране:", errorName, error?.message);
          }
        }
      };

      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error("Този браузър не поддържа достъп до камера.");
        }

        setMessage("Проверявам камерата...");
        setInitProgress(30);

        const devices = (await BrowserMultiFormatReader.listVideoInputDevices()) || [];
        if (!Array.isArray(devices) || devices.length === 0) {
          throw new Error("Не е открита камера. Провери разрешенията на браузъра.");
        }

        setInitProgress(45);
        const preferred =
          devices.find((device) => /back|rear|environment|trasera|traseira|arriere|задна/i.test(device?.label || "")) ||
          devices[devices.length - 1] ||
          devices[0];

        console.log("Начало на сканиране със камера:", preferred?.label);
        setInitProgress(65);

        const controls = await codeReader.decodeFromVideoDevice(
          preferred?.deviceId,
          videoElement,
          resultCallback
        );
        controlsRef.current = controls;

        if (active) {
          setInitProgress(100);
          updateStatus("scanning", "Камерата е готова. Насочи я към баркод или QR код...");
          console.log("Сканерът е активен");
        }
      } catch (error) {
        if (!active) return;
        const fallbackMessage = getCameraErrorMessage(error);
        console.error("Грешка при стартиране на сканера:", error?.message);
        updateStatus("error", fallbackMessage);
        onError?.(error);
      }
    }

    startScanner();

    return () => {
      active = false;
      stopScanner();
      if (videoRef.current) {
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
