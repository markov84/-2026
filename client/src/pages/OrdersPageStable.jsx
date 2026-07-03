import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AddShoppingCartRoundedIcon from "@mui/icons-material/AddShoppingCartRounded";
import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ShoppingCartCheckoutRoundedIcon from "@mui/icons-material/ShoppingCartCheckoutRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import BarcodeScannerDialog from "../components/BarcodeScannerDialog";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Autocomplete, Box, Button, Chip, DialogContent, DialogTitle, IconButton, InputAdornment, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import DataSection from "../components/DataSection";
import Dialog from "../components/DraggableDialog";
import DialogFooterActions from "../components/DialogFooterActions";
import { FormGrid, FormGridFull } from "../components/FormGrid";
import GridRowActions from "../components/GridRowActions";
import PageLoadingNotice from "../components/PageLoadingNotice";
import PageHeader from "../components/PageHeader";
import { ProductIdentity } from "../components/ProductPresentation";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";
import api from "../lib/api";
import { formatCurrencyEUR, formatDate } from "../lib/currency";
import { printOrder } from "../lib/printDocuments";
import { useAuth } from "../providers/AuthProviderStable";
import { findProductByScanCode, parseScannedInput } from "../lib/scanCode";

const initialOrder = {
  orderNumber: "Генерира се автоматично",
  store: "",
  customer: "",
  items: [],
  status: "pending",
  paymentStatus: "unpaid"
};

const paymentStatusLabels = {
  unpaid: "Неплатена",
  partial: "Частично",
  paid: "Платена"
};

const orderStatusLabels = {
  pending: "Чакаща",
  confirmed: "Потвърдена",
  fulfilled: "Изпълнена",
  cancelled: "Отказана"
};

const orderPeriodLabels = {
  all: "Всички",
  today: "Днес",
  week: "Последни 7 дни",
  month: "Този месец",
  custom: "По избор"
};

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function parseDateOnly(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPeriodRange(period, fromDate, toDate) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  if (period === "today") {
    return { start: startOfToday, end: endOfToday };
  }

  if (period === "week") {
    return { start: new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000), end: endOfToday };
  }

  if (period === "month") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfToday };
  }

  if (period === "custom") {
    const start = parseDateOnly(fromDate);
    const endDate = parseDateOnly(toDate);
    if (!start || !endDate) return null;
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
    return { start, end };
  }

  return null;
}

function isOrderInRange(order, range) {
  if (!range) return true;
  const date = new Date(order?.createdAt || order?.updatedAt || 0);
  if (Number.isNaN(date.getTime())) return false;
  return date >= range.start && date < range.end;
}

function createOrderItem(product = null, overrides = {}) {
  return {
    key: globalThis.crypto?.randomUUID?.() || `order-item-${Date.now()}-${Math.random()}`,
    product: product?._id || "",
    quantity: product ? "1" : "",
    unitPrice: product ? String(product.price ?? "") : "",
    vatRate: String(product?.vatRate ?? 20),
    ...overrides
  };
}

function normalizeOrderItems(items = []) {
  return items.map((item) =>
    createOrderItem(null, {
      product: item.product?._id || item.product || "",
      quantity: String(item.quantity ?? 1),
      unitPrice: String(item.unitPrice ?? item.product?.price ?? ""),
      vatRate: String(item.vatRate ?? item.product?.vatRate ?? 20)
    })
  );
}

function getCleanOrderItems(order) {
  return (order?.items || [])
    .map((item) => ({
      product: item.product,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      vatRate: Number(item.vatRate || 0)
    }))
    .filter((item) => item.product && item.quantity > 0);
}

function getOrderTotals(order) {
  return getCleanOrderItems(order).reduce(
    (totals, item) => {
      const lineGross = item.quantity * item.unitPrice;
      const vatDivider = 1 + item.vatRate / 100;
      const lineBase = vatDivider > 0 ? lineGross / vatDivider : lineGross;
      const lineVat = lineGross - lineBase;
      return {
        subtotal: totals.subtotal + lineBase,
        vatAmount: totals.vatAmount + lineVat,
        totalAmount: totals.totalAmount + lineGross
      };
    },
    { subtotal: 0, vatAmount: 0, totalAmount: 0 }
  );
}

function getCustomerDisplayName(customer) {
  if (!customer) return "На място";
  return customer.customerType === "company" ? customer.company || customer.fullName || "На място" : customer.fullName || customer.company || "На място";
}

function validateOrder(order) {
  if (!order?.store) return "Избери магазин.";
  const items = getCleanOrderItems(order);
  if (!items.length) return "Добави поне един продукт.";

  for (const [index, item] of items.entries()) {
    const row = index + 1;
    if (!item.product) return `Избери продукт на ред ${row}.`;
    if (Number(item.quantity || 0) <= 0) return `Количеството на ред ${row} трябва да е по-голямо от 0.`;
    if (Number(item.unitPrice || 0) < 0) return `Единичната цена на ред ${row} не може да е отрицателна.`;
    if (Number(item.vatRate || 0) < 0) return `ДДС ставката на ред ${row} не може да е отрицателна.`;
  }

  if (getOrderTotals(order).totalAmount <= 0) return "Крайната сума трябва да е по-голяма от 0.";
  return "";
}

function getProductById(products, productId) {
  return products.find((product) => product._id === productId) || null;
}

function getInventoryForItem(inventory, productId, storeId) {
  return inventory.find((item) => item.product?._id === productId && item.store?._id === storeId);
}

function getProductOptionLabel(product) {
  if (!product) return "";
  return [product.name, product.productNumber ? `№ ${product.productNumber}` : "", product.sku || product.barcode || ""].filter(Boolean).join(" | ");
}

