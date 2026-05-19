import { Box, Card, CardContent, Stack, Typography } from "@mui/material";

export default function FormPanel({ title, subtitle, children, actions, icon }) {
  return (
    <Card
      sx={{
        borderRadius: 7,
        overflow: "hidden",
        position: "relative",
        "&::before": {
          content: '\"\"',
          position: "absolute",
          inset: 0,
          background: [
            "radial-gradient(circle at top right, rgba(249,115,22,0.14), transparent 30%)",
            "linear-gradient(180deg, rgba(17,153,142,0.06), transparent 26%)"
          ].join(", "),
          pointerEvents: "none"
        }
      }}
    >
      <CardContent
        sx={{
          position: "relative",
          p: { xs: 2.3, md: 3 },
          "& .MuiGrid2-root": { minWidth: 0 },
          "& .MuiFormControl-root": { minWidth: 0 }
        }}
      >
        <Stack spacing={3}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
            spacing={2}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              {icon ? (
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "rgba(249,115,22,0.12)",
                    color: "primary.main",
                    flexShrink: 0,
                    "& .MuiSvgIcon-root": { fontSize: 25 }
                  }}
                >
                  {icon}
                </Box>
              ) : null}
              <Stack spacing={0.6}>
                <Typography variant="overline" color="primary.main" fontWeight={800}>
                  Бързо действие
                </Typography>
                <Typography variant="h6">{title}</Typography>
                {subtitle ? (
                  <Typography variant="body2" color="text.secondary">
                    {subtitle}
                  </Typography>
                ) : null}
              </Stack>
            </Stack>
            {actions}
          </Stack>
          {children}
        </Stack>
      </CardContent>
    </Card>
  );
}
