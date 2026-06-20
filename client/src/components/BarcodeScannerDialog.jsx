import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography, CircularProgress, Box, TextField, LinearProgress } from "@mui/material";

function getCameraErrorMessage(error) {
  const name = String(error?.name || "");
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Няма достъп до камера. Разреши Camera за сайта от настройките на браузъра.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Не е открита камера на устройството.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Камерата е заета от друго приложение. Затвори другите приложения и опитай пак.";
  }
  if (name === "SecurityError") {
    return "Камерата е блокирана от настройките за сигурност на браузъра.";
  }
  if (name === "OverconstrainedError") {
    return "Камерата не поддържа избрания режим. Опитвам с алтернативни настройки.";
  }
  return error?.message || "Камерата не може да бъде стартирана. Провери достъпа на браузъра.";
}

export default function BarcodeScannerDialog({ open, onClose, onDetected, onError, title = "Сканирай баркод или QR", description = "Насочи камерата към баркод или QR код и изчакай резултата." }) {
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
    } catch {
      // ignore stop errors
    }
    controlsRef.current = null;

    try {
      codeReaderRef.current?.reset?.();
    } catch {
      // ignore reset errors
    }
  }

  useEffect(() => {
    if (!open) return undefined;

    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;
    let active = true;

    async function waitForVideoElement(maxAttempts = 25) {
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (!active) return null;
        if (videoRef.current) return videoRef.current;
        // Dialog content may mount after the effect starts
        await new Promise((resolve) => window.setTimeout(resolve, 40));
      }
      return null;
    }

    async function startScanner() {
      updateStatus("initializing", "Подготвям камерата...");
      setInitProgress(0);

      const videoElement = await waitForVideoElement();
      if (!videoElement) {
        updateStatus("error", "Камерата не може да бъде стартирана. Опитай да затвориш и отвориш скенера отново.");
        return;
      }

      const callback = (result, error) => {
        if (!active) return;

        if (result) {
          const code = result.getText();
          updateStatus("detected", `✓ Сканирано: ${code}`);
          active = false;
          stopScanner();
          onDetected?.(code);
          return;
        }

        if (error) {
          if (error?.name === "NotFoundException") {
            if (statusRef.current !== "scanning") {
              setInitProgress(100);
              updateStatus("scanning", "Камерата е готова. Насочи я към баркод или QR код...");
            }
            return;
          }

          if (error?.name === "ChecksumException" || error?.name === "FormatException") {
            return;
          }

          const errorMessage = error?.message || "Неуспешно сканиране.";
          updateStatus("error", errorMessage);
          onError?.(error);
        }
      };

      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error("Този браузър не поддържа достъп до камера.");
        }

        setMessage("Проверявам камерата...");
        setInitProgress(30);

        // Trigger permission prompt first for better mobile compatibility
        const probeStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
        setInitProgress(45);
        probeStream.getTracks().forEach((track) => track.stop());

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (!devices.length) {
          throw new Error("Не е открита камера. Провери разрешенията на браузъра.");
        }
        const preferred =
          devices.find((device) => /back|rear|environment|trasera|traseira|arriere|задна/i.test(device?.label || "")) ||
          devices[devices.length - 1] ||
          devices[0];

        setInitProgress(65);
        const controls = await codeReader.decodeFromVideoDevice(preferred?.deviceId, videoElement, callback);
        controlsRef.current = controls;

        if (active) {
          setInitProgress(100);
          updateStatus("scanning", "Камерата е готова. Насочи я към баркод или QR код...");
        }
      } catch (error) {
        if (!active) return;
        const fallbackMessage = getCameraErrorMessage(error);
        updateStatus("error", fallbackMessage);
        onError?.(error);
      }
    }

    startScanner();

    return () => {
      active = false;
      stopScanner();
    };
  }, [open, onDetected, onError]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
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
