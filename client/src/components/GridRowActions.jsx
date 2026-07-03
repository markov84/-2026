import { IconButton, Stack, Tooltip } from "@mui/material";
import AppGlyph from "./AppGlyph";

export default function GridRowActions({
  onEdit,
  onDelete,
  onPrint,
  editLabel = "Редактирай",
  deleteLabel = "Изтрий",
  printLabel = "Печат"
}) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ width: "100%", flexShrink: 0 }}>
      {onPrint ? (
        <Tooltip title={printLabel}>
          <IconButton size="small" color="secondary" onClick={onPrint} sx={{ width: 34, height: 34 }}>
            <AppGlyph name="print" size={18} />
          </IconButton>
        </Tooltip>
      ) : null}
      <Tooltip title={editLabel}>
        <IconButton size="small" color="primary" onClick={onEdit} sx={{ width: 34, height: 34 }}>
          <AppGlyph name="edit" size={18} />
        </IconButton>
      </Tooltip>
      {onDelete ? (
        <Tooltip title={deleteLabel}>
          <IconButton size="small" color="error" onClick={onDelete} sx={{ width: 34, height: 34 }}>
            <AppGlyph name="delete" size={18} />
          </IconButton>
        </Tooltip>
      ) : null}
    </Stack>
  );
}
