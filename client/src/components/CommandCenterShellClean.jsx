 import { useRef, useState, useEffect } from "react";
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
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProviderStable";
import { useAppThemeMode } from "../providers/AppThemeProvider";
import { useRealtimeNotifications } from "../hooks/useRealtimeNotificationsStable";
import MobileBottomNavigationBar from "./MobileBottomNavigation";
import MobileQuickActions from "./MobileQuickActions";
import { useMobileDetection } from "../hooks/useMobileDetection";
import ScanAndActionDialog from "./ScanAndActionDialog";
import { useFetch } from "../hooks/useFetch";
import api from "../lib/api";
import AppGlyph from "./AppGlyph";

const drawerWidth = 240;
const iconRailHeight = 64;

const navItems = [
  { label: "Табло", path: "/", iconKey: "dashboard", color: "#4f8cff", bg: "rgba(79,140,255,0.16)" },
  { label: "Продукти", path: "/products", iconKey: "products", color: "#12b886", bg: "rgba(18,184,134,0.16)" },
  { label: "Клиенти", path: "/customers", iconKey: "customers", color: "#f76707", bg: "rgba(247,103,7,0.16)" },
  { label: "Продажби", path: "/orders", iconKey: "orders", color: "#d9480f", bg: "rgba(217,72,15,0.16)" },
  { label: "Магазини", path: "/stores", iconKey: "stores", color: "#7950f2", bg: "rgba(121,80,242,0.16)" },
  { label: "Доставчици", path: "/suppliers", iconKey: "suppliers", color: "#4263eb", bg: "rgba(66,99,235,0.16)" },
  { label: "Поръчки към доставчици", path: "/supplier-orders", iconKey: "suppliers", color: "#5f3dc4", bg: "rgba(95,61,196,0.16)" },
  { label: "Наличности", path: "/inventory", iconKey: "inventory", color: "#0ca678", bg: "rgba(12,166,120,0.16)" },
  { label: "Движения", path: "/inventory-movements", iconKey: "movements", color: "#0b7285", bg: "rgba(11,114,133,0.16)" },
  { label: "Ревизии", path: "/inventory-audits", iconKey: "audits", color: "#1971c2", bg: "rgba(25,113,194,0.16)" },
  { label: "Сканиране", path: "/scan", iconKey: "scan", color: "#f59f00", bg: "rgba(245,159,0,0.16)", action: "scan" },
  { label: "Финанси", path: "/finance", iconKey: "finance", color: "#2f9e44", bg: "rgba(47,158,68,0.16)" },
  { label: "Фактури", path: "/invoices", iconKey: "invoices", color: "#15aabf", bg: "rgba(21,170,191,0.16)" },
  { label: "ДДС отчети", path: "/vat-reports", iconKey: "vat", color: "#9c36b5", bg: "rgba(156,54,181,0.16)" },
  { label: "Служители", path: "/employees", iconKey: "employees", color: "#5c7cfa", bg: "rgba(92,124,250,0.16)" },
  { label: "Заявки", path: "/transfers", iconKey: "transfers", color: "#f08c00", bg: "rgba(240,140,0,0.16)" }
];

const iconKeyToGlyph = {
  dashboard: "dashboard",
  products: "products",
  customers: "customers",
  stores: "store",
  suppliers: "business",
  inventory: "inventory2",
  movements: "compare-arrows",
  audits: "fact-check",
  orders: "orders",
  finance: "finance",
  invoices: "receipt",
  vat: "assessment",
  employees: "badge",
  transfers: "local-shipping",
  scan: "qr-code-scanner"
};

function getVisibleNavItems(user) {
  return navItems.filter((item) => {
    if (item.path === "/finance") return user?.role === "admin";
    if (item.path === "/employees") return ["admin", "manager"].includes(user?.role);
    if (["/suppliers", "/supplier-orders"].includes(item.path)) return ["admin", "manager", "warehouse"].includes(user?.role);
    if (item.path === "/inventory-movements") return ["admin", "manager"].includes(user?.role);
    if (item.path === "/inventory-audits") return ["admin", "manager"].includes(user?.role);
    return true;
  });
}

