import { Button, DialogActions } from "@mui/material";
import AppGlyph from "./AppGlyph";

export default function DialogFooterActions({
  isMobile = false,
  onCancel,
  onConfirm,
  cancelLabel = "Отказ",
  confirmLabel = "Запази",
  confirmColor = "primary",
  cancelDisabled = false,
  confirmDisabled = false
}) {
  return (
    <DialogActions sx={{ flexDirection: { xs: "column", sm: "row" }, p: 2, gap: 1 }}>
      <Button fullWidth={isMobile} startIcon={<AppGlyph name="close" size={18} />} onClick={onCancel} disabled={cancelDisabled}>
        {cancelLabel}
      </Button>
      <Button fullWidth={isMobile} variant="contained" color={confirmColor} startIcon={<AppGlyph name="save" size={18} />} onClick={onConfirm} disabled={confirmDisabled}>
        {confirmLabel}
      </Button>
    </DialogActions>
  );
}
