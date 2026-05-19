import AddRoundedIcon from "@mui/icons-material/AddRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import { SpeedDial, SpeedDialAction } from "@mui/material";
import { useNavigate } from "react-router-dom";

const actions = [
  { icon: <Inventory2RoundedIcon />, name: "Продукти", path: "/products" },
  { icon: <PersonAddRoundedIcon />, name: "Клиенти", path: "/customers" },
  { icon: <ReceiptLongRoundedIcon />, name: "Нова продажба", path: "/orders" }
];

export default function MobileQuickActions() {
  const navigate = useNavigate();

  return (
    <SpeedDial
      ariaLabel="бързи действия"
      icon={<AddRoundedIcon />}
      sx={{
        position: "fixed",
        bottom: 92,
        right: 18,
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
