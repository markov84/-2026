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

  useEffect(() => {
    if (!open) return undefined;

    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;
    const videoElement = videoRef.current;
    let active = true;
    let timeoutId = null;

    async function startScanner() {
      if (!videoElement) return;
      setStatus("initializing");
      setMessage("Подготвям камерата...");
      setInitProgress(0);

      const callback = (result, error) => {
        if (!active) return;

        if (result) {
          const code = result.getText();
          setStatus("detected");
          setMessage(`✓ Сканирано: ${code}`);
          active = false;
          if (timeoutId) clearTimeout(timeoutId);
          try {
            codeReader.reset();
          } catch {
            // ignore reset errors
          }
          onDetected?.(code);
          return;
        }

        if (error) {
          if (error?.name === "NotFoundException") {
            if (status !== "scanning") {
              setInitProgress(100);
              setStatus("scanning");
              setMessage("📷 Камерата е готова. Насочи я към баркод или QR код...");
            }
            return;
          }

          const errorMessage = error?.message || "Неуспешно сканиране.";
          setStatus("error");
          setMessage(errorMessage);
          onError?.(error);
        }
      };

      try {
        setMessage("Проверявам камератата...");
        setInitProgress(30);

        // Try environment camera with timeout
        const environmentPromise = codeReader.decodeFromConstraints(
          {
            video: {
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          },
          videoElement,
          callback
        );

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT")), 4000)
        );

        try {
          await Promise.race([environmentPromise, timeoutPromise]);
          if (active) setInitProgress(100);
        } catch (error) {
          if (error?.message === "TIMEOUT" && active) {
            setMessage("Пробвам алтернативен начин да стартирам камерата...");
            setInitProgress(50);
            await codeReader.decodeFromVideoDevice(undefined, videoElement, callback);
            if (active) setInitProgress(100);
          } else {
            throw error;
          }
        }
      } catch (error) {
        if (!active) return;
        try {
          setMessage("Стартирам камерата с автоматичен избор...");
          setInitProgress(60);
          await codeReader.decodeFromVideoDevice(undefined, videoElement, callback);
          if (active) setInitProgress(100);
        } catch (innerError) {
          if (!active) return;
          const fallbackMessage = innerError?.message || "Камерата не може да бъде стартирана. Провери доступа на браузъра.";
          setStatus("error");
          setMessage(fallbackMessage);
          onError?.(innerError);
        }
      }
    }

    startScanner();

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
      try {
        codeReader.reset();
      } catch {
        // ignore reset errors on cleanup
      }
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
