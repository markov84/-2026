import { Card, CardActionArea, CardContent, Chip, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const accentMap = {
  primary: "#315c73",
  secondary: "#718697",
  success: "#3d7a62",
  warning: "#9b7b4f",
  danger: "#c62828"
};

const accentSurfaceMap = {
  primary: "linear-gradient(145deg, rgba(49,92,115,0.20), rgba(49,92,115,0.06) 56%, rgba(255,255,255,0.0))",
  secondary: "linear-gradient(145deg, rgba(113,134,151,0.22), rgba(113,134,151,0.07) 56%, rgba(255,255,255,0.0))",
  success: "linear-gradient(145deg, rgba(61,122,98,0.22), rgba(61,122,98,0.07) 56%, rgba(255,255,255,0.0))",
  warning: "linear-gradient(145deg, rgba(155,123,79,0.22), rgba(155,123,79,0.07) 56%, rgba(255,255,255,0.0))",
  danger: "linear-gradient(145deg, rgba(198,40,40,0.20), rgba(198,40,40,0.07) 56%, rgba(255,255,255,0.0))"
};

export default function StatCard({ label, value, trend, accent = "primary", onClick, icon }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accentColor = accentMap[accent] || accentMap.primary;
  const surface = accentSurfaceMap[accent] || accentSurfaceMap.primary;

  return (
    <Card
      sx={{
        position: "relative",
        height: "100%",
        borderRadius: 5,
        overflow: "hidden",
        border: `1px solid ${isDark ? `${accentColor}44` : `${accentColor}26`}`,
        background: isDark
          ? `linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03)), radial-gradient(circle at top right, ${accentColor}66, transparent 44%), ${surface}`
          : `linear-gradient(180deg, rgba(255,255,255,0.99), rgba(244,247,250,0.96)), radial-gradient(circle at top right, ${accentColor}52, transparent 44%), ${surface}`,
        boxShadow: isDark ? `0 18px 34px ${accentColor}1f` : `0 18px 34px ${accentColor}1a`
      }}
    >
      <Stack
        sx={{
          position: "absolute",
          inset: "0 0 auto 0",
          height: 5,
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)`
        }}
      />
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
                transform: "translateY(-3px)",
                boxShadow: `0 20px 40px ${accentColor}2e`
              }
            : undefined
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 2.25 }, pt: { xs: 2.5, md: 2.75 }, width: "100%" }}>
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
                    bgcolor: `${accentColor}1f`,
                    color: accentColor,
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
            {trend ? <Chip label={trend} size="small" sx={{ bgcolor: `${accentColor}1f`, color: accentColor, fontWeight: 700 }} /> : null}
          </Stack>
          <Typography variant="h5" fontWeight={800}>
            {value}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
