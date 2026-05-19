import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Button, DialogActions } from "@mui/material";

export default function DialogFooterActions({
  isMobile = false,
  onCancel,
  onConfirm,
  cancelLabel = "Отказ",
  confirmLabel = "Запази",
  confirmColor = "primary"
}) {
  return (
    <DialogActions sx={{ flexDirection: { xs: "column", sm: "row" }, p: 2, gap: 1 }}>
      <Button fullWidth={isMobile} startIcon={<CloseRoundedIcon />} onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button fullWidth={isMobile} variant="contained" color={confirmColor} startIcon={<SaveRoundedIcon />} onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </DialogActions>
  );
}
