import { useRef, useState } from "react";
import {
  Box,
  Button,
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
  Tooltip,
  Typography
} from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import { NavLink } from "react-router-dom";
import { useAuth } from "../providers/AuthProviderStable";
import { useAppThemeMode } from "../providers/AppThemeProvider";
import { useRealtimeNotifications } from "../hooks/useRealtimeNotificationsStable";
import MobileBottomNavigationBar from "./MobileBottomNavigationBar";
import MobileQuickActions from "./MobileQuickActions";
import { useMobileDetection } from "../hooks/useMobileDetection";

const drawerWidth = 300;
const iconRailHeight = 74;

const navItems = [
  { label: "Табло", path: "/", iconKey: "dashboard", color: "#4f8cff", bg: "rgba(79,140,255,0.16)" },
  { label: "Продукти", path: "/products", iconKey: "products", color: "#12b886", bg: "rgba(18,184,134,0.16)" },
  { label: "Клиенти", path: "/customers", iconKey: "customers", color: "#f76707", bg: "rgba(247,103,7,0.16)" },
  { label: "Магазини", path: "/stores", iconKey: "stores", color: "#7950f2", bg: "rgba(121,80,242,0.16)" },
  { label: "Наличности", path: "/inventory", iconKey: "inventory", color: "#0ca678", bg: "rgba(12,166,120,0.16)" },
  { label: "Продажби", path: "/orders", iconKey: "orders", color: "#e03131", bg: "rgba(224,49,49,0.16)" },
  { label: "Финанси", path: "/finance", iconKey: "finance", color: "#2f9e44", bg: "rgba(47,158,68,0.16)" },
  { label: "Фактури", path: "/invoices", iconKey: "invoices", color: "#15aabf", bg: "rgba(21,170,191,0.16)" },
  { label: "ДДС отчети", path: "/vat-reports", iconKey: "vat", color: "#9c36b5", bg: "rgba(156,54,181,0.16)" },
  { label: "Служители", path: "/employees", iconKey: "employees", color: "#5c7cfa", bg: "rgba(92,124,250,0.16)" },
  { label: "Трансфери", path: "/transfers", iconKey: "transfers", color: "#f08c00", bg: "rgba(240,140,0,0.16)" }
];

function getVisibleNavItems(user) {
  return navItems.filter((item) => item.path !== "/employees" || ["admin", "manager"].includes(user?.role));
}

