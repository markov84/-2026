import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import BarcodeScannerDialog from "../components/BarcodeScannerDialog";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import DataSection from "../components/DataSection";
import Dialog from "../components/DraggableDialog";
import DialogFooterActions from "../components/DialogFooterActions";
import { FormGrid, FormGridFull } from "../components/FormGrid";
import GridRowActions from "../components/GridRowActions";
import PageHeader from "../components/PageHeader";
import { ProductIdentity } from "../components/ProductPresentation";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useBarcodeKeyboardScan } from "../hooks/useBarcodeKeyboardScan";
import { useMobileDetection } from "../hooks/useMobileDetection";
import api from "../lib/api";
import { formatCurrencyEUR } from "../lib/currency";
import { exportTransferPdf, printTransfer } from "../lib/printDocuments";
import { findProductByScanCode, parseScannedInput } from "../lib/scanCode";

let transferItemKey = 0;
const defaultTransferItemRows = 1;

function createTransferItemKey() {
  transferItemKey += 1;
  return globalThis.crypto?.randomUUID?.() || `transfer-item-${Date.now()}-${transferItemKey}`;
}

function createTransferItem(overrides = {}) {
  return {
    key: createTransferItemKey(),
    product: "",
    quantity: "",
    ...overrides
  };
}

function createTransferItems(count = defaultTransferItemRows) {
  return Array.from({ length: count }, () => createTransferItem());
}

function createInitialTransfer() {
  return {
    transferNumber: "Генерира се автоматично",
    fromStore: "",
    toStore: "",
    requestedBy: "",
    notes: "",
    status: "pending",
    items: createTransferItems()
  };
}

function normalizeTransferItems(items = []) {
  const normalizedItems = items.map((item) =>
    createTransferItem({
      product: item.product?._id || item.product || "",
      quantity: String(item.quantity ?? 1)
    })
  );

  return [...normalizedItems, ...createTransferItems(Math.max(0, defaultTransferItemRows - normalizedItems.length))];
}

function getCleanItems(transfer) {
  return (transfer?.items || [])
    .map((item) => ({
      product: item.product,
      quantity: Number(item.quantity || 0)
    }))
    .filter((item) => item.product && item.quantity > 0);
}

function validateTransfer(transfer) {
  if (!transfer?.requestedBy?.trim()) return "Полето „Заявил“ е задължително.";
  if (!transfer?.fromStore) return "Избери изходен магазин.";
  if (!transfer?.toStore) return "Избери целеви магазин.";
  if (transfer.fromStore === transfer.toStore) return "Изходният и целевият магазин трябва да са различни.";

  const items = transfer?.items || [];
  const filledItems = items.filter((item) => item.product || Number(item.quantity || 0) > 0);
  if (!filledItems.length) return "Добави поне един продукт за трансфер.";

  const selectedProducts = new Set();
  for (const [index, item] of items.entries()) {
    if (!item.product && Number(item.quantity || 0) <= 0) continue;

    const rowNumber = index + 1;
    if (!item.product) return `Избери продукт на ред ${rowNumber}.`;
    if (Number(item.quantity || 0) <= 0) return `Количеството на ред ${rowNumber} трябва да е по-голямо от 0.`;
    if (selectedProducts.has(item.product)) return "Един и същ продукт е добавен повече от веднъж. Обедини количествата в един ред.";
    selectedProducts.add(item.product);
  }

  return "";
}

function getProductOptionLabel(product) {
  if (!product) return "";
  return [product.name, product.productNumber ? `№ ${product.productNumber}` : "", product.sku || product.barcode || "", product.category, product.brand].filter(Boolean).join(" | ");
}

function getTransferItems(transfer) {
  return transfer?.items || [];
}

function getTransferUnitPrice(product) {
  return Number(product?.price || 0);
}

function getTransferVatRate(product) {
  return Number(product?.vatRate ?? 20);
}

function getTransferLineTotals(product, quantity) {
  const unitPrice = getTransferUnitPrice(product);
  const vatRate = getTransferVatRate(product);
  const grossAmount = Number(quantity || 0) * unitPrice;
  const vatDivider = 1 + vatRate / 100;
  const subtotal = vatDivider > 0 ? grossAmount / vatDivider : grossAmount;
  const vatAmount = grossAmount - subtotal;
  return {
    unitPrice,
    vatRate,
    subtotal,
    vatAmount,
    totalAmount: grossAmount
  };
}

