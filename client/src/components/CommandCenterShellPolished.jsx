import { useState } from "react";
import {
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography
} from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import StoreMallDirectoryRoundedIcon from "@mui/icons-material/StoreMallDirectoryRounded";
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import CircleRoundedIcon from "@mui/icons-material/CircleRounded";
import { NavLink } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { useRealtimeNotifications } from "../hooks/useRealtimeNotifications";
import MobileBottomNavigationBar from "./MobileBottomNavigation";
import MobileQuickActions from "./MobileQuickActions";
import { useMobileDetection } from "../hooks/useMobileDetection";

const drawerWidth = 248;

const navItems = [
  { label: "Табло", path: "/", icon: <DashboardRoundedIcon /> },
  { label: "Продукти", path: "/products", icon: <Inventory2RoundedIcon /> },
  { label: "Клиенти", path: "/customers", icon: <PeopleAltRoundedIcon /> },
  { label: "Магазини", path: "/stores", icon: <StoreMallDirectoryRoundedIcon /> },
  { label: "Наличности", path: "/inventory", icon: <WarehouseRoundedIcon /> },
  { label: "Продажби", path: "/orders", icon: <ReceiptLongRoundedIcon /> },
  { label: "Финанси", path: "/finance", icon: <AccountBalanceWalletRoundedIcon /> },
  { label: "Фактури", path: "/invoices", icon: <DescriptionRoundedIcon /> },
  { label: "ДДС отчети", path: "/vat-reports", icon: <AssessmentRoundedIcon /> },
  { label: "Служители", path: "/employees", icon: <BadgeRoundedIcon /> },
  { label: "Трансфери", path: "/transfers", icon: <CompareArrowsRoundedIcon /> }
];

function Navigation({ onNavigate }) {
  const { user, logout } = useAuth();

  return (
    <Stack
      sx={{
        height: "100%",
        color: "#ecf2f4",
        background: "linear-gradient(180deg, #182329 0%, #11191e 100%)"
      }}
    >
      <Toolbar sx={{ px: 1.5, py: 1.5, alignItems: "flex-start" }}>
        <Stack spacing={2} width="100%">
          <Stack spacing={0.85} alignItems="flex-start">
            <Box
              component="img"
              src="/MARKLIGHT.png"
              alt="MARKLIGHT Lighting Trade"
              sx={{
                width: 142,
                maxWidth: "100%",
                height: 56,
                display: "block",
                objectFit: "contain",
                objectPosition: "left center",
                borderRadius: 2,
                bgcolor: "#fff",
                p: 0.45
              }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" color="rgba(236,242,244,0.68)">
                Търговска мрежа
              </Typography>
              <Typography variant="caption" color="rgba(236,242,244,0.8)" sx={{ fontWeight: 700, letterSpacing: 0.3, display: "block" }}>
                MARKLIGHT{"\u00AE"}
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              px: 1.5,
              py: 1.1,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)"
            }}
          >
            <Typography variant="caption" color="rgba(236,242,244,0.72)">
              Всички магазини онлайн
            </Typography>
            <Chip
              icon={<CircleRoundedIcon sx={{ fontSize: 10 }} />}
              label="На живо"
              size="small"
              sx={{ bgcolor: "rgba(80, 191, 117, 0.14)", color: "#d9ffe5" }}
            />
          </Stack>
        </Stack>
      </Toolbar>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

      <List sx={{ px: 1.5, py: 2, pb: 10, flexGrow: 1, overflowY: "auto" }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            onClick={onNavigate}
            sx={{
              borderRadius: 3,
              mb: 0.75,
              px: 1.5,
              py: 1.1,
              color: "#d9e3e8",
              "& .MuiListItemText-primary": {
                fontWeight: 600
              },
              "&.active": {
                bgcolor: "rgba(210,176,122,0.15)",
                color: "#fff"
              },
              "&.active .MuiListItemIcon-root": {
                color: "#d3b07a"
              }
            }}
          >
            <ListItemIcon sx={{ color: "inherit", minWidth: 38 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ p: 1.5 }}>
        <Stack
          spacing={1}
          sx={{
            p: 1.5,
            borderRadius: 3,
            bgcolor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)"
          }}
        >
          <Typography variant="subtitle2" noWrap>
            {user?.fullName || "Потребител"}
          </Typography>
          <Typography variant="body2" color="rgba(236,242,244,0.65)">
            {user?.role || "Профил"}
          </Typography>
          <ListItemButton onClick={logout} sx={{ px: 0.5, py: 0.5, color: "#fff", borderRadius: 2 }}>
            <ListItemIcon sx={{ color: "inherit", minWidth: 34 }}>
              <LogoutRoundedIcon />
            </ListItemIcon>
            <ListItemText primary="Изход" />
          </ListItemButton>
        </Stack>
      </Box>
    </Stack>
  );
}

export default function CommandCenterShellPolished({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMobileDetection();

  useRealtimeNotifications(true);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": { width: drawerWidth, border: "none", bgcolor: "transparent", height: "100%" }
        }}
      >
        <Navigation onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      <Box
        component="aside"
        sx={{
          display: { xs: "none", lg: "block" },
          width: drawerWidth,
          flexShrink: 0,
          minHeight: "100vh",
          borderRight: "1px solid rgba(31,42,51,0.08)"
        }}
      >
        <Box
          sx={{
            position: "sticky",
            top: 0,
            height: "100vh"
          }}
        >
          <Navigation />
        </Box>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, width: { lg: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar
          sx={{
            minHeight: 68,
            px: { xs: 2, md: 3 },
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(31,42,51,0.08)",
            backgroundColor: "rgba(253,252,248,0.88)",
            backdropFilter: "blur(10px)"
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <IconButton sx={{ display: { lg: "none" } }} onClick={() => setMobileOpen(true)}>
              <MenuRoundedIcon />
            </IconButton>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Оперативен център
              </Typography>
              <Typography variant="subtitle1" fontWeight={700}>
                MARK LIGHT LTD
              </Typography>
            </Box>
          </Stack>
          <Chip label="Система активна" color="secondary" variant="outlined" />
        </Toolbar>

        <Box
          sx={{
            px: { xs: 1.5, md: 3 },
            py: { xs: 2, md: 3 },
            pb: { xs: 12, md: 3 },
            width: "100%",
            maxWidth: 1320,
            mx: "auto"
          }}
        >
          {children}
        </Box>
      </Box>

      {isMobile ? <MobileQuickActions /> : null}
      {isMobile ? <MobileBottomNavigationBar /> : null}
    </Box>
  );
}

