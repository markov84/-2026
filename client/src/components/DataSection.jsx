import { Box, Card, CardContent, Stack, Typography } from "@mui/material";

export default function DataSection({ title, subtitle, actions, children, toolbar, icon }) {
  return (
    <Card
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        position: "relative",
        "&::before": {
          content: '\"\"',
          position: "absolute",
          inset: 0,
          background: [
            "linear-gradient(180deg, rgba(60,98,123,0.06), transparent 22%)",
            "radial-gradient(circle at top right, rgba(142,171,188,0.14), transparent 22%)"
          ].join(", "),
          pointerEvents: "none"
        }
      }}
    >
      <CardContent
        sx={{
          position: "relative",
          p: { xs: 2, md: 2.5 },
          "& .MuiGrid2-root": { minWidth: 0 },
          "& .MuiFormControl-root": { minWidth: 0 }
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          spacing={2}
          mb={3}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
            {icon ? (
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "rgba(39,86,107,0.09)",
                  color: "primary.main",
                  flexShrink: 0,
                  "& .MuiSvgIcon-root": { fontSize: 25 }
                }}
              >
                {icon}
              </Box>
            ) : null}
            <Stack spacing={0.65} sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="primary.main" fontWeight={800}>
                Оперативни данни
              </Typography>
              <Typography variant="h6">{title}</Typography>
              {subtitle ? (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              ) : null}
            </Stack>
          </Stack>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{
              width: { xs: "100%", md: "auto" },
              "& > *": { width: { xs: "100%", sm: "auto" } }
            }}
          >
            {actions}
          </Stack>
        </Stack>
        {toolbar ? <Stack spacing={1.5} mb={3}>{toolbar}</Stack> : null}
        {children}
      </CardContent>
    </Card>
  );
}