function getProductById(products, productId) {
  return products.find((product) => product._id === productId) || null;
}

function getTransferQuantity(transfer) {
  return getTransferItems(transfer)
    .filter((item) => item.product)
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function getTransferTotal(transfer) {
  return getTransferItems(transfer)
    .filter((item) => item.product)
    .reduce((sum, item) => sum + getTransferLineTotals(item.product, item.quantity).totalAmount, 0);
}

function getTransferTotals(transfer) {
  return getTransferItems(transfer)
    .filter((item) => item.product)
    .reduce(
      (totals, item) => {
        const lineTotals = getTransferLineTotals(item.product, item.quantity);
        return {
          subtotal: totals.subtotal + lineTotals.subtotal,
          vatAmount: totals.vatAmount + lineTotals.vatAmount,
          totalAmount: totals.totalAmount + lineTotals.totalAmount
        };
      },
      { subtotal: 0, vatAmount: 0, totalAmount: 0 }
    );
}

function getStoreName(stores, storeId) {
  const store = stores.find((item) => item._id === storeId);
  return store ? `${store.name} | ${store.city}` : "-";
}

function getInventoryForItem(inventory, productId, storeId) {
  return inventory.find((item) => item.product?._id === productId && item.store?._id === storeId);
}

function isTransferItemFilled(item) {
  return Boolean(item?.product || Number(item?.quantity || 0) > 0);
}

function withTrailingTransferRow(items) {
  const nextItems = items.length ? items : createTransferItems();
  const lastItem = nextItems[nextItems.length - 1];
  return isTransferItemFilled(lastItem) ? [...nextItems, createTransferItem()] : nextItems;
}

function upsertTransferProductRow(items, productId) {
  const currentItems = (items || []).filter((item) => item.product || Number(item.quantity || 0) > 0);
  const existingItem = currentItems.find((item) => item.product === productId);

  if (existingItem) {
    return withTrailingTransferRow(
      currentItems.map((item) =>
        item.key === existingItem.key
          ? {
              ...item,
              quantity: String(Number(item.quantity || 0) + 1)
            }
          : item
      )
    );
  }

  return withTrailingTransferRow([...currentItems, createTransferItem({ product: productId, quantity: "1" })]);
}

function buildTransferPayload(transfer) {
  return {
    fromStore: transfer.fromStore,
    toStore: transfer.toStore,
    requestedBy: transfer.requestedBy.trim(),
    notes: transfer.notes.trim() || undefined,
    status: transfer.status,
    items: getCleanItems(transfer)
  };
}

function renderProductInput(params, { label, placeholder = "Пиши име, SKU, категория или марка", product, onClear }) {
  return (
    <TextField
      {...params}
      size="small"
      label={label}
      placeholder={placeholder}
      InputProps={{
        ...params.InputProps,
        endAdornment: (
          <>
            {product ? (
              <IconButton
                aria-label="Премахни избрания продукт"
                size="small"
                edge="end"
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onClear();
                }}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            ) : null}
            {params.InputProps.endAdornment}
          </>
        )
      }}
    />
  );
}

