import { Button, DialogActions } from "@mui/material";
import AppGlyph from "./AppGlyph";

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
      <Button fullWidth={isMobile} startIcon={<AppGlyph name="close" size={18} />} onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button fullWidth={isMobile} variant="contained" color={confirmColor} startIcon={<AppGlyph name="save" size={18} />} onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </DialogActions>
  );
}