function isOrderItemFilled(item) {
  return Boolean(
    item?.product ||
      Number(item?.quantity || 0) > 0 ||
      Number(item?.unitPrice || 0) > 0
  );
}

function withTrailingOrderRow(items) {
  const nextItems = items.length ? items : [createOrderItem()];
  const lastItem = nextItems[nextItems.length - 1];
  return isOrderItemFilled(lastItem) ? [...nextItems, createOrderItem()] : nextItems;
}

function OrderProductsCell({ items }) {
  const visibleItems = items || [];
  if (!visibleItems.length) return <Typography variant="body2" color="text.secondary">-</Typography>;

  return (
    <Stack spacing={0.5} sx={{ width: "100%", py: 0.75 }}>
      {visibleItems.slice(0, 3).map((item, index) => (
        <Stack key={`${item.product?._id || index}-${index}`} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <ProductIdentity compact product={item.product} />
          </Box>
          <Typography variant="body2" fontWeight={900} whiteSpace="nowrap">
            {Number(item.quantity || 0)} бр.
          </Typography>
        </Stack>
      ))}
      {visibleItems.length > 3 ? (
        <Typography variant="caption" color="text.secondary" fontWeight={800}>
          + още {visibleItems.length - 3} продукта
        </Typography>
      ) : null}
    </Stack>
  );
}

