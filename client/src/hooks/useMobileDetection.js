import { useMediaQuery, useTheme } from "@mui/material";

export function useMobileDetection() {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down("md"));
}
