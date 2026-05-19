import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import { IconButton, Stack, Tooltip } from "@mui/material";

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
            <PrintRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
      <Tooltip title={editLabel}>
        <IconButton size="small" color="primary" onClick={onEdit} sx={{ width: 34, height: 34 }}>
          <EditRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={deleteLabel}>
        <IconButton size="small" color="error" onClick={onDelete} sx={{ width: 34, height: 34 }}>
          <DeleteRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