function ModernModuleIcon({ type, size }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  };

  return (
    <Box component="svg" viewBox="0 0 32 32" sx={{ width: size, height: size, display: "block" }}>
      {type === "dashboard" ? (
        <>
          <rect x="6" y="7" width="8" height="8" rx="2.2" fill="currentColor" opacity="0.22" />
          <rect x="18" y="7" width="8" height="5" rx="2" fill="currentColor" opacity="0.34" />
          <rect x="6" y="19" width="8" height="6" rx="2" fill="currentColor" opacity="0.34" />
          <path {...common} d="M19 24c1.8-5.2 3.8-7.8 7-10" />
        </>
      ) : null}
      {type === "products" ? (
        <>
          <path {...common} d="M8 12l8-4 8 4-8 4-8-4z" />
          <path {...common} d="M8 17l8 4 8-4" />
          <path {...common} d="M8 22l8 4 8-4" />
        </>
      ) : null}
      {type === "customers" ? (
        <>
          <circle cx="16" cy="12" r="4" fill="currentColor" opacity="0.28" />
          <path {...common} d="M8 25c1.2-4 4-6 8-6s6.8 2 8 6" />
          <path {...common} d="M7 16c-1.8.5-3.1 2-3.8 4" opacity="0.72" />
          <path {...common} d="M25 16c1.8.5 3.1 2 3.8 4" opacity="0.72" />
        </>
      ) : null}
      {type === "stores" ? (
        <>
          <path {...common} d="M7 13h18l-2-6H9l-2 6z" />
          <path {...common} d="M8 13v12h16V13" />
          <path {...common} d="M12 25v-7h8v7" />
          <path {...common} d="M7 13c1.2 2.4 3.7 2.4 5 0 1.2 2.4 3.8 2.4 5 0 1.2 2.4 3.8 2.4 5 0 1.2 2.4 3.8 2.4 5 0" />
        </>
      ) : null}
      {type === "inventory" ? (
        <>
          <rect x="7" y="8" width="8" height="8" rx="2" fill="currentColor" opacity="0.24" />
          <rect x="17" y="8" width="8" height="8" rx="2" fill="currentColor" opacity="0.36" />
          <rect x="12" y="18" width="8" height="8" rx="2" fill="currentColor" opacity="0.30" />
          <path {...common} d="M11 12h.1M21 12h.1M16 22h.1" />
        </>
      ) : null}
      {type === "orders" ? (
        <>
          <path {...common} d="M7 8h3l2.2 11.5h10.5l2.3-8H12" />
          <circle cx="14" cy="24" r="1.8" fill="currentColor" />
          <circle cx="22" cy="24" r="1.8" fill="currentColor" />
          <path {...common} d="M17 15h5" />
        </>
      ) : null}
      {type === "finance" ? (
        <>
          <rect x="6" y="10" width="20" height="14" rx="3" fill="currentColor" opacity="0.18" />
          <path {...common} d="M7 14h18M11 20h5" />
          <path {...common} d="M21 19c1.8 0 3 1 3 2.5S22.8 24 21 24s-3-1-3-2.5S19.2 19 21 19z" />
        </>
      ) : null}
      {type === "invoices" ? (
        <>
          <path {...common} d="M10 6h10l4 4v16H10V6z" />
          <path {...common} d="M20 6v5h4M13 15h8M13 19h8M13 23h5" />
        </>
      ) : null}
      {type === "vat" ? (
        <>
          <rect x="7" y="7" width="18" height="18" rx="4" fill="currentColor" opacity="0.18" />
          <path {...common} d="M11 21L21 11" />
          <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.55" />
          <circle cx="20" cy="20" r="2" fill="currentColor" opacity="0.55" />
        </>
      ) : null}
      {type === "employees" ? (
        <>
          <rect x="9" y="6" width="14" height="20" rx="4" fill="currentColor" opacity="0.18" />
          <circle cx="16" cy="13" r="3" fill="currentColor" opacity="0.42" />
          <path {...common} d="M11 23c.9-3.2 2.6-4.8 5-4.8s4.1 1.6 5 4.8" />
        </>
      ) : null}
      {type === "transfers" ? (
        <>
          <path {...common} d="M8 11h14l3 4v7H8V11z" />
          <path {...common} d="M22 15h3M11 24a2 2 0 104 0M21 24a2 2 0 104 0" />
          <path {...common} d="M7 8h9M7 8l3-3M7 8l3 3" opacity="0.75" />
        </>
      ) : null}
    </Box>
  );
}

function ColorIcon({ item, compact = false }) {
  return (
    <Box
      component="span"
      sx={{
        width: compact ? 50 : 34,
        height: compact ? 50 : 34,
        borderRadius: compact ? 2.5 : 2,
        display: "grid",
        placeItems: "center",
        color: item.color,
        bgcolor: item.bg,
        border: compact ? "1px solid rgba(255,255,255,0.72)" : "none",
        boxShadow: compact ? "0 8px 18px rgba(35,52,59,0.08)" : "none",
        transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
        "& svg": { filter: "drop-shadow(0 1px 0 rgba(255,255,255,0.55))" }
      }}
    >
      <ModernModuleIcon type={item.iconKey} size={compact ? 30 : 23} />
    </Box>
  );
}

