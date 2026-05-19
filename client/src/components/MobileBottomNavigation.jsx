import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import { useLocation, useNavigate } from "react-router-dom";

const items = [
  { label: "Табло", value: "/", icon: <DashboardRoundedIcon /> },
  { label: "Продукти", value: "/products", icon: <Inventory2RoundedIcon /> },
  { label: "Клиенти", value: "/customers", icon: <PeopleAltRoundedIcon /> },
  { label: "Продажби", value: "/orders", icon: <ReceiptLongRoundedIcon /> },
  { label: "Финанси", value: "/finance", icon: <AccountBalanceWalletRoundedIcon /> }
];

export default function MobileBottomNavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const current = items.find((item) => location.pathname === item.value)?.value || "/";

  return (
    <Paper
      elevation={12}
      sx={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 1300,
        borderRadius: 4,
        display: { xs: "block", xl: "none" },
        overflow: "hidden",
        border: "1px solid rgba(40,53,64,0.08)",
        backgroundColor: "rgba(255,252,246,0.92)",
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