function ModernModuleIcon({ type, size }) {
  const glyphName = iconKeyToGlyph[type] || "circle";
  return <AppGlyph name={glyphName} size={size} tone="inherit" />;
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
  const navigate = useNavigate();
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

  function handleNavAction(item) {
    if (item.action === "scan") {
      navigate("/inventory?scan=1");
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
      <Box sx={{ px: 1.5, pt: 2, pb: 1.25, flexShrink: 0 }}>
        <Stack spacing={1.5} width="100%">
          <Stack spacing={0.75} alignItems="flex-start">
            <Box
              component="img"
              src="/MARK%20LIGHT.png"
              alt="MARK LIGHT Lighting Trade"
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
            <Typography variant="body2" color="rgba(255,255,255,0.86)" sx={{ lineHeight: 1.35 }}>
              Управление на търговска мрежа на MARK LIGHT LTD
            </Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.78)" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
              MARK LIGHT{"\u00AE"}
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

      <List sx={{ p: 1.5, pb: 10, flexGrow: 1, overflowY: "auto" }}>
        {visibleNavItems.map((item, index) => (
          <ListItemButton
            key={item.label}
            ref={(element) => {
              navItemRefs.current[index] = element;
            }}
            component={item.action ? undefined : NavLink}
            to={item.action ? undefined : item.path}
            onClick={(event) => {
              if (item.action) {
                event.preventDefault();
                handleNavAction(item);
              }
              if (onNavigate) {
                onNavigate();
              }
            }}
            onKeyDown={(event) => handleNavItemKeyDown(event, index)}
            sx={{
              mb: 0.75,
              px: 1.25,
              py: 0.9,
              minHeight: 48,
              borderRadius: 3,
              color: "#e8edf3",
              alignItems: "center",
              "&.active": {
                bgcolor: "rgba(156,180,195,0.22)",
                color: "#fff"
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, justifyContent: "center" }}>
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
          <Typography variant="body2" color="rgba(255,255,255,0.86)">
            {user?.role || "Профил"}
          </Typography>
          <ListItemButton onClick={logout} sx={{ px: 0, color: "#fff", borderRadius: 2 }}>
            <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
              <AppGlyph name="logout" />
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
  const navigate = useNavigate();
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

  function handleRailAction(item) {
    if (item.action === "scan") {
      navigate("/inventory?scan=1");
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
        px: { xs: 1, md: 2 },
        py: 0.75,
        gap: 0.75,
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
        src="/MARK%20LIGHT.png"
        alt="MARK LIGHT"
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
              component={item.action ? undefined : NavLink}
              to={item.action ? undefined : item.path}
              aria-label={item.label}
              onClick={(event) => {
                if (item.action) {
                  event.preventDefault();
                  handleRailAction(item);
                }
              }}
              onKeyDown={(event) => handleRailItemKeyDown(event, index)}
              sx={{
                width: 44,
                height: 44,
                p: 0,
                borderRadius: 2.25,
                transition: "transform 160ms ease, box-shadow 160ms ease",
                "&:hover": {
                  transform: "translateY(-1px)"
                },
                "&.active > span": {
                  color: item.color,
                  bgcolor: item.bg,
                  borderColor: item.color,
                  boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${item.bg}, 0 12px 18px rgba(35,52,59,0.14)`,
                  transform: "translateY(-1px) scale(1.04)"
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
          <AppGlyph name="logout" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

export default function CommandCenterShellClean({ children }) {
  const AUTO_OPEN_SCAN_DIALOG = false;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [pendingScannedCode, setPendingScannedCode] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMobileDetection();
  const { logout } = useAuth();
  const { mode, toggleMode } = useAppThemeMode();
  const isDarkMode = mode === "dark";
  const scanBufferRef = useRef("");
  const scanTimeoutRef = useRef(null);
  const scanDialogDataEnabled = scanDialogOpen || Boolean(pendingScannedCode);
  
  // Fetch data for scan dialog
  const { data: products = [] } = useFetch("/products", { enabled: scanDialogDataEnabled });
  const { data: stores = [] } = useFetch("/stores", { enabled: scanDialogDataEnabled });
  const { data: inventory = [] } = useFetch("/inventory/summary", { enabled: scanDialogDataEnabled });
  const { data: customers = [] } = useFetch("/customers?compact=1", { enabled: scanDialogDataEnabled });
  
  useRealtimeNotifications(true);

  useEffect(() => {
    if (!AUTO_OPEN_SCAN_DIALOG) return undefined;

    function onGlobalScanKeydown(event) {
      const target = event.target;
      const tagName = target?.tagName?.toLowerCase?.() || "";
      const isTypingField =
        target?.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select";

      if (isTypingField || event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === "Enter") {
        const value = String(scanBufferRef.current || "").trim();
        if (value.length >= 4) {
          event.preventDefault();
          setPendingScannedCode(value);
          setScanDialogOpen(true);
        }
        scanBufferRef.current = "";
        return;
      }

      if (event.key.length === 1) {
        scanBufferRef.current += event.key;
        if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = window.setTimeout(() => {
          scanBufferRef.current = "";
        }, 120);
      }
    }

    window.addEventListener("keydown", onGlobalScanKeydown, true);

    return () => {
      window.removeEventListener("keydown", onGlobalScanKeydown, true);
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    };
  }, [AUTO_OPEN_SCAN_DIALOG]);

  const handleAddToInventory = async (payload) => {
    const response = await api.post("/inventory/summary", {
      product: payload.product,
      store: payload.store,
      quantity: Number(payload.quantity || 0),
      reorderLevel: 0,
      mode: "increment"
    });
    return response;
  };

  const handleOpenProductsPage = (barcode) => {
    const value = encodeURIComponent(String(barcode || "").trim());
    navigate(`/products?openCreateProduct=1&newProductCode=${value}`);
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: "block", lg: "none" }, "& .MuiDrawer-paper": { width: drawerWidth, border: "none", bgcolor: "transparent", height: "100%" } }}
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
              <AppGlyph name="menu" />
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
            <Tooltip title="Сканирай и действай" arrow>
              <IconButton
                aria-label="Сканирай и действай"
                onClick={() => {
                  setPendingScannedCode("");
                  setScanDialogOpen(true);
                }}
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper"
                }}
              >
                <AppGlyph name="scan" />
              </IconButton>
            </Tooltip>
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
                {isDarkMode ? <AppGlyph name="light" /> : <AppGlyph name="dark" />}
              </IconButton>
            </Tooltip>
            <Button variant="outlined" color="inherit" startIcon={<AppGlyph name="logout" size={20} />} onClick={logout} sx={{ whiteSpace: "nowrap" }}>
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

      <ScanAndActionDialog
        open={scanDialogOpen}
        onClose={() => {
          setScanDialogOpen(false);
          setPendingScannedCode("");
        }}
        initialScannedCode={pendingScannedCode}
        products={products}
        stores={stores}
        inventory={inventory}
        customers={customers}
        onAddToInventory={handleAddToInventory}
        onOpenProductsPage={handleOpenProductsPage}
      />
    </Box>
  );
}
