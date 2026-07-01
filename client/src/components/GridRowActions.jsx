import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import { IconButton, Stack, Tooltip } from "@mui/material";

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
      {onPrint ? (
        <Tooltip title={printLabel}>
          <IconButton size="small" color="secondary" onClick={onPrint} sx={{ width: 34, height: 34 }}>
            <PrintRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
      {onEmail ? (
        <Tooltip title={emailLabel}>
          <IconButton size="small" color="info" onClick={onEmail} sx={{ width: 34, height: 34 }}>
            <EmailRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
      <Tooltip title={editLabel}>
        <IconButton size="small" color="primary" onClick={onEdit} sx={{ width: 34, height: 34 }}>
          <EditRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {onDelete ? (
        <Tooltip title={deleteLabel}>
          <IconButton size="small" color="error" onClick={onDelete} sx={{ width: 34, height: 34 }}>
            <DeleteRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
    </Stack>
  );
}
