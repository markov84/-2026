import { SpeedDial, SpeedDialAction } from "@mui/material";
import { useNavigate } from "react-router-dom";
import AppGlyph from "./AppGlyph";

const actions = [
  { icon: <AppGlyph name="products" size={20} />, name: "Продукти", path: "/products" },
  { icon: <AppGlyph name="person-add" size={20} />, name: "Клиенти", path: "/customers" },
  { icon: <AppGlyph name="receipt" size={20} />, name: "Нова продажба", path: "/orders" }
];

export default function MobileQuickActions() {
  const navigate = useNavigate();

  return (
    <SpeedDial
      ariaLabel="бързи действия"
      icon={<AppGlyph name="add" size={22} />}
      sx={{
        position: "fixed",
        bottom: 92,
        right: 18,
        zIndex: (theme) => theme.zIndex.drawer - 1,
        display: { xs: "flex", xl: "none" },
        "& .MuiSpeedDialAction-staticTooltipLabel": { fontWeight: 700 }
      }}
    >
      {actions.map((action) => (
        <SpeedDialAction key={action.name} icon={action.icon} tooltipTitle={action.name} onClick={() => navigate(action.path)} />
      ))}
    </SpeedDial>
  );
}
