import { Alert, CircularProgress, Stack, Typography } from "@mui/material";

export default function PageLoadingNotice({ subject = "данните" }) {
  return (
    <Alert severity="info" sx={{ alignItems: "center" }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <CircularProgress size={18} />
        <Stack spacing={0.25}>
          <Typography variant="body2" fontWeight={700}>
            Зареждам {subject} от сървъра
          </Typography>
          <Typography variant="caption" color="text.secondary">
            При първо отваряне е възможно кратко забавяне, докато услугата се подготви.
          </Typography>
        </Stack>
      </Stack>
    </Alert>
  );
}