import { Button, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import Dialog from "./DraggableDialog";
import AppGlyph from "./AppGlyph";

export default function ConfirmDeleteDialog({
  open,
  title = "Потвърди изтриване",
  description = "Това действие не може да бъде върнато.",
  confirmLabel = "Изтрий",
  cancelLabel = "Отказ",
  onClose,
  onConfirm
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button startIcon={<AppGlyph name="close" size={18} />} onClick={onClose}>{cancelLabel}</Button>
        <Button color="error" variant="contained" startIcon={<AppGlyph name="delete" size={18} />} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
