import { Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

export default function PageHeader({ eyebrow, title, subtitle, icon }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Stack
      spacing={1.2}
      sx={{
        mb: 3,
        maxWidth: "100%",
        px: { xs: 2, md: 3 },
        py: { xs: 2.2, md: 2.8 },
        borderRadius: 3,
        background: isDark
          ? [
              "linear-gradient(180deg, rgba(24,35,48,0.96), rgba(17,26,36,0.94))",
              `radial-gradient(circle at top right, ${alpha(theme.palette.primary.main, 0.22)}, transparent 30%)`,
              `radial-gradient(circle at bottom left, ${alpha(theme.palette.info.main, 0.16)}, transparent 32%)`
            ].join(", ")
          : [
              "linear-gradient(180deg, rgba(255,255,255,0.90), rgba(247,252,252,0.94))",
              "radial-gradient(circle at top right, rgba(249,115,22,0.14), transparent 28%)",
              "radial-gradient(circle at bottom left, rgba(17,153,142,0.10), transparent 30%)"
            ].join(", "),
        border: isDark ? "1px solid rgba(197,215,226,0.14)" : "1px solid rgba(255,255,255,0.82)",
        boxShadow: isDark ? "0 18px 44px rgba(0, 0, 0, 0.28)" : "0 16px 40px rgba(15, 40, 54, 0.07)",
        backdropFilter: "blur(16px)"
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        {icon ? (
          <Box
            sx={{
              width: { xs: 46, md: 54 },
              height: { xs: 46, md: 54 },
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              bgcolor: isDark ? alpha(theme.palette.primary.main, 0.16) : "rgba(39,86,107,0.10)",
              color: isDark ? theme.palette.primary.light : theme.palette.primary.main,
              flexShrink: 0,
              "& .MuiSvgIcon-root": { fontSize: { xs: 28, md: 32 } }
            }}
          >
            {icon}
          </Box>
        ) : null}
        <Stack spacing={1.2} sx={{ minWidth: 0 }}>
          <Typography variant="overline" color="primary.main" fontWeight={800} sx={{ letterSpacing: "0.18em" }}>
            {eyebrow}
          </Typography>
          <Typography variant="h4" color="text.primary" sx={{ lineHeight: 1.04, fontSize: { xs: "2rem", md: "2.55rem" } }}>
            {title}
          </Typography>
        </Stack>
      </Stack>
      {subtitle ? (
        <Typography variant="body1" color="text.secondary" maxWidth={820} sx={{ textWrap: "balance" }}>
          {subtitle}
        </Typography>
      ) : null}
    </Stack>
  );
}
