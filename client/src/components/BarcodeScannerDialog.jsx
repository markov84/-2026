import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography, CircularProgress, Box } from "@mui/material";

export default function BarcodeScannerDialog({ open, onClose, onDetected, onError, title = "Сканирай баркод или QR", description = "Насочи камерата към баркод или QR код и изчакай резултата." }) {
  const [status, setStatus] = useState("initializing");
  const [message, setMessage] = useState("Подготвям камерата...");
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;
    const videoElement = videoRef.current;
    let active = true;

    async function startScanner() {
      if (!videoElement) return;
      setStatus("initializing");
      setMessage("Подготвям камерата...");

      const callback = (result, error) => {
        if (!active) return;

        if (result) {
          const code = result.getText();
          setStatus("detected");
          setMessage(`Сканирано: ${code}`);
          onDetected?.(code);
          return;
        }

        if (error) {
          if (error?.name === "NotFoundException") {
            setStatus("scanning");
            setMessage("Намирам код... насочи камерата към баркод или QR.");
            return;
          }

          const errorMessage = error?.message || "Неуспешно сканиране.";
          setStatus("error");
          setMessage(errorMessage);
          onError?.(error);
        }
      };

      try {
        await codeReader.decodeFromConstraints({ video: { facingMode: { exact: "environment" } } }, videoElement, callback);
      } catch (error) {
        if (!active) return;
        try {
          await codeReader.decodeFromVideoDevice(undefined, videoElement, callback);
        } catch (innerError) {
          if (!active) return;
          const fallbackMessage = innerError?.message || "Камерата не може да бъде стартирана.";
          setStatus("error");
          setMessage(fallbackMessage);
          onError?.(innerError);
        }
      }
    }

    startScanner();

    return () => {
      active = false;
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
            <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
            <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none", border: "2px dashed rgba(255,255,255,0.9)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.45)" }} />
          </Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CircularProgress size={18} sx={{ opacity: status === "error" ? 0 : 1 }} />
            <Typography variant="body2" color={status === "error" ? "error.main" : "text.secondary"}>
              {message}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Затвори
        </Button>
      </DialogActions>
    </Dialog>
  );
}
