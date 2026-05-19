import { Card, CardActionArea, CardContent, Chip, Stack, Typography } from "@mui/material";

const accentMap = {
  primary: "#315c73",
  secondary: "#718697",
  success: "#3d7a62",
  warning: "#9b7b4f",
  danger: "#c62828"
};

export default function StatCard({ label, value, trend, accent = "primary", onClick, icon }) {
  return (
    <Card
      sx={{
        height: "100%",
        borderRadius: 5,
        background: `linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,248,250,0.96)), radial-gradient(circle at top right, ${accentMap[accent]}18, transparent 38%)`
      }}
    >
      <CardActionArea
        onClick={onClick}
        disabled={!onClick}
        sx={{
          height: "100%",
          alignItems: "stretch",
          borderRadius: 5,
          cursor: onClick ? "pointer" : "default",
          transition: "transform 0.18s ease, box-shadow 0.18s ease",
          "&:hover": onClick
            ? {
                transform: "translateY(-2px)",
                boxShadow: `0 16px 34px ${accentMap[accent]}18`
              }
            : undefined
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 2.25 }, width: "100%" }}>
          <Stack direction="row" justifyContent="space-between" spacing={2} mb={1.5} alignItems="flex-start">
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              {icon ? (
                <Stack
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 2,
                    bgcolor: `${accentMap[accent]}14`,
                    color: accentMap[accent],
                    flexShrink: 0,
                    "& .MuiSvgIcon-root": { fontSize: 21 }
                  }}
                >
                  {icon}
                </Stack>
              ) : null}
              <Typography color="text.secondary" variant="body2">
                {label}
              </Typography>
            </Stack>
            {trend ? <Chip label={trend} size="small" sx={{ bgcolor: `${accentMap[accent]}14`, color: accentMap[accent] }} /> : null}
          </Stack>
          <Typography variant="h5" fontWeight={800}>
            {value}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