function OrderItemsEditor({ value, products, inventory, store, onChange, onOpenScanner, onScanSuccess, onScanError, resolveScannedProduct }) {
  const items = value?.length ? value : [createOrderItem()];

  async function applyScannedCodeToItems(rawCode, targetKey) {
    const code = parseScannedInput(rawCode);
    if (!code) return false;

    const resolved = await resolveScannedProduct?.(code);
    const product = resolved?.product || findProductByScanCode(products, code);
    if (!product) {
      onScanError?.();
      toast.error(`Няма продукт с баркод/SKU ${code}.`);
      return false;
    }

    const filledItems = items.filter(isOrderItemFilled);
    const existingItem = filledItems.find((row) => row.product === product._id);

    if (existingItem) {
      onChange(
        withTrailingOrderRow(
          filledItems.map((row) =>
            row.key === existingItem.key
              ? {
                  ...row,
                  quantity: String(Number(row.quantity || 0) + 1),
                  unitPrice: row.unitPrice || String(product.price ?? ""),
                  vatRate: row.vatRate || String(product.vatRate ?? 20)
                }
              : row
          )
        )
      );
      onScanSuccess?.();
      toast.success(`Количество +1: ${product.name}`);
      return true;
    }

    const targetIndex = items.findIndex((row) => row.key === targetKey && !row.product);
    if (targetIndex !== -1) {
      onChange(
        withTrailingOrderRow(
          items.map((row, index) =>
            index === targetIndex
              ? {
                  ...row,
                  product: product._id,
                  quantity: row.quantity || "1",
                  unitPrice: String(product.price ?? row.unitPrice ?? ""),
                  vatRate: String(product.vatRate ?? row.vatRate ?? 20)
                }
              : row
          )
        )
      );
      onScanSuccess?.();
      toast.success(`Добавен продукт: ${product.name}`);
      return true;
    }

    onChange(withTrailingOrderRow([...filledItems, createOrderItem(product)]));
    onScanSuccess?.();
    toast.success(`Добавен продукт: ${product.name}`);
    return true;
  }

  function updateItem(key, patch) {
    onChange(withTrailingOrderRow(items.map((item) => (item.key === key ? { ...item, ...patch } : item))));
  }

  function removeItem(key) {
    const nextItems = items.filter((item) => item.key !== key);
    onChange(nextItems.length ? nextItems : [createOrderItem()]);
  }

  return (
    <Stack
      spacing={0.75}
      sx={{
        "& .MuiInputBase-root": { minHeight: 30 },
        "& .MuiInputBase-input": { py: 0.3, px: 0.7, fontSize: 13 },
        "& .MuiSelect-select": { py: 0.35, px: 0.75, fontSize: 13 }
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Typography variant="subtitle1" fontWeight={900}>
          Продукти в продажбата
        </Typography>
        <Button size="small" variant="outlined" startIcon={<QrCodeScannerRoundedIcon />} onClick={onOpenScanner}>
          Сканирай с камера
        </Button>
      </Stack>

      <TableContainer
        sx={{
          display: { xs: "none", md: "block" },
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1.25,
          overflowX: "auto",
          bgcolor: "background.paper",
          "& .MuiTableCell-root": {
              px: 0.45,
              py: 0.22,
            borderColor: "rgba(39,86,107,0.10)"
          },
          "& .MuiTableCell-head": {
              py: 0.3,
            bgcolor: "rgba(39,86,107,0.04)",
            color: "text.secondary",
            fontSize: 12,
            lineHeight: 1.2
          }
        }}
      >
        <Table size="small" sx={{ minWidth: 760, tableLayout: "fixed" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 24, fontWeight: 900 }}>№</TableCell>
              <TableCell sx={{ width: 272, fontWeight: 900 }}>Наименование</TableCell>
              <TableCell align="right" sx={{ width: 72, fontWeight: 900 }}>Брой</TableCell>
              <TableCell align="right" sx={{ width: 84, fontWeight: 900 }}>Ед. цена</TableCell>
              <TableCell align="right" sx={{ width: 62, fontWeight: 900 }}>ДДС %</TableCell>
              <TableCell align="right" sx={{ width: 92, fontWeight: 900 }}>ДДС</TableCell>
              <TableCell align="right" sx={{ width: 108, fontWeight: 900 }}>Общо с ДДС</TableCell>
              <TableCell align="right" sx={{ width: 84, fontWeight: 900 }}>Наличност</TableCell>
              <TableCell align="center" sx={{ width: 34, fontWeight: 900 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => {
              const selectedProduct = getProductById(products, item.product);
              const selectedInventory = getInventoryForItem(inventory, item.product, store);
              const quantity = Number(item.quantity || 0);
              const unitPrice = Number(item.unitPrice || 0);
              const vatRate = Number(item.vatRate || 0);
              const lineGross = quantity * unitPrice;
              const vatDivider = 1 + vatRate / 100;
              const lineSubtotal = vatDivider > 0 ? lineGross / vatDivider : lineGross;
              const lineVat = lineGross - lineSubtotal;
              const hasLowStockRisk = selectedInventory && quantity > Number(selectedInventory.quantity || 0);

              return (
                <TableRow key={item.key} sx={{ bgcolor: hasLowStockRisk ? "rgba(183,138,77,0.08)" : "inherit" }}>
                  <TableCell>
                    <Typography variant="caption" fontWeight={900} color="text.secondary">{index + 1}</Typography>
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      size="small"
                      options={Array.isArray(products) ? products : []}
                      getOptionLabel={getProductOptionLabel}
                      value={selectedProduct}
                      onChange={(_, product) => {
                        updateItem(item.key, {
                          product: product?._id || "",
                          quantity: item.quantity || "1",
                          unitPrice: String(product?.price ?? item.unitPrice ?? ""),
                          vatRate: String(product?.vatRate ?? item.vatRate ?? 20)
                        });
                      }}
                      isOptionEqualToValue={(option, selectedValue) => option?._id === selectedValue?._id}
                      noOptionsText="Няма продукт"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label=""
                          placeholder={`Продукт ${index + 1}`}
                          size="small"
                          onKeyDown={(e) => {
                            if (e.key !== "Enter" && e.key !== "Tab") return;
                            const inputElement = e.currentTarget;
                            const rawValue = inputElement.value || "";
                            e.preventDefault();
                            void applyScannedCodeToItems(rawValue, item.key).then((handled) => {
                              if (handled) inputElement.value = "";
                            });
                          }}
                          onPaste={(e) => {
                            const pasted = (e.clipboardData || window.clipboardData).getData("text");
                            e.preventDefault();
                            void applyScannedCodeToItems(pasted, item.key);
                          }}
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      aria-label="Брой"
                      type="number"
                      value={item.quantity}
                      onChange={(event) => updateItem(item.key, { quantity: event.target.value })}
                      inputProps={{ min: 1 }}
                      sx={{ width: 58 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      aria-label="Единична цена"
                      type="number"
                      value={item.unitPrice}
                      onChange={(event) => updateItem(item.key, { unitPrice: event.target.value })}
                      inputProps={{ min: 0 }}
                      sx={{ width: 78 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      aria-label="ДДС процент"
                      type="number"
                      value={item.vatRate}
                      onChange={(event) => updateItem(item.key, { vatRate: event.target.value })}
                      inputProps={{ min: 0 }}
                      sx={{ width: 56 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={800} noWrap>
                      {formatCurrencyEUR(lineVat)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={900} color="primary.main" noWrap>
                      {formatCurrencyEUR(lineGross)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color={hasLowStockRisk || !selectedInventory ? "warning.main" : "text.primary"} fontWeight={900} noWrap>
                      {selectedInventory ? `${selectedInventory.quantity} бр.` : "-"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Премахни продукт">
                      <span>
                        <IconButton size="small" color="error" onClick={() => removeItem(item.key)} disabled={items.length === 1} aria-label="Премахни продукт">
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack spacing={0.75} sx={{ display: { xs: "flex", md: "none" } }}>
        {items.map((item, index) => {
          const selectedProduct = getProductById(products, item.product);
          const selectedInventory = getInventoryForItem(inventory, item.product, store);
          const quantity = Number(item.quantity || 0);
          const unitPrice = Number(item.unitPrice || 0);
          const vatRate = Number(item.vatRate || 0);
          const lineGross = quantity * unitPrice;
          const vatDivider = 1 + vatRate / 100;
          const lineSubtotal = vatDivider > 0 ? lineGross / vatDivider : lineGross;
          const lineVat = lineGross - lineSubtotal;
          const hasLowStockRisk = selectedInventory && quantity > Number(selectedInventory.quantity || 0);

          return (
            <Box
              key={item.key}
              sx={{
                p: 1,
                border: "1px solid",
                borderColor: hasLowStockRisk ? "warning.main" : "divider",
                borderRadius: 1.25,
                bgcolor: hasLowStockRisk ? "rgba(183,138,77,0.08)" : "background.paper"
              }}
            >
              <Stack spacing={0.75}>
                <Typography variant="caption" fontWeight={900} color="text.secondary">Ред {index + 1}</Typography>
                <Autocomplete
                  size="small"
                  options={Array.isArray(products) ? products : []}
                  getOptionLabel={getProductOptionLabel}
                  value={selectedProduct}
                  onChange={(_, product) => {
                    updateItem(item.key, {
                      product: product?._id || "",
                      quantity: item.quantity || "1",
                      unitPrice: String(product?.price ?? item.unitPrice ?? ""),
                      vatRate: String(product?.vatRate ?? item.vatRate ?? 20)
                    });
                  }}
                  isOptionEqualToValue={(option, selectedValue) => option?._id === selectedValue?._id}
                  noOptionsText="Няма продукт"
                  renderInput={(params) => <TextField {...params} size="small" label="Продукт" placeholder="Сканирай или търси" />}
                />
                <Stack direction="row" spacing={0.75}>
                  <TextField size="small" label="Брой" type="number" value={item.quantity} onChange={(event) => updateItem(item.key, { quantity: event.target.value })} inputProps={{ min: 1 }} fullWidth />
                  <TextField size="small" label="Ед. цена" type="number" value={item.unitPrice} onChange={(event) => updateItem(item.key, { unitPrice: event.target.value })} inputProps={{ min: 0 }} fullWidth />
                  <TextField size="small" label="ДДС %" type="number" value={item.vatRate} onChange={(event) => updateItem(item.key, { vatRate: event.target.value })} inputProps={{ min: 0 }} fullWidth />
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">ДДС</Typography>
                  <Typography variant="body2" fontWeight={800}>{formatCurrencyEUR(lineVat)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Общо с ДДС</Typography>
                  <Typography variant="body2" fontWeight={900} color="primary.main">{formatCurrencyEUR(lineGross)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">Наличност</Typography>
                  <Typography variant="body2" color={hasLowStockRisk || !selectedInventory ? "warning.main" : "text.primary"} fontWeight={900}>
                    {selectedInventory ? `${selectedInventory.quantity} бр.` : "-"}
                  </Typography>
                </Stack>
                <Button size="small" color="error" variant="text" onClick={() => removeItem(item.key)} disabled={items.length === 1}>
                  Премахни продукт
                </Button>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}

function OrderTotals({ order }) {
  const rows = getCleanOrderItems(order);
  const totalQuantity = rows.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totals = getOrderTotals(order);

  return (
    <Stack
      spacing={0.55}
      sx={{ p: 1.5, borderRadius: 2, bgcolor: "rgba(39,86,107,0.06)", border: "1px solid rgba(39,86,107,0.10)" }}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} justifyContent="space-between" alignItems={{ md: "flex-start" }}>
        <Stack direction="row" spacing={2} sx={{ minWidth: 0 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>Редове</Typography>
            <Typography fontWeight={900} sx={{ lineHeight: 1.15 }}>{rows.length}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>Общо бройки</Typography>
            <Typography fontWeight={900} sx={{ lineHeight: 1.15 }}>{totalQuantity} бр.</Typography>
          </Box>
        </Stack>
        <Stack spacing={0.3} sx={{ width: { xs: "100%", md: 270 }, ml: { md: "auto" }, alignItems: "flex-start" }}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>Сума без ДДС</Typography>
            <Typography fontWeight={900} sx={{ lineHeight: 1.1 }}>{formatCurrencyEUR(totals.subtotal)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>ДДС</Typography>
            <Typography fontWeight={900} sx={{ lineHeight: 1.1 }}>{formatCurrencyEUR(totals.vatAmount)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>Общо с ДДС</Typography>
            <Typography fontWeight={900} color="primary.main" sx={{ lineHeight: 1.1 }}>{formatCurrencyEUR(totals.totalAmount)}</Typography>
          </Box>
        </Stack>
      </Stack>
    </Stack>
  );
}

export default function OrdersPageStable() {
  const { user } = useAuth();
  const { data: orders, loading, setData } = useFetch("/orders");
  const { data: stores } = useFetch("/stores");
  const { data: customers } = useFetch("/customers");
  const { data: products, refresh: refreshProducts } = useFetch("/products");
  const { data: inventory, refresh: refreshInventory } = useFetch("/inventory/summary");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialOrder);
  const [scanCode, setScanCode] = useState("");
  const [editScanCode, setEditScanCode] = useState("");
  const [editingOrder, setEditingOrder] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [orderScanOpen, setOrderScanOpen] = useState(false);
  const [orderScanTarget, setOrderScanTarget] = useState("create");
  const [orderQuery, setOrderQuery] = useState("");
  const [period, setPeriod] = useState("all");
  const [fromDate, setFromDate] = useState(toDateInputValue(new Date()));
  const [toDate, setToDate] = useState(toDateInputValue(new Date()));
  const scanFieldRef = useRef(null);
  const editScanFieldRef = useRef(null);
  const scannerBufferRef = useRef("");
  const scannerLastKeyAtRef = useRef(0);
  const audioContextRef = useRef(null);
  const openRef = useRef(false);
  const formRef = useRef(initialOrder);
  const editingOrderRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMobileDetection();
  const canSeeOrderAuthor = user?.role === "admin";

  useEffect(() => {
    openRef.current = open;
    formRef.current = form;
    editingOrderRef.current = editingOrder;
  }, [open, form, editingOrder]);

  const periodRange = useMemo(() => getPeriodRange(period, fromDate, toDate), [period, fromDate, toDate]);
  const periodOrders = useMemo(() => (orders || []).filter((order) => isOrderInRange(order, periodRange)), [orders, periodRange]);

  // Automatic refresh disabled to prevent infinite loops
  // Manual refresh available via refreshProducts() and refreshInventory() if needed

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const scanParam = params.get("scan");
    const shouldOpenScanDialog = scanParam === "1" || scanParam?.toLowerCase() === "true";

    if (!shouldOpenScanDialog || open) return;

    openCreateDialog();
    const timer = window.setTimeout(() => scanFieldRef.current?.focus(), 120);
    navigate("/orders", { replace: true });
    return () => window.clearTimeout(timer);
  }, [location.search, open, navigate]);

  const filteredOrders = useMemo(() => {
    const normalized = orderQuery.trim().toLowerCase();
    if (!normalized) return orders;

    return periodOrders.filter((order) => {
      const productNames = (order.items || [])
        .map((item) => item.product?.name || item.product?.sku || item.product?.barcode || "")
        .join(" ");

      return [
        order.orderNumber,
        order.store?.name,
        order.customer?.fullName,
        order.customer?.company,
        order.customer?.vatNumber,
        order.status,
        order.paymentStatus,
        order.createdBy?.fullName,
        order.createdBy?.username,
        productNames
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [periodOrders, orderQuery]);

  const orderSummary = useMemo(
    () =>
      filteredOrders.reduce(
        (summary, order) => ({
          count: summary.count + 1,
          totalAmount: summary.totalAmount + Number(order.totalAmount || 0),
          vatAmount: summary.vatAmount + Number(order.vatAmount || 0)
        }),
        { count: 0, totalAmount: 0, vatAmount: 0 }
      ),
    [filteredOrders]
  );

  useEffect(() => {
    setSelectedOrderIds((current) => current.filter((id) => filteredOrders.some((order) => order._id === id)));
  }, [filteredOrders]);

  const orderColumns = useMemo(
    () => [
      { field: "orderNumber", headerName: "Продажба", flex: 0.75, minWidth: 115 },
      {
        field: "createdAt",
        headerName: "Дата",
        flex: 0.75,
        minWidth: 110,
        valueFormatter: (params) => formatDate(params?.value ?? params)
      },
      {
        field: "customer",
        headerName: "Клиент",
        flex: 0.9,
        minWidth: 135,
        valueGetter: (_, row) => getCustomerDisplayName(row.customer)
      },
      { field: "store", headerName: "Магазин", flex: 0.75, minWidth: 120, valueGetter: (_, row) => row.store?.name || "-" },
      ...(canSeeOrderAuthor
        ? [
            {
              field: "createdBy",
              headerName: "Служител",
              flex: 0.85,
              minWidth: 135,
              valueGetter: (_, row) => row.createdBy?.fullName || row.createdBy?.username || "-"
            }
          ]
        : []),
      {
        field: "products",
        headerName: "Продукти",
        flex: 2,
        minWidth: 300,
        sortable: false,
        renderCell: (params) => <OrderProductsCell items={params?.row?.items || []} />
      },
      {
        field: "paymentStatus",
        headerName: "Плащане",
        flex: 0.65,
        minWidth: 105,
        valueFormatter: (params) => paymentStatusLabels[params?.value ?? params] || "-"
      },
      {
        field: "vatAmount",
        headerName: "ДДС",
        flex: 0.7,
        minWidth: 120,
        valueGetter: (_, row) => {
          if (row?.vatAmount != null) return row.vatAmount;
          const totals = getOrderTotals(row);
          return totals.vatAmount;
        },
        valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0)
      },
      {
        field: "totalAmount",
        headerName: "Общо с ДДС",
        flex: 0.75,
        minWidth: 140,
        valueGetter: (_, row) => {
          if (row?.totalAmount != null) return row.totalAmount;
          const totals = getOrderTotals(row);
          return totals.totalAmount;
        },
        valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0)
      },
      {
        field: "actions",
        headerName: "",
        sortable: false,
        filterable: false,
        width: 150,
        align: "center",
        renderCell: (params) => (
          <GridRowActions
            onPrint={() => printOrder(params.row)}
            onEdit={() => openEditDialog(params.row)}
            onDelete={canSeeOrderAuthor ? () => setDeletingOrder(params.row) : undefined}
          />
        )
      }
    ],
    [canSeeOrderAuthor]
  );

  async function openCreateDialog() {
    await refreshInventory();
    setForm({ ...initialOrder, items: [createOrderItem()] });
    setScanCode("");
    setOpen(true);
  }

  async function openEditDialog(order) {
    await refreshInventory();
    setEditingOrder({
      _id: order._id,
      orderNumber: order.orderNumber || "",
      store: order.store?._id || "",
      customer: order.customer?._id || "",
      items: withTrailingOrderRow(normalizeOrderItems(order.items)),
      status: order.status || "pending",
      paymentStatus: order.paymentStatus || "unpaid"
    });
    setEditScanCode("");
  }

  function buildOrderPayload(order, { includeOrderNumber = false } = {}) {
    const totals = getOrderTotals(order);
    const payload = {
      store: order.store,
      customer: order.customer || undefined,
      status: order.status,
      paymentStatus: order.paymentStatus,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      totalAmount: totals.totalAmount,
      items: getCleanOrderItems(order)
    };

    if (includeOrderNumber) payload.orderNumber = order.orderNumber.trim();
    return payload;
  }

  async function handleCreate() {
    const validationMessage = validateOrder(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.post("/orders", buildOrderPayload(form));
      setData((current) => [response.data, ...current]);
      void refreshInventory();
      setForm(initialOrder);
      setOpen(false);
      toast.success("Продажбата е записана.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно записване на продажбата.");
    }
  }

  async function handleUpdate() {
    if (!editingOrder?._id) return;

    const validationMessage = validateOrder(editingOrder);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.put(`/orders/${editingOrder._id}`, buildOrderPayload(editingOrder, { includeOrderNumber: true }));
      setData((current) => current.map((item) => (item._id === editingOrder._id ? response.data : item)));
      void refreshInventory();
      setEditingOrder(null);
      toast.success("Продажбата е обновена.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешна редакция на продажба.");
    }
  }

  async function handleDelete() {
    if (!deletingOrder?._id) return;

    try {
      await api.delete(`/orders/${deletingOrder._id}`);
      setData((current) => current.filter((item) => item._id !== deletingOrder._id));
      void refreshInventory();
      setDeletingOrder(null);
      toast.success("Продажбата е изтрита.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно изтриване на продажба.");
    }
  }

  async function handleBulkDelete() {
    if (!selectedOrderIds.length) return;

    const idsToDelete = [...selectedOrderIds];

    try {
      const results = await Promise.allSettled(idsToDelete.map((id) => api.delete(`/orders/${id}`)));
      const deletedCount = results.filter((result) => result.status === "fulfilled").length;

      if (!deletedCount) {
        throw new Error("Неуспешно изтриване на избраните продажби.");
      }

      setData((current) => current.filter((item) => !idsToDelete.includes(item._id)));
      setSelectedOrderIds([]);
      setBulkDeleteOpen(false);
      void refreshInventory();
      toast.success(`Изтрити продажби: ${deletedCount}`);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Неуспешно изтриване на избраните продажби.");
    }
  }

  function playScanFeedback(type = "success") {
    if (typeof window === "undefined") return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {
          // Ignore resume errors.
        });
      }
      const now = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(type === "success" ? 920 : 240, now);
      if (type !== "success") {
        oscillator.frequency.linearRampToValueAtTime(170, now + 0.09);
      }

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.055, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (type === "success" ? 0.08 : 0.12));

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + (type === "success" ? 0.09 : 0.13));
    } catch {
      // Ignore audio feedback failures to avoid blocking scan flow.
    }
  }

  const resolveScannedProduct = useCallback(
    async (rawCode) => {
      const code = parseScannedInput(rawCode);
      if (!code) return { code: "", product: null };

      const localProduct = findProductByScanCode(products, code);
      if (localProduct) {
        return { code, product: localProduct };
      }

      try {
        const response = await api.get(`/products?search=${encodeURIComponent(code)}`);
        const payload = response?.data;
        const remoteProducts = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        const remoteProduct = findProductByScanCode(remoteProducts, code) || remoteProducts[0] || null;
        if (remoteProduct) {
          return { code, product: remoteProduct };
        }
      } catch {
        // Ignore network errors here and let caller show a single toast.
      }

      return { code, product: null };
    },
    [products]
  );

  const applyScannedProduct = useCallback(
    async (rawCode, setter, clearScan, activeDraft) => {
      const { code, product } = await resolveScannedProduct(rawCode);
      if (!code) return;

      if (!product) {
        playScanFeedback("error");
        toast.error(`Няма продукт с баркод/SKU ${code}.`);
        return;
      }

      setter((current) => {
        const currentItems = (current.items || []).filter(isOrderItemFilled);
        const existingItem = currentItems.find((item) => item.product === product._id);

        if (existingItem) {
          return {
            ...current,
            items: withTrailingOrderRow(currentItems.map((item) =>
              item.key === existingItem.key
                ? {
                    ...item,
                    quantity: String(Number(item.quantity || 0) + 1),
                    unitPrice: item.unitPrice || String(product.price ?? ""),
                    vatRate: item.vatRate || String(product.vatRate ?? 20)
                  }
                : item
            ))
          };
        }

        return {
          ...current,
          items: withTrailingOrderRow([...currentItems, createOrderItem(product)])
        };
      });

      clearScan("");
      playScanFeedback("success");
      const alreadyInCart = activeDraft?.items?.some((item) => item.product === product._id);
      toast.success(alreadyInCart ? "Количество +1." : `Добавен продукт: ${product.name}`);
    },
    [resolveScannedProduct]
  );

  const handleOrderScannerDetected = useCallback(
    async (rawCode) => {
      const { code, product } = await resolveScannedProduct(rawCode);
      if (!code) return;

      if (!product) {
        playScanFeedback("error");
        toast.error(`Няма продукт с баркод/SKU ${code}.`);
        return;
      }

      const targetSetter = orderScanTarget === "edit" && editingOrder ? setEditingOrder : setForm;
      targetSetter((current) => {
        if (!current) return current;

        const currentItems = (current.items || []).filter(isOrderItemFilled);
        const existingItem = currentItems.find((item) => item.product === product._id);

        if (existingItem) {
          toast.success(`Количество +1: ${product.name}`);
          return {
            ...current,
            items: withTrailingOrderRow(
              currentItems.map((item) =>
                item.key === existingItem.key
                  ? {
                      ...item,
                      quantity: String(Number(item.quantity || 0) + 1),
                      unitPrice: item.unitPrice || String(product.price ?? ""),
                      vatRate: item.vatRate || String(product.vatRate ?? 20)
                    }
                  : item
              )
            )
          };
        }

        toast.success(`Добавен продукт: ${product.name}`);
        return {
          ...current,
          items: withTrailingOrderRow([...currentItems, createOrderItem(product)])
        };
      });

      playScanFeedback("success");
      setOrderScanOpen(false);
    },
    [resolveScannedProduct, orderScanTarget, editingOrder]
  );

  function handleScanKeyDown(event, setter, clearScan, activeDraft, scanValue) {
    if (event.key !== "Enter" && event.key !== "Tab") return;
    event.preventDefault();
    if (scanValue && scanValue.trim().length > 0) {
      void applyScannedProduct(scanValue, setter, clearScan, activeDraft);
    }
  }

  useEffect(() => {
    if (open || editingOrder) {
      // Focus scan field immediately and repeatedly to ensure it's focused
      const focusTimers = [
        setTimeout(() => scanFieldRef.current?.focus(), 0),
        setTimeout(() => scanFieldRef.current?.focus(), 50),
        setTimeout(() => scanFieldRef.current?.focus(), 150)
      ];
      return () => focusTimers.forEach(timer => clearTimeout(timer));
    }
  }, [open, editingOrder]);

  useEffect(() => {
    if (!open && !editingOrder) return undefined;

    function isTypingTarget(target) {
      if (!target) return false;
      if (target instanceof HTMLInputElement) return true;
      if (target instanceof HTMLTextAreaElement) return true;
      if (target instanceof HTMLSelectElement) return true;
      if (target.isContentEditable) return true;
      return Boolean(target.closest?.("[contenteditable='true']"));
    }

    function onWindowKeyDown(event) {
      if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;
      const typingTarget = isTypingTarget(event.target);
      const isSubmitKey =
        event.key === "Enter" ||
        event.key === "Tab" ||
        event.key === "Process" ||
        event.code === "Enter" ||
        event.code === "NumpadEnter" ||
        event.code === "Tab";

      const now = Date.now();
      if (now - scannerLastKeyAtRef.current > 120) {
        scannerBufferRef.current = "";
      }
      scannerLastKeyAtRef.current = now;

      if (event.key.length === 1) {
        scannerBufferRef.current += event.key;
        if (scannerBufferRef.current.length > 220) {
          scannerBufferRef.current = "";
        }
        return;
      }

      if (isSubmitKey) {
        const rawCode = scannerBufferRef.current;
        scannerBufferRef.current = "";
        if (!rawCode || rawCode.length < 4) return;

        event.preventDefault();

        if (editingOrderRef.current) {
          void applyScannedProduct(rawCode, setEditingOrder, setEditScanCode, editingOrderRef.current);
          return;
        }

        if (openRef.current) {
          void applyScannedProduct(rawCode, setForm, setScanCode, formRef.current);
        }
        return;
      }

      if (typingTarget) return;
    }

    window.addEventListener("keydown", onWindowKeyDown, true);
    return () => window.removeEventListener("keydown", onWindowKeyDown, true);
  }, [open, editingOrder]);

  function renderSharedOrderFields(order, setOrder, scanValue, setScanValue, scanFieldRef) {
    return (
      <Stack spacing={2.5}>
        <Alert severity="success" sx={{ mb: 1 }}>
          <strong>Как да скаиираш:</strong> Поставь скенера срещу баркода → полето ще прихвати кода автоматично → продуктът се добавя. Повторен скан увеличава количеството.
        </Alert>
        <TextField
          fullWidth
          autoFocus
          label="📱 Сканирай баркод или SKU"
          value={scanValue}
          inputRef={scanFieldRef}
          onChange={(event) => {
            setScanValue(event.target.value);
            // Auto-scan if code looks complete (ends with Enter or looks like a barcode)
            const value = event.target.value.trim();
            if (value && value.length > 6) {
              // Trigger scan immediately if it looks like a barcode
              const delayId = setTimeout(() => {
                if (scanFieldRef.current?.value === value) {
                  void applyScannedProduct(value, setOrder, setScanValue, order);
                }
              }, 50);
              return () => clearTimeout(delayId);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              if (scanValue && scanValue.trim().length > 0) {
                void applyScannedProduct(scanValue, setOrder, setScanValue, order);
              }
            }
          }}
          helperText="Сканирай продукт, за да го добавиш в продажбата. Повторно сканиране увеличава количеството."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <QrCodeScannerRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Button size="small" onClick={() => applyScannedProduct(scanValue, setOrder, setScanValue, order)}>
                  Добави
                </Button>
              </InputAdornment>
            )
          }}
        />
        <FormGrid min={230}>
          <TextField
            label="Номер на продажба"
            value={order.orderNumber}
            disabled={order.orderNumber === initialOrder.orderNumber}
            onChange={(event) => setOrder((current) => ({ ...current, orderNumber: event.target.value }))}
          />
          <TextField select label="Магазин" value={order.store} onChange={(event) => setOrder((current) => ({ ...current, store: event.target.value }))}>
            {stores.map((store) => (
              <MenuItem key={store._id} value={store._id}>
                {store.name} | {store.city}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Клиент" value={order.customer} onChange={(event) => setOrder((current) => ({ ...current, customer: event.target.value }))}>
            <MenuItem value="">Клиент на място</MenuItem>
            {customers.map((customer) => (
              <MenuItem key={customer._id} value={customer._id}>
                {getCustomerDisplayName(customer)}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Статус" value={order.status} onChange={(event) => setOrder((current) => ({ ...current, status: event.target.value }))}>
            {Object.entries(orderStatusLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Плащане" value={order.paymentStatus} onChange={(event) => setOrder((current) => ({ ...current, paymentStatus: event.target.value }))}>
            {Object.entries(paymentStatusLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        </FormGrid>
        <FormGridFull>
          <OrderItemsEditor
            value={order.items}
            products={products}
            inventory={inventory}
            store={order.store}
            onChange={(items) => setOrder((current) => ({ ...current, items }))}
            onScanSuccess={() => playScanFeedback("success")}
            onScanError={() => playScanFeedback("error")}
            resolveScannedProduct={resolveScannedProduct}
            onOpenScanner={() => {
              setOrderScanTarget(order === editingOrder ? "edit" : "create");
              setOrderScanOpen(true);
            }}
          />
        </FormGridFull>
        <FormGridFull>
          <OrderTotals order={order} />
        </FormGridFull>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Поръчки"
        title="Поръчки и продажби"
        subtitle="Тук се правят клиентски поръчки и продажби. За вътрешни заявки между магазин и склад използвай страницата Заявки."
        icon={<ReceiptLongRoundedIcon />}
      />

      <Button 
        variant="contained" 
        size="large"
        startIcon={<AddShoppingCartRoundedIcon />} 
        onClick={openCreateDialog}
        sx={{ alignSelf: "flex-start", py: 1.5 }}
      >
        ➕ НОВА ПРОДАЖБА
      </Button>

      {loading && !orders.length ? <PageLoadingNotice subject="поръчките и продажбите" /> : null}

      <Alert
        severity="info"
        action={
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button color="info" size="small" startIcon={<CompareArrowsRoundedIcon />} onClick={() => navigate("/transfers?openCreateTransfer=1&requestType=warehouse")}>
              Към склад
            </Button>
            <Button color="info" size="small" startIcon={<CompareArrowsRoundedIcon />} onClick={() => navigate("/transfers?openCreateTransfer=1&requestType=store")}>
              Към друг магазин
            </Button>
            <Button color="info" size="small" startIcon={<ShoppingCartCheckoutRoundedIcon />} onClick={() => navigate("/supplier-orders") }>
              Към доставчик
            </Button>
          </Stack>
        }
      >
        Клиентски поръчки и продажби се създават тук. Ако магазин или склад иска стока от друг обект, използвай „Заявки“.
      </Alert>

      <DataSection
        title="Регистър на поръчки и продажби"
        subtitle="Последни клиентски поръчки и продажби"
        icon={<ReceiptLongRoundedIcon />}
        toolbar={
          <Stack spacing={1.25} sx={{ width: "100%" }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
              <TextField
                placeholder="Търси по номер, клиент, обект, служител или продукт"
                value={orderQuery}
                onChange={(event) => setOrderQuery(event.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" />
                    </InputAdornment>
                  )
                }}
                sx={{ minWidth: 220, maxWidth: 420 }}
              />
              <TextField select label="Период" value={period} onChange={(event) => setPeriod(event.target.value)} size="small" sx={{ minWidth: 170 }}>
                {Object.entries(orderPeriodLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
              {period === "custom" ? (
                <>
                  <TextField
                    label="От дата"
                    type="date"
                    size="small"
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 150 }}
                  />
                  <TextField
                    label="До дата"
                    type="date"
                    size="small"
                    value={toDate}
                    onChange={(event) => setToDate(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 150 }}
                  />
                </>
              ) : null}
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
                Показани: {filteredOrders.length} / {orders.length}
              </Typography>
              <Chip label={`Оборот: ${formatCurrencyEUR(orderSummary.totalAmount)}`} size="small" color="success" variant="outlined" />
              <Chip label={`ДДС: ${formatCurrencyEUR(orderSummary.vatAmount)}`} size="small" color="info" variant="outlined" />
              {selectedOrderIds.length ? <Chip label={`Избрани: ${selectedOrderIds.length}`} color="warning" size="small" /> : null}
            </Stack>
          </Stack>
        }
        actions={
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="contained" startIcon={<AddShoppingCartRoundedIcon />} onClick={openCreateDialog}>
              Нова поръчка
            </Button>
            <Button variant="outlined" startIcon={<CompareArrowsRoundedIcon />} onClick={() => navigate("/transfers?openCreateTransfer=1&requestType=warehouse")}>
              Заявка към склад
            </Button>
            <Button variant="outlined" startIcon={<CompareArrowsRoundedIcon />} onClick={() => navigate("/transfers?openCreateTransfer=1&requestType=store")}>
              Заявка към друг магазин
            </Button>
            {canSeeOrderAuthor ? (
              <Button
                color="error"
                variant="outlined"
                startIcon={<DeleteRoundedIcon />}
                disabled={!selectedOrderIds.length}
                onClick={() => setBulkDeleteOpen(true)}
              >
                Изтрий избраните
              </Button>
            ) : null}
          </Stack>
        }
      >
        <ResponsiveTable>
          <DataGrid
            loading={loading}
            getRowHeight={() => "auto"}
            columnHeaderHeight={44}
            rows={filteredOrders}
            getRowId={(row) => row._id}
            columns={orderColumns}
            checkboxSelection={canSeeOrderAuthor}
            rowSelectionModel={selectedOrderIds}
            onRowSelectionModelChange={(nextSelection) => setSelectedOrderIds(nextSelection)}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="lg" fullScreen={isMobile}>
        <DialogTitle>Нова поръчка</DialogTitle>
        <DialogContent dividers>{renderSharedOrderFields(form, setForm, scanCode, setScanCode, scanFieldRef)}</DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setOpen(false)} onConfirm={handleCreate} />
      </Dialog>

      <BarcodeScannerDialog
        open={orderScanOpen}
        onClose={() => setOrderScanOpen(false)}
        onDetected={handleOrderScannerDetected}
        onError={() => setOrderScanOpen(false)}
        title="Сканирай продукт за поръчката"
      />

      <Dialog open={Boolean(editingOrder)} onClose={() => setEditingOrder(null)} fullWidth maxWidth="lg" fullScreen={isMobile}>
        <DialogTitle>Редактиране на поръчка</DialogTitle>
        <DialogContent dividers>{editingOrder ? renderSharedOrderFields(editingOrder, setEditingOrder, editScanCode, setEditScanCode, editScanFieldRef) : null}</DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setEditingOrder(null)} onConfirm={handleUpdate} />
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deletingOrder)}
        title="Изтриване на продажба"
        description={`Сигурен ли си, че искаш да изтриеш ${deletingOrder?.orderNumber || "тази продажба"}?`}
        onClose={() => setDeletingOrder(null)}
        onConfirm={handleDelete}
      />

      <ConfirmDeleteDialog
        open={bulkDeleteOpen}
        title="Масово изтриване на продажби"
        description={`Сигурен ли си, че искаш да изтриеш ${selectedOrderIds.length} избрани продажби?`}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
      />
    </Stack>
  );
}
