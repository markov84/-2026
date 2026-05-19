import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import { Button, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import Dialog from "./DraggableDialog";

export default function ConfirmDeleteDialogStable({
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
        <Button startIcon={<CloseRoundedIcon />} onClick={onClose}>{cancelLabel}</Button>
        <Button color="error" variant="contained" startIcon={<DeleteRoundedIcon />} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
