import { useEffect, useState } from "react";
import { DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import Dialog from "./DraggableDialog";
import DialogFooterActions from "./DialogFooterActions";

export default function DocumentEmailDialog({
  open,
  onClose,
  onSend,
  defaultTo = "",
  defaultSubject = "",
  documentLabel = "документ",
  sending = false,
  fullScreen = false
}) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setTo(defaultTo || "");
    setSubject(defaultSubject || "");
    setMessage("");
  }, [open, defaultTo, defaultSubject]);

  function handleSend() {
    onSend({ to: to.trim(), subject: subject.trim(), message: message.trim() });
  }

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle>Изпращане по имейл</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Изпрати {documentLabel} по имейл до клиент, доставчик или вътрешен екип.
          </Typography>
          <TextField
            label="Получател (имейл)"
            placeholder="office@example.com"
            type="email"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            required
            autoFocus
          />
          <TextField label="Тема" value={subject} onChange={(event) => setSubject(event.target.value)} required />
          <TextField
            label="Съобщение (по желание)"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            multiline
            minRows={4}
            placeholder="Здравейте, изпращаме Ви документа..."
          />
        </Stack>
      </DialogContent>
      <DialogFooterActions
        isMobile={fullScreen}
        cancelLabel="Отказ"
        confirmLabel={sending ? "Изпращане..." : "Изпрати"}
        onCancel={onClose}
        onConfirm={handleSend}
        confirmDisabled={sending || !to.trim() || !subject.trim()}
      />
    </Dialog>
  );
}
