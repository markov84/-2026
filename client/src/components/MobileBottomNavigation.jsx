import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import AppGlyph from "./AppGlyph";

const items = [
  { label: "Табло", value: "/", icon: <AppGlyph name="dashboard" size={20} /> },
  { label: "Продукти", value: "/products", icon: <AppGlyph name="products" size={20} /> },
  { label: "Клиенти", value: "/customers", icon: <AppGlyph name="customers" size={20} /> },
  { label: "Продажби", value: "/orders", icon: <AppGlyph name="orders" size={20} /> },
  { label: "Финанси", value: "/finance", icon: <AppGlyph name="finance" size={20} /> }
];

export default function MobileBottomNavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const current = items.find((item) => location.pathname === item.value)?.value || "/";

  return (
    <Paper
      elevation={12}
      sx={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: (theme) => theme.zIndex.drawer - 1,
        borderRadius: 4,
        display: { xs: "block", xl: "none" },
        overflow: "hidden",
        border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(40,53,64,0.08)",
        backgroundColor: isDark ? alpha("#05070a", 0.96) : "rgba(255,252,246,0.92)",
        backdropFilter: "blur(14px)"
      }}
    >
      <BottomNavigation value={current} onChange={(_, value) => navigate(value)} showLabels>
        {items.map((item) => (
          <BottomNavigationAction key={item.value} label={item.label} value={item.value} icon={item.icon} />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