function Navigation({ onNavigate }) {
  const { user, logout } = useAuth();
  const visibleNavItems = getVisibleNavItems(user);
  const navItemRefs = useRef([]);

  function focusNavItem(index) {
    navItemRefs.current[index]?.focus();
  }

  function handleNavItemKeyDown(event, index) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusNavItem(index === 0 ? visibleNavItems.length - 1 : index - 1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusNavItem(index === visibleNavItems.length - 1 ? 0 : index + 1);
      return;
    }

    if (event.key === "Tab" && !event.shiftKey) {
      event.preventDefault();
      navItemRefs.current[index]?.click();
    }
  }

  return (
    <Stack
      sx={{
        height: "100%",
        width: drawerWidth,
        color: "#fff",
        background:
          "radial-gradient(circle at top left, rgba(124,154,173,0.22), transparent 28%), radial-gradient(circle at bottom right, rgba(58,84,103,0.22), transparent 24%), linear-gradient(180deg, #243340 0%, #1d2933 55%, #17212a 100%)"
      }}
    >
      <Box sx={{ px: 2, pt: 2, pb: 1.5, flexShrink: 0 }}>
        <Stack spacing={2} width="100%">
          <Stack spacing={1} alignItems="flex-start">
            <Box
              component="img"
              src="/MARKLIGHT.png"
              alt="MARKLIGHT Lighting Trade"
              sx={{
                width: 136,
                maxWidth: "100%",
                height: 44,
                display: "block",
                objectFit: "contain",
                objectPosition: "left center",
                borderRadius: 0
              }}
            />
            <Typography variant="body2" color="rgba(255,255,255,0.68)" sx={{ lineHeight: 1.35 }}>
              Управление на търговска мрежа на MARK LIGHT LTD
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

      <List sx={{ p: 2, flexGrow: 1, overflowY: "auto" }}>
        {visibleNavItems.map((item, index) => (
          <ListItemButton
            key={item.path}
            ref={(element) => {
              navItemRefs.current[index] = element;
            }}
            component={NavLink}
            to={item.path}
            onClick={onNavigate}
            onKeyDown={(event) => handleNavItemKeyDown(event, index)}
            sx={{
              mb: 1,
              px: 1.5,
              py: 1.1,
              minHeight: 52,
              borderRadius: 3,
              color: "#e8edf3",
              alignItems: "center",
              "&.active": {
                bgcolor: "rgba(156,180,195,0.22)",
                color: "#fff"
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 42, justifyContent: "center" }}>
              <ColorIcon item={item} />
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                noWrap: true,
                fontWeight: 700,
                lineHeight: 1.2
              }}
            />
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ display: "none" }}>
        <Stack spacing={1.5} sx={{ p: 2, borderRadius: 4, bgcolor: "rgba(255,255,255,0.08)" }}>
          <Typography variant="subtitle2" noWrap>
            {user?.fullName || "Потребител"}
          </Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.68)">
            {user?.role || "Профил"}
          </Typography>
          <ListItemButton onClick={logout} sx={{ px: 0, color: "#fff", borderRadius: 2 }}>
            <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
              <LogoutRoundedIcon />
            </ListItemIcon>
            <ListItemText primary="Изход" />
          </ListItemButton>
        </Stack>
      </Box>
    </Stack>
  );
}

