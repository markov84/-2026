import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
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
  const detectedRef = useRef(false);
  const nativeDetectIntervalRef = useRef(null);

  function stopNativeDetectorFallback() {
    if (nativeDetectIntervalRef.current) {
      window.clearInterval(nativeDetectIntervalRef.current);
      nativeDetectIntervalRef.current = null;
    }
  }

  function resolveDetectedCode(rawCode, onDetected) {
    const code = String(rawCode || "").trim();
    if (!code || detectedRef.current) return false;

    detectedRef.current = true;
    console.log("✅ КОД ДЕТЕКТИРАН:", code);
    updateStatus("detected", `✓ Сканирано: ${code}`);
    try {
      controlsRef.current?.stop?.();
    } catch (e) {
      // ignore
    }
    stopNativeDetectorFallback();
    onDetected?.(code);
    return true;
  }

  async function startNativeDetectorFallback(videoElement, onDetected) {
    const BarcodeDetectorCtor = globalThis?.BarcodeDetector;
    if (!BarcodeDetectorCtor || !videoElement) return;

    try {
      const wantedFormats = [
        "qr_code",
        "ean_13",
        "ean_8",
        "code_128",
        "code_39",
        "upc_a",
        "upc_e",
        "itf",
        "codabar",
        "data_matrix",
        "pdf417",
        "aztec",
      ];

      let supported = [];
      if (typeof BarcodeDetectorCtor.getSupportedFormats === "function") {
        supported = await BarcodeDetectorCtor.getSupportedFormats();
      }

      const formats = supported.length ? wantedFormats.filter((format) => supported.includes(format)) : wantedFormats;
      if (!formats.length) return;

      const detector = new BarcodeDetectorCtor({ formats });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;

      let busy = false;
      nativeDetectIntervalRef.current = window.setInterval(async () => {
        if (busy || detectedRef.current) return;
        const width = videoElement.videoWidth;
        const height = videoElement.videoHeight;
        if (!width || !height) return;

        busy = true;
        try {
          canvas.width = width;
          canvas.height = height;
          context.drawImage(videoElement, 0, 0, width, height);
          const results = await detector.detect(canvas);
          if (results?.length) {
            const value = results.find((item) => item?.rawValue)?.rawValue;
            resolveDetectedCode(value, onDetected);
          }
        } catch (error) {
          // Ignore intermittent frame decode errors.
        } finally {
          busy = false;
        }
      }, 250);
    } catch (error) {
      console.debug("ℹ️ Native BarcodeDetector fallback unavailable:", error?.message || error);
    }
  }

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

    stopNativeDetectorFallback();
  }

  useEffect(() => {
    if (!open) return undefined;

    let active = true;
    let codeReader = null;

    async function initializeScanner() {
      try {
        detectedRef.current = false;

        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.QR_CODE,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.ITF,
          BarcodeFormat.CODABAR,
          BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.PDF_417,
          BarcodeFormat.AZTEC,
        ]);

        codeReader = new BrowserMultiFormatReader(hints, 200);
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

        setInitProgress(45);

        // Подготвяме приоритетен fallback към задна камера по име/id.
        const backCamera =
          devices.find((device) => /back|rear|environment|задна/i.test(device?.label || "")) ||
          devices.find((device) => /back|rear|environment|задна/i.test(device?.deviceId || "")) ||
          devices[devices.length - 1] ||
          devices[0] ||
          null;

        if (backCamera) {
          console.log("📱 Fallback камера:", backCamera.label || "(без име)", backCamera.deviceId);
        }
        setInitProgress(65);

        // Callback за сканиране
        const onResult = (result, error) => {
          if (!active) return;

          if (result) {
            const code = result.getText();
            if (resolveDetectedCode(code, onDetected)) {
              active = false;
            }
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

        let controls = null;
        try {
          // На мобилни устройства това е най-надеждният начин за задна камера.
          controls = await codeReader.decodeFromConstraints(
            {
              video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            },
            videoElement,
            onResult
          );
          console.log("✅ Стартирано с facingMode=environment");
        } catch (facingModeError) {
          console.warn("⚠️ facingMode fallback:", facingModeError?.message || facingModeError);

          if (backCamera?.deviceId) {
            controls = await codeReader.decodeFromVideoDevice(backCamera.deviceId, videoElement, onResult);
            console.log("✅ Стартирано с deviceId fallback");
          } else {
            controls = await codeReader.decodeFromVideoDevice(undefined, videoElement, onResult);
            console.log("✅ Стартирано с default camera fallback");
          }
        }
        controlsRef.current = controls;

        // Допълнителен детектор за браузъри, където ZXing е нестабилен.
        startNativeDetectorFallback(videoElement, onDetected);

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
      stopScanner();
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
