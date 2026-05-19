import { Box } from "@mui/material";

export function FormGrid({ children, min = 260, gap = 2 }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`,
        gap,
        alignItems: "start",
        width: "100%",
        "& > *": {
          minWidth: 0
        }
      }}
    >
      {children}
    </Box>
  );
}

export function FormGridFull({ children }) {
  return <Box sx={{ gridColumn: "1 / -1", minWidth: 0 }}>{children}</Box>;
}
