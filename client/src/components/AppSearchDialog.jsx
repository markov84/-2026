import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PersonSearchRoundedIcon from "@mui/icons-material/PersonSearchRounded";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProviderStable";
import api from "../lib/api";
import AppGlyph from "./AppGlyph";

const modules = [
  { label: "Табло", path: "/", icon: "dashboard" },
  { label: "Продукти", path: "/products", icon: "products" },
  { label: "Калкулатор осветление", path: "/lighting-calculator", icon: "lighting" },
  { label: "Клиенти", path: "/customers", icon: "customers" },
  { label: "Продажби", path: "/orders", icon: "orders" },
  { label: "Магазини", path: "/stores", icon: "store" },
  { label: "Доставчици", path: "/suppliers", icon: "business", roles: ["admin", "manager", "warehouse"] },
  { label: "Поръчки към доставчици", path: "/supplier-orders", icon: "business", roles: ["admin", "manager", "warehouse"] },
  { label: "Наличности", path: "/inventory", icon: "inventory2" },
  { label: "Движения", path: "/inventory-movements", icon: "compare-arrows", roles: ["admin", "manager"] },
  { label: "Ревизии", path: "/inventory-audits", icon: "fact-check", roles: ["admin", "manager"] },
  { label: "Финанси", path: "/finance", icon: "finance", roles: ["admin"] },
  { label: "Фактури", path: "/invoices", icon: "receipt" },
  { label: "ДДС отчети", path: "/vat-reports", icon: "assessment" },
  { label: "Служители", path: "/employees", icon: "badge", roles: ["admin", "manager"] },
  { label: "Заявки", path: "/transfers", icon: "local-shipping" },
  { label: "Журнал на промените", path: "/activity", icon: "activity", roles: ["admin"] }
];

function includesQuery(values, query) {
  return values.some((value) => String(value || "").toLocaleLowerCase().includes(query));
}

export default function AppSearchDialog({ open, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!open || loaded || loading) return;

    setLoading(true);
    Promise.allSettled([api.get("/products"), api.get("/customers?compact=1")])
      .then((results) => {
        const [productResult, customerResult] = results;
        const requestFailed = results.some((result) => result.status === "rejected");
        setLoadError(requestFailed);
        if (productResult.status === "fulfilled") {
          setProducts(Array.isArray(productResult.value.data) ? productResult.value.data : []);
        } else {
          toast.error(productResult.reason?.response?.data?.message || "Неуспешно зареждане на продуктите за търсене.");
        }
        if (customerResult.status === "fulfilled") {
          setCustomers(Array.isArray(customerResult.value.data) ? customerResult.value.data : []);
        } else {
          toast.error(customerResult.reason?.response?.data?.message || "Неуспешно зареждане на клиентите за търсене.");
        }
        setLoaded(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, loaded, loading]);

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return [];

    const matchingModules = modules
      .filter((item) => !item.roles || item.roles.includes(user?.role))
      .filter((item) => includesQuery([item.label], normalized))
      .map((item) => ({ ...item, type: "module", secondary: "Раздел" }));

    const matchingProducts = products
      .filter((item) => includesQuery(
        [item.name, item.productNumber, item.sku, item.barcode, item.category, item.brand],
        normalized
      ))
      .slice(0, 5)
      .map((item) => ({
        label: item.name,
        secondary: [item.productNumber, item.sku, item.category].filter(Boolean).join(" · ") || "Продукт",
        path: `/products?q=${encodeURIComponent(query.trim())}`,
        icon: "products",
        type: "product"
      }));

    const matchingCustomers = customers
      .filter((item) => includesQuery(
        [item.fullName, item.company, item.contactPerson, item.email, item.phone, item.taxNumber],
        normalized
      ))
      .slice(0, 5)
      .map((item) => ({
        label: item.company || item.fullName || item.contactPerson || "Клиент",
        secondary: [item.phone, item.email].filter(Boolean).join(" · ") || "Клиент",
        path: `/customers?q=${encodeURIComponent(query.trim())}`,
        icon: "customers",
        type: "customer"
      }));

    return [...matchingModules, ...matchingProducts, ...matchingCustomers].slice(0, 12);
  }, [customers, products, query, user?.role]);

  function openResult(result) {
    navigate(result.path);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: { xs: 3, sm: 4 },
          overflow: "hidden",
          background: "linear-gradient(145deg, rgba(255,255,255,0.98), rgba(241,246,249,0.98))",
          boxShadow: "0 30px 90px rgba(13,35,48,0.25)"
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={800}>Търсене в MARK LIGHT</Typography>
        <Typography variant="body2" color="text.secondary">Раздели, продукти и клиенти</Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <TextField
          autoFocus
          fullWidth
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Напиши име, SKU, телефон или раздел…"
          inputProps={{ "aria-label": "Глобално търсене" }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="primary" /></InputAdornment>
          }}
        />
        {loading ? (
          <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={26} /></Stack>
        ) : query.trim() ? (
          results.length ? (
            <List aria-label="Резултати от търсенето" sx={{ mt: 1, p: 0 }}>
              {results.map((result, index) => (
                <ListItemButton
                  key={`${result.type}-${result.label}-${index}`}
                  onClick={() => openResult(result)}
                  sx={{ borderRadius: 2, my: 0.5 }}
                >
                  <Avatar sx={{ width: 38, height: 38, mr: 1.5, bgcolor: "rgba(60,98,123,0.1)", color: "primary.main" }}>
                    {result.type === "product" ? <Inventory2RoundedIcon fontSize="small" /> :
                      result.type === "customer" ? <PersonSearchRoundedIcon fontSize="small" /> :
                        <AppGlyph name={result.icon} size={20} />}
                  </Avatar>
                  <ListItemText
                    primary={result.label}
                    secondary={result.secondary}
                    primaryTypographyProps={{ fontWeight: 700, noWrap: true }}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Stack spacing={1} alignItems="center" sx={{ py: 4 }}>
              <Typography color="text.secondary" textAlign="center">
                Няма намерени резултати за „{query.trim()}“.
              </Typography>
              {loadError ? (
                <Button size="small" onClick={() => { setLoaded(false); setLoadError(false); }}>
                  Опитай отново да заредиш продуктите и клиентите
                </Button>
              ) : null}
            </Stack>
          )
        ) : (
          <Stack spacing={1} alignItems="center" sx={{ py: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Натисни Ctrl+K или ⌘K по всяко време за бързо търсене.
            </Typography>
            {loadError ? (
              <Button size="small" onClick={() => { setLoaded(false); setLoadError(false); }}>
                Опитай отново
              </Button>
            ) : null}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
