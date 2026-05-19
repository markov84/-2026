import { Box, Stack, Typography } from "@mui/material";

export default function PageHeader({ eyebrow, title, subtitle, icon }) {
  return (
    <Stack
      spacing={1.2}
      sx={{
        mb: 3,
        maxWidth: "100%",
        px: { xs: 2, md: 3 },
        py: { xs: 2.2, md: 2.8 },
        borderRadius: 3,
        background: [
          "linear-gradient(180deg, rgba(255,255,255,0.90), rgba(247,252,252,0.94))",
          "radial-gradient(circle at top right, rgba(249,115,22,0.14), transparent 28%)",
          "radial-gradient(circle at bottom left, rgba(17,153,142,0.10), transparent 30%)"
        ].join(", "),
        border: "1px solid rgba(255,255,255,0.82)",
        boxShadow: "0 16px 40px rgba(15, 40, 54, 0.07)",
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
              bgcolor: "rgba(39,86,107,0.10)",
              color: "primary.main",
              flexShrink: 0,
              "& .MuiSvgIcon-root": { fontSize: { xs: 28, md: 32 } }
            }}
          >
            {icon}
          </Box>
        ) : null}
        <Stack spacing={1.2} sx={{ minWidth: 0 }}>
          <Typography variant="overline" color="primary.main" fontWeight={800}>
            {eyebrow}
          </Typography>
          <Typography variant="h4" sx={{ lineHeight: 1.04, fontSize: { xs: "2rem", md: "2.55rem" } }}>
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
