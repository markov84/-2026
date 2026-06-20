import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography, CircularProgress, Box, TextField, LinearProgress } from "@mui/material";

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
    const videoElement = videoRef.current;
    let active = true;

    async function startScanner() {
      if (!videoElement) return;
      updateStatus("initializing", "Подготвям камерата...");
      setInitProgress(0);

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

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
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
        const fallbackMessage = error?.message || "Камерата не може да бъде стартирана. Провери достъпа на браузъра.";
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