function IconRail() {
  const { user, logout } = useAuth();
  const visibleNavItems = getVisibleNavItems(user);
  const railItemRefs = useRef([]);

  function focusRailItem(index) {
    railItemRefs.current[index]?.focus();
  }

  function handleRailItemKeyDown(event, index) {
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      focusRailItem(index === 0 ? visibleNavItems.length - 1 : index - 1);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      focusRailItem(index === visibleNavItems.length - 1 ? 0 : index + 1);
      return;
    }

    if (event.key === "Tab" && !event.shiftKey) {
      event.preventDefault();
      railItemRefs.current[index]?.click();
    }
  }

  return (
    <Stack
      component="nav"
      aria-label="Бърза навигация"
      direction="row"
      sx={(theme) => ({
        minHeight: iconRailHeight,
        alignItems: "center",
        px: { xs: 1.5, md: 3 },
        py: 1,
        gap: 1,
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(180deg, rgba(24,35,48,0.98) 0%, rgba(16,24,33,0.96) 100%)"
            : "linear-gradient(180deg, #fbfcfd 0%, #eef3f7 100%)",
        borderBottom:
          theme.palette.mode === "dark"
            ? "1px solid rgba(197,215,226,0.12)"
            : "1px solid rgba(35,52,59,0.10)",
        overflowX: "auto",
        overflowY: "hidden"
      })}
    >
      <Box
        component="img"
        src="/MARKLIGHT.png"
        alt="MARKLIGHT"
        sx={{
          width: 48,
          height: 48,
          objectFit: "contain",
          borderRadius: 2,
          bgcolor: "#fff",
          p: 0.5,
          mr: 0.5,
          flex: "0 0 auto",
          boxShadow: "0 8px 22px rgba(35,52,59,0.10)"
        }}
      />

      <Stack direction="row" spacing={0.8} alignItems="center" sx={{ flexGrow: 1, minWidth: 0 }}>
        {visibleNavItems.map((item, index) => (
          <Tooltip key={item.path} title={item.label} placement="bottom" arrow>
            <IconButton
              ref={(element) => {
                railItemRefs.current[index] = element;
              }}
              component={NavLink}
              to={item.path}
              aria-label={item.label}
              onKeyDown={(event) => handleRailItemKeyDown(event, index)}
              sx={{
                p: 0,
                borderRadius: 2.5,
                transition: "transform 160ms ease, box-shadow 160ms ease",
                "&:hover": {
                  transform: "translateY(-1px)"
                },
                "&.active > span": {
                  color: item.color,
                  bgcolor: item.bg,
                  borderColor: item.color,
                  boxShadow: `0 0 0 3px #fff, 0 0 0 6px ${item.bg}, 0 12px 26px rgba(35,52,59,0.16)`,
                  transform: "translateY(-1px) scale(1.05)"
                },
                "&.active svg": {
                  color: item.color
                }
              }}
            >
              <ColorIcon item={item} compact />
            </IconButton>
          </Tooltip>
        ))}
      </Stack>

      <Tooltip title="Изход" placement="bottom" arrow>
        <IconButton
          aria-label="Изход"
          onClick={logout}
          sx={{
            width: 50,
            height: 50,
            borderRadius: 2.5,
            flex: "0 0 auto",
            color: "#d9480f",
            bgcolor: "rgba(217,72,15,0.14)",
            border: "1px solid rgba(255,255,255,0.72)"
          }}
        >
          <LogoutRoundedIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

export default function CommandCenterShellClean({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMobileDetection();
  const { logout } = useAuth();
  const { mode, toggleMode } = useAppThemeMode();
  const isDarkMode = mode === "dark";
  useRealtimeNotifications(true);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: "block", lg: "none" }, "& .MuiDrawer-paper": { width: drawerWidth, border: "none" } }}
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
          borderRight: "1px solid rgba(35,52,59,0.08)"
        }}
      >
        <Box sx={{ position: "sticky", top: 0, height: "100vh" }}>
          <Navigation />
        </Box>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, width: { lg: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar
          sx={(theme) => ({
            px: { xs: 2, md: 4 },
            py: 1,
            justifyContent: "space-between",
            borderBottom:
              theme.palette.mode === "dark"
                ? "1px solid rgba(197,215,226,0.12)"
                : "1px solid rgba(35,52,59,0.08)",
            background:
              theme.palette.mode === "dark"
                ? "linear-gradient(180deg, rgba(24,35,48,0.96), rgba(16,24,33,0.92))"
                : "linear-gradient(180deg, rgba(250,251,252,0.96), rgba(241,245,248,0.92))",
            backdropFilter: "blur(12px)"
          })}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconButton sx={{ display: { lg: "none" } }} onClick={() => setMobileOpen(true)}>
              <MenuRoundedIcon />
            </IconButton>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Централизирано управление на MARK LIGHT LTD
              </Typography>
              <Typography variant="subtitle1" fontWeight={700}>
                 Търговска платформа на MARK LIGHT LTD
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label="Готово за мобилно приложение" color="secondary" variant="outlined" sx={{ bgcolor: "rgba(111,133,149,0.10)", display: { xs: "none", sm: "inline-flex" } }} />
            <Tooltip title={isDarkMode ? "Светла тема" : "Тъмна тема"} arrow>
              <IconButton
                aria-label={isDarkMode ? "Включи светла тема" : "Включи тъмна тема"}
                onClick={toggleMode}
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper"
                }}
              >
                {isDarkMode ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
              </IconButton>
            </Tooltip>
            <Button variant="outlined" color="inherit" startIcon={<LogoutRoundedIcon />} onClick={logout} sx={{ whiteSpace: "nowrap" }}>
              Изход
            </Button>
          </Stack>
        </Toolbar>

        <Box sx={{ display: { xs: "none", lg: "block" } }}>
          <IconRail />
        </Box>

        <Box sx={{ px: { xs: 2, md: 4 }, py: 3, pb: { xs: 14, md: 4 }, maxWidth: 1440, mx: "auto", width: "100%" }}>
          {children}
        </Box>
      </Box>

      {isMobile ? <MobileQuickActions /> : null}
      {isMobile ? <MobileBottomNavigationBar /> : null}
    </Box>
  );
}
