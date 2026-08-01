import { Button, IconButton, Stack, Tooltip } from "@mui/material";
import AppGlyph from "./AppGlyph";

export default function GridRowActions({
  onEdit,
  onDelete,
  onPrint,
  onEmail,
  editLabel = "Редактирай",
  deleteLabel = "Изтрий",
  printLabel = "Печат",
  emailLabel = "Изпрати по имейл"
}) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ width: "100%", flexShrink: 0 }}>
      {onEmail ? (
        <Tooltip title={emailLabel}>
          <IconButton size="small" color="info" onClick={onEmail} sx={{ width: 34, height: 34 }}>
            <AppGlyph name="email" size={18} />
          </IconButton>
        </Tooltip>
      ) : null}
      {onPrint ? (
        <Tooltip title={printLabel}>
          <Button
            size="small"
            color="secondary"
            variant="outlined"
            onClick={onPrint}
            startIcon={<AppGlyph name="print" size={16} />}
            sx={{ minWidth: "auto", px: 1, py: 0.35, fontSize: "0.75rem", textTransform: "none", whiteSpace: "nowrap" }}
          >
            {printLabel}
          </Button>
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