function TransferProductsCell({ items }) {
  return (
    <Box
      sx={{
        width: "100%",
        py: 0.75,
        display: "grid",
        gridTemplateColumns: "minmax(200px, 1fr) 68px 92px 66px 96px 112px",
        gap: 0.75,
        alignItems: "center"
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={900}>Продукт</Typography>
      <Typography variant="caption" color="text.secondary" fontWeight={900} textAlign="right">Бр.</Typography>
      <Typography variant="caption" color="text.secondary" fontWeight={900} textAlign="right">Ед. цена</Typography>
      <Typography variant="caption" color="text.secondary" fontWeight={900} textAlign="right">ДДС %</Typography>
      <Typography variant="caption" color="text.secondary" fontWeight={900} textAlign="right">ДДС</Typography>
      <Typography variant="caption" color="text.secondary" fontWeight={900} textAlign="right">Общо с ДДС</Typography>
      {getTransferItems({ items }).map((item, index) => {
        const quantity = Number(item.quantity || 0);
        const lineTotals = getTransferLineTotals(item.product, quantity);

        return (
          <Box key={`${item.product?._id || index}-${index}`} sx={{ display: "contents" }}>
            <Box sx={{ minWidth: 0 }}>
              <ProductIdentity compact product={item.product} />
            </Box>
            <Typography variant="body2" textAlign="right" fontWeight={800}>{quantity}</Typography>
            <Typography variant="body2" textAlign="right">{formatCurrencyEUR(lineTotals.unitPrice)}</Typography>
            <Typography variant="body2" textAlign="right">{lineTotals.vatRate}%</Typography>
            <Typography variant="body2" textAlign="right">{formatCurrencyEUR(lineTotals.vatAmount)}</Typography>
            <Typography variant="body2" textAlign="right" fontWeight={900}>{formatCurrencyEUR(lineTotals.totalAmount)}</Typography>
          </Box>
        );
      })}
    </Box>
  );
}

function TransferItemsEditor({ value, products, inventory, fromStore, onChange, onScanClick }) {
  const items = value?.length ? value : createTransferItems();

  function updateItem(key, patch) {
    onChange(withTrailingTransferRow(items.map((item) => (item.key === key ? { ...item, ...patch } : item))));
  }

  function removeItem(key) {
    const nextItems = items.filter((item) => item.key !== key);
    onChange(nextItems.length ? nextItems : createTransferItems());
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Typography variant="subtitle2" fontWeight={900}>
          Продукти за трансфер
        </Typography>
        {onScanClick && (
          <IconButton size="small" onClick={onScanClick} title="Сканирай баркод" color="info">
            <QrCodeScannerRoundedIcon />
          </IconButton>
        )}
      </Stack>

      <TableContainer
        sx={{
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
          },
          "& .MuiInputBase-root": {
            minHeight: 30
          },
          "& .MuiInputBase-input": {
            py: 0.3,
            px: 0.7,
            fontSize: 13
          }
        }}
      >
        <Table size="small" sx={{ minWidth: 728, tableLayout: "fixed" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 28, fontWeight: 900 }}>№</TableCell>
              <TableCell sx={{ width: 260, fontWeight: 900 }}>Продукт</TableCell>
              <TableCell align="right" sx={{ width: 76, fontWeight: 900 }}>Бройки</TableCell>
              <TableCell align="right" sx={{ width: 84, fontWeight: 900 }}>Ед. цена</TableCell>
              <TableCell align="right" sx={{ width: 62, fontWeight: 900 }}>ДДС %</TableCell>
              <TableCell align="right" sx={{ width: 92, fontWeight: 900 }}>ДДС</TableCell>
              <TableCell align="right" sx={{ width: 108, fontWeight: 900 }}>Общо с ДДС</TableCell>
              <TableCell align="right" sx={{ width: 86, fontWeight: 900 }}>Наличност</TableCell>
              <TableCell align="center" sx={{ width: 34, fontWeight: 900 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => {
              const selectedProduct = getProductById(products, item.product);
              const sourceInventory = getInventoryForItem(inventory, item.product, fromStore);
              const quantity = Number(item.quantity || 0);
              const lineTotals = getTransferLineTotals(selectedProduct, quantity);
              const hasLowStockRisk = sourceInventory && quantity > Number(sourceInventory.quantity || 0);

              return (
                <TableRow key={item.key} sx={{ bgcolor: hasLowStockRisk ? "rgba(183,138,77,0.08)" : "inherit" }}>
                  <TableCell>
                    <Typography variant="caption" fontWeight={900} color="text.secondary">
                      {index + 1}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      options={Array.isArray(products) ? products : []}
                      value={selectedProduct}
                      onChange={(_, product) =>
                        updateItem(item.key, {
                          product: product?._id || "",
                          quantity: product ? item.quantity || "1" : ""
                        })
                      }
                      clearOnEscape
                      openOnFocus
                      autoHighlight
                      selectOnFocus
                      handleHomeEndKeys
                      getOptionLabel={getProductOptionLabel}
                      isOptionEqualToValue={(option, selectedValue) => option?._id === selectedValue?._id}
                      renderInput={(params) =>
                        renderProductInput(params, {
                          label: "",
                          placeholder: `Продукт ${index + 1}`,
                          product: selectedProduct,
                          onClear: () => updateItem(item.key, { product: "", quantity: "" })
                        })
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={item.quantity}
                      onChange={(event) => updateItem(item.key, { quantity: event.target.value })}
                      inputProps={{ min: 1 }}
                      sx={{ width: 62 }}
                      aria-label="Бройки"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={800} noWrap>
                      {selectedProduct ? formatCurrencyEUR(lineTotals.unitPrice) : "-"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={800} noWrap>
                      {selectedProduct ? `${lineTotals.vatRate}%` : "-"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" noWrap>
                      {selectedProduct ? formatCurrencyEUR(lineTotals.vatAmount) : "-"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={900} color="primary.main" noWrap>
                      {selectedProduct ? formatCurrencyEUR(lineTotals.totalAmount) : "-"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color={hasLowStockRisk || !sourceInventory ? "warning.main" : "text.primary"} fontWeight={800} noWrap>
                      {sourceInventory ? `${sourceInventory.quantity} бр.` : "-"}
                    </Typography>
                    {hasLowStockRisk ? (
                      <Typography variant="caption" color="warning.main" fontWeight={800} sx={{ display: "block", lineHeight: 1.1 }}>
                        над наличното
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Премахни ред">
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
    </Stack>
  );
}

function TransferTotals({ transfer, products, inventory, stores }) {
  const enrichedItems = getTransferItems(transfer)
    .filter((item) => item.product)
    .map((item) => ({
      ...item,
      productData: products.find((product) => product._id === item.product)
    }));
  const totalQuantity = enrichedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totals = enrichedItems.reduce(
    (acc, item) => {
      const lineTotals = getTransferLineTotals(item.productData, Number(item.quantity || 0));
      return {
        subtotal: acc.subtotal + lineTotals.subtotal,
        vatAmount: acc.vatAmount + lineTotals.vatAmount,
        totalAmount: acc.totalAmount + lineTotals.totalAmount
      };
    },
    { subtotal: 0, vatAmount: 0, totalAmount: 0 }
  );

  const lowStockRows = enrichedItems.filter((item) => {
    const sourceInventory = getInventoryForItem(inventory, item.product, transfer.fromStore);
    return sourceInventory && Number(item.quantity || 0) > Number(sourceInventory.quantity || 0);
  }).length;

  return (
    <Stack
      spacing={0.55}
      sx={{
        p: 1.5,
        border: "1px solid",
        borderColor: lowStockRows ? "warning.main" : "divider",
        borderRadius: 2,
        bgcolor: lowStockRows ? "rgba(183,138,77,0.08)" : "background.paper"
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} justifyContent="space-between" alignItems={{ md: "flex-start" }}>
        <Stack direction="row" spacing={2} sx={{ minWidth: 0 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>Редове</Typography>
            <Typography variant="h6" sx={{ lineHeight: 1.1 }}>{enrichedItems.length}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>Общо бройки</Typography>
            <Typography variant="h6" sx={{ lineHeight: 1.1 }}>{totalQuantity || 0} бр.</Typography>
          </Box>
        </Stack>
        <Stack spacing={0.25} sx={{ width: { xs: "100%", md: 270 }, ml: { md: "auto" }, alignItems: "flex-start" }}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>Сума без ДДС</Typography>
            <Typography variant="h6" sx={{ lineHeight: 1.05 }}>{formatCurrencyEUR(totals.subtotal)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>ДДС</Typography>
            <Typography variant="h6" sx={{ lineHeight: 1.05 }}>{formatCurrencyEUR(totals.vatAmount)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>Общо с ДДС</Typography>
            <Typography variant="h6" color="primary.main" sx={{ lineHeight: 1.05 }}>{formatCurrencyEUR(totals.totalAmount)}</Typography>
          </Box>
        </Stack>
      </Stack>

      <Divider />

      <Stack spacing={0.5}>
        {lowStockRows ? (
          <Typography variant="body2" color="warning.main" fontWeight={800}>
            {lowStockRows} реда са с количество над наличното в изходния магазин.
          </Typography>
        ) : null}
        <Typography variant="caption" color="text.secondary">
          {getStoreName(stores, transfer.fromStore)} {"->"} {getStoreName(stores, transfer.toStore)}
        </Typography>
      </Stack>
    </Stack>
  );
}

export default function TransfersPageStable() {
  const { data: transfers, loading, setData } = useFetch("/transfers");
  const { data: stores } = useFetch("/stores");
  const { data: products } = useFetch("/products");
  const { data: inventory } = useFetch("/inventory/summary");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => createInitialTransfer());
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [deletingTransfer, setDeletingTransfer] = useState(null);
  const [scanCode, setScanCode] = useState("");
  const [scanCameraOpen, setScanCameraOpen] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState("");
  const audioContextRef = useRef(null);
  const isMobile = useMobileDetection();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("openCreateTransfer") !== "1") return;
    setEditingTransfer(null);
    setForm(createInitialTransfer());
    setOpen(true);
    navigate("/transfers", { replace: true });
  }, [location.search, navigate]);

  const rows = useMemo(
    () =>
      transfers.map((transfer) => {
        const totals = getTransferTotals(transfer);
        return {
          ...transfer,
          totalQuantity: getTransferQuantity(transfer),
          subtotal: totals.subtotal,
          vatAmount: totals.vatAmount,
          totalAmount: totals.totalAmount
        };
      }),
    [transfers]
  );

  const selectedTransfer = useMemo(
    () => rows.find((item) => String(item._id) === String(selectedTransferId)) || null,
    [rows, selectedTransferId]
  );

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
        ctx.resume().catch(() => {});
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
      // Ignore audio feedback failures
    }
  }

  const resolveScannedProduct = useCallback(async (rawCode) => {
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
      // Ignore network errors
    }

    return { code, product: null };
  }, [products]);

  async function handleTransferBarcodeDetected(rawCode) {
    if (!open && !editingTransfer) return;

    const { code, product } = await resolveScannedProduct(rawCode);
    if (!code) return;

    if (!product) {
      playScanFeedback("error");
      toast.error(`Няма продукт с баркод/SKU ${code}.`);
      return;
    }

    if (editingTransfer) {
      setEditingTransfer((current) => {
        if (!current) return current;
        return {
          ...current,
          items: upsertTransferProductRow(current.items, product._id)
        };
      });
    } else {
      setForm((current) => ({
        ...current,
        items: upsertTransferProductRow(current.items, product._id)
      }));
    }

    setScanCode("");
    playScanFeedback("success");
    toast.success(`Добавен продукт: ${product.name}`);
    setScanCameraOpen(false);
  }

  useBarcodeKeyboardScan((code) => {
    if (!open && !editingTransfer) return;
    setScanCode(code);
    void handleTransferBarcodeDetected(code);
  });

  async function handleCreate() {
    const validationMessage = validateTransfer(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.post("/transfers", buildTransferPayload(form));
      setData((current) => [response.data, ...current]);
      setForm(createInitialTransfer());
      setOpen(false);
      toast.success("Трансферът е създаден.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно създаване на трансфер.");
    }
  }

  function openEditDialog(transfer) {
    setEditingTransfer({
      _id: transfer._id,
      transferNumber: transfer.transferNumber || "",
      fromStore: transfer.fromStore?._id || "",
      toStore: transfer.toStore?._id || "",
      requestedBy: transfer.requestedBy || "",
      notes: transfer.notes || "",
      status: transfer.status || "pending",
      items: withTrailingTransferRow(normalizeTransferItems(transfer.items))
    });
  }

  async function handleUpdate() {
    if (!editingTransfer?._id) return;

    const validationMessage = validateTransfer(editingTransfer);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.put(`/transfers/${editingTransfer._id}`, {
        transferNumber: editingTransfer.transferNumber.trim(),
        ...buildTransferPayload(editingTransfer)
      });
      setData((current) => current.map((item) => (item._id === editingTransfer._id ? response.data : item)));
      setEditingTransfer(null);
      toast.success("Трансферът е обновен.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешна редакция на трансфер.");
    }
  }

  async function handleDelete() {
    if (!deletingTransfer?._id) return;

    try {
      await api.delete(`/transfers/${deletingTransfer._id}`);
      setData((current) => current.filter((item) => item._id !== deletingTransfer._id));
      setDeletingTransfer(null);
      toast.success("Трансферът е изтрит.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно изтриване на трансфер.");
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader eyebrow="Заявки" title="Заявки и трансфери между обекти" subtitle="Тук магазините и складът заявяват стока един към друг и подготвят документ за движение." icon={<CompareArrowsRoundedIcon />} />

      <DataSection title="Регистър на заявки и трансфери" subtitle="Вътрешни заявки за движение на стока между магазин и склад" icon={<CompareArrowsRoundedIcon />} actions={<Button variant="contained" startIcon={<CompareArrowsRoundedIcon />} onClick={() => setOpen(true)}>Нова заявка / трансфер</Button>}>
        {selectedTransfer ? (
          <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 2, border: "1px solid rgba(39,86,107,0.14)", bgcolor: "rgba(39,86,107,0.04)" }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} justifyContent="space-between" alignItems={{ md: "center" }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={900}>
                  Избран трансфер: {selectedTransfer.transferNumber || "-"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedTransfer.fromStore?.name || "-"} {"->"} {selectedTransfer.toStore?.name || "-"} | {selectedTransfer.totalQuantity || 0} бр. | {formatCurrencyEUR(selectedTransfer.totalAmount || 0)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Button variant="outlined" color="secondary" onClick={() => printTransfer(selectedTransfer)}>
                  Документ
                </Button>
                <Button variant="outlined" onClick={() => void exportTransferPdf(selectedTransfer)}>
                  PDF
                </Button>
                <Button variant="outlined" onClick={() => openEditDialog(selectedTransfer)}>
                  Редактирай
                </Button>
                <Button variant="outlined" color="error" onClick={() => setDeletingTransfer(selectedTransfer)}>
                  Изтрий
                </Button>
              </Stack>
            </Stack>
          </Box>
        ) : null}
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            getRowHeight={() => "auto"}
            columnHeaderHeight={44}
            rows={rows}
            getRowId={(row) => row._id}
            rowSelectionModel={selectedTransferId ? [selectedTransferId] : []}
            onRowSelectionModelChange={(nextSelection) => setSelectedTransferId(String(nextSelection?.[0] || ""))}
            onRowClick={(params) => setSelectedTransferId(String(params.row._id))}
            columns={[
              { field: "transferNumber", headerName: "Трансфер", flex: 0.75, minWidth: 120 },
              { field: "fromStore", headerName: "От", flex: 0.75, minWidth: 120, valueGetter: (_, row) => row.fromStore?.name || "-" },
              { field: "toStore", headerName: "Към", flex: 0.75, minWidth: 120, valueGetter: (_, row) => row.toStore?.name || "-" },
              { field: "products", headerName: "Продукти", flex: 2.8, minWidth: 560, sortable: false, renderCell: (params) => <TransferProductsCell items={params?.row?.items || []} /> },
              { field: "totalQuantity", headerName: "Бройки", flex: 0.5, minWidth: 90 },
              { field: "subtotal", headerName: "Без ДДС", flex: 0.7, minWidth: 115, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) },
              { field: "vatAmount", headerName: "ДДС", flex: 0.6, minWidth: 105, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) },
              { field: "totalAmount", headerName: "Общо с ДДС", flex: 0.8, minWidth: 130, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) },
              { field: "status", headerName: "Статус", flex: 0.65, minWidth: 105, renderCell: (params) => <Chip label={params?.value || "-"} size="small" color={params?.value === "completed" ? "success" : "warning"} /> },
              { field: "requestedBy", headerName: "Заявил", flex: 0.75, minWidth: 120 },
              { field: "actions", headerName: "", sortable: false, filterable: false, width: 150, align: "center", renderCell: (params) => <GridRowActions onPrint={() => printTransfer(params.row)} onEdit={() => openEditDialog(params.row)} onDelete={() => setDeletingTransfer(params.row)} printLabel="Документ" /> }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>Нова заявка / трансфер</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <FormGrid min={230}>
              <TextField label="Номер на трансфер" value={form.transferNumber} disabled />
              <TextField label="Заявил" value={form.requestedBy} onChange={(e) => setForm({ ...form, requestedBy: e.target.value })} />
              <TextField select label="От магазин" value={form.fromStore} onChange={(e) => setForm({ ...form, fromStore: e.target.value })}>{stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}</TextField>
              <TextField select label="Към магазин" value={form.toStore} onChange={(e) => setForm({ ...form, toStore: e.target.value })}>{stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}</TextField>
            </FormGrid>
            <FormGridFull>
              <TransferItemsEditor value={form.items} products={products} inventory={inventory} fromStore={form.fromStore} onChange={(items) => setForm((current) => ({ ...current, items }))} onScanClick={() => setScanCameraOpen(true)} />
            </FormGridFull>
            <FormGridFull>
              <TransferTotals transfer={form} products={products} inventory={inventory} stores={stores} />
            </FormGridFull>
            <FormGridFull>
              <TextField fullWidth multiline minRows={3} label="Бележки към трансфера" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </FormGridFull>
          </Stack>
        </DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setOpen(false)} onConfirm={handleCreate} />
      </Dialog>

      <Dialog open={Boolean(editingTransfer)} onClose={() => setEditingTransfer(null)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>Редактиране на трансфер</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <FormGrid min={230}>
              <TextField label="Номер на трансфер" value={editingTransfer?.transferNumber || ""} onChange={(e) => setEditingTransfer((current) => ({ ...current, transferNumber: e.target.value }))} />
              <TextField label="Заявил" value={editingTransfer?.requestedBy || ""} onChange={(e) => setEditingTransfer((current) => ({ ...current, requestedBy: e.target.value }))} />
              <TextField select label="От магазин" value={editingTransfer?.fromStore || ""} onChange={(e) => setEditingTransfer((current) => ({ ...current, fromStore: e.target.value }))}>{stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}</TextField>
              <TextField select label="Към магазин" value={editingTransfer?.toStore || ""} onChange={(e) => setEditingTransfer((current) => ({ ...current, toStore: e.target.value }))}>{stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}</TextField>
              <TextField select label="Статус" value={editingTransfer?.status || "pending"} onChange={(e) => setEditingTransfer((current) => ({ ...current, status: e.target.value }))}>
                <MenuItem value="draft">Чернова</MenuItem>
                <MenuItem value="pending">Чакащ</MenuItem>
                <MenuItem value="in_transit">В транспорт</MenuItem>
                <MenuItem value="completed">Завършен</MenuItem>
                <MenuItem value="cancelled">Отказан</MenuItem>
              </TextField>
            </FormGrid>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Button variant="outlined" color="secondary" onClick={() => printTransfer(editingTransfer)}>
                Документ за трансфера
              </Button>
              <Button variant="outlined" onClick={() => void exportTransferPdf(editingTransfer)}>
                PDF
              </Button>
            </Stack>
            <FormGridFull>
              <TransferItemsEditor
                value={editingTransfer?.items || []}
                products={products}
                inventory={inventory}
                fromStore={editingTransfer?.fromStore || ""}
                onChange={(items) => setEditingTransfer((current) => ({ ...current, items }))}
                onScanClick={() => setScanCameraOpen(true)}
              />
            </FormGridFull>
            <FormGridFull>
              <TransferTotals transfer={editingTransfer || { items: [] }} products={products} inventory={inventory} stores={stores} />
            </FormGridFull>
            <FormGridFull>
              <TextField fullWidth multiline minRows={3} label="Бележки към трансфера" value={editingTransfer?.notes || ""} onChange={(e) => setEditingTransfer((current) => ({ ...current, notes: e.target.value }))} />
            </FormGridFull>
          </Stack>
        </DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setEditingTransfer(null)} onConfirm={handleUpdate} />
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deletingTransfer)}
        title="Изтриване на трансфер"
        description={`Сигурен ли си, че искаш да изтриеш ${deletingTransfer?.transferNumber || "този трансфер"}?`}
        onClose={() => setDeletingTransfer(null)}
        onConfirm={handleDelete}
      />

      <BarcodeScannerDialog
        open={scanCameraOpen}
        onClose={() => setScanCameraOpen(false)}
        onDetected={handleTransferBarcodeDetected}
        onError={() => setScanCameraOpen(false)}
        title="Сканирай продукт за трансфера"
      />
    </Stack>
  );
}
