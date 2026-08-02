import { useEffect, useMemo, useRef, useState } from "react";
import AddBoxRoundedIcon from "@mui/icons-material/AddBoxRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";
import { Box, Button, Chip, DialogContent, DialogTitle, InputAdornment, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import BarcodeScannerDialog from "../components/BarcodeScannerDialog";
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
import { findProductByScanCode, parseScannedInput } from "../lib/scanCode";

const initialStockForm = { product: "", store: "", quantity: "1", reorderLevel: "5" };

function validateInventoryPayload(payload) {
  if (!payload.product) return "Избери продукт.";
  if (!payload.store) return "Избери магазин.";
  if (!Number.isInteger(Number(payload.quantity)) || Number(payload.quantity) < 0) return "Количеството трябва да е цяло число 0 или повече.";
  if (!Number.isInteger(Number(payload.reorderLevel)) || Number(payload.reorderLevel) < 0) return "Минималната наличност трябва да е цяло число 0 или повече.";
  return null;
}

export default function InventoryPageReady() {
  const { data, loading, setData } = useFetch("/inventory/summary");
  const { data: products, refresh: refreshProducts } = useFetch("/products");
  const { data: stores } = useFetch("/stores");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialStockForm);
  const [scanCode, setScanCode] = useState("");
  const [scanCameraOpen, setScanCameraOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [query, setQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const scanFieldRef = useRef(null);
  const audioContextRef = useRef(null);
  const scannerBufferRef = useRef("");
  const scannerLastKeyAtRef = useRef(0);
  const isMobile = useMobileDetection();
  const productsById = useMemo(
    () => new Map((Array.isArray(products) ? products : []).map((product) => [product?._id, product])),
    [products]
  );
  const scannedProduct = useMemo(() => findProductByScanCode(products, scanCode), [products, scanCode]);

  function getStoreDisplayLabel(store) {
    if (!store) return "-";
    return [store.name, store.code, store.city, store.address]
      .filter(Boolean)
      .join(" | ");
  }

  const scannedProductInventoryRows = useMemo(
    () =>
      scannedProduct?._id
        ? data.filter((item) => item.product?._id === scannedProduct._id)
        : [],
    [data, scannedProduct]
  );
  const scannedProductSummary = useMemo(() => {
    const storeCount = new Set(scannedProductInventoryRows.map((item) => item.store?._id).filter(Boolean)).size;
    const totalQuantity = scannedProductInventoryRows.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    return { storeCount, totalQuantity };
  }, [scannedProductInventoryRows]);
  const scannedProductStoreLabels = useMemo(
    () => Array.from(new Set(scannedProductInventoryRows.map((item) => getStoreDisplayLabel(item.store)).filter(Boolean))),
    [scannedProductInventoryRows]
  );

  const getResolvedProduct = (row) => {
    const rowProduct = row?.product;
    const productId = rowProduct?._id || rowProduct;
    return productsById.get(productId) || rowProduct || null;
  };

  const previewItem = editingItem || form;
  const existingInventory = useMemo(() => data.find((item) => item.product?._id === previewItem.product && item.store?._id === previewItem.store), [data, previewItem.product, previewItem.store]);

  // Automatic refresh disabled to prevent infinite loops
  // Manual refresh available via refreshProducts() if needed

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scanParam = params.get("scan");
    if (scanParam === "1" || scanParam?.toLowerCase() === "true") {
      const timer = window.setTimeout(() => scanFieldRef.current?.focus(), 120);
      params.delete("scan");
      window.history.replaceState({}, document.title, `${window.location.pathname}?${params.toString()}`);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, []);
  const filteredInventory = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return data.filter((item) => {
      const matchesStore = storeFilter === "all" || item.store?._id === storeFilter;
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "low" && item.isLowStock) ||
        (stockFilter === "normal" && !item.isLowStock);

      if (!matchesStore || !matchesStock) return false;
      if (!normalizedQuery) return true;

      return [
        item.product?.name,
        item.product?.sku,
        item.product?.category,
        item.product?.brand,
        item.store?.name,
        item.store?.code,
        item.store?.city,
        item.quantity,
        item.reorderLevel
      ]
        .filter((value) => value !== undefined && value !== null)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [data, query, stockFilter, storeFilter]);

  function buildRow(responseData, productId, storeId) {
    const populatedProduct = products.find((product) => product._id === productId);
    const populatedStore = stores.find((store) => store._id === storeId);
    return {
      ...responseData,
      product: populatedProduct,
      store: populatedStore,
      isLowStock:
        Number(responseData.quantity || 0) <=
        Math.max(Number(responseData.reorderLevel || 0), Number(populatedProduct?.lowStockThreshold || 0))
    };
  }

  async function handleCreate() {
    const validationMessage = validateInventoryPayload(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.post("/inventory/summary", {
        product: form.product,
        store: form.store,
        quantity: Number(form.quantity || 0),
        reorderLevel: Number(form.reorderLevel || 0),
        mode: "increment"
      });
      const nextRow = buildRow(response.data, form.product, form.store);
      setData((current) => {
        const hasExisting = current.some((item) => item.product?._id === form.product && item.store?._id === form.store);
        if (!hasExisting) return [nextRow, ...current];
        return current.map((item) => (item.product?._id === form.product && item.store?._id === form.store ? nextRow : item));
      });
      setForm(initialStockForm);
      setOpen(false);
      toast.success("Наличността е добавена.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно добавяне на наличност.");
    }
  }

  function openEditDialog(item) {
    setEditingItem({
      _id: item._id,
      product: item.product?._id || "",
      store: item.store?._id || "",
      quantity: String(item.quantity ?? 0),
      reorderLevel: String(item.reorderLevel ?? 0)
    });
  }

  async function handleUpdate() {
    if (!editingItem?._id) return;
    const validationMessage = validateInventoryPayload(editingItem);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.post("/inventory/summary", {
        product: editingItem.product,
        store: editingItem.store,
        quantity: Number(editingItem.quantity || 0),
        reorderLevel: Number(editingItem.reorderLevel || 0),
        mode: "replace"
      });
      const nextRow = buildRow(response.data, editingItem.product, editingItem.store);
      setData((current) => current.map((item) => (item._id === editingItem._id ? nextRow : item)));
      setEditingItem(null);
      toast.success("Наличността е обновена.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешна редакция на наличност.");
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

  const resolveScannedProduct = async (rawCode) => {
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
  };

  async function applyScannedProduct(rawCode = scanCode) {
    const { code, product } = await resolveScannedProduct(rawCode);
    if (!code) return;

    if (!product) {
      playScanFeedback("error");
      toast.error(`Няма продукт с баркод/SKU ${code}.`);
      return;
    }

    playScanFeedback("success");
    toast.success(`Сканиран продукт: ${product.name}`);
  }

  useEffect(() => {
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
        if (typingTarget) return;
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

        setScanCode(rawCode);
        void applyScannedProduct(rawCode);
        event.preventDefault();
        return;
      }

      if (typingTarget) return;
    }

    window.addEventListener("keydown", onWindowKeyDown, true);
    return () => window.removeEventListener("keydown", onWindowKeyDown, true);
  }, [open, scanCode, products, stores]);

  async function quickAddScannedProduct() {
    const productId = form.product || (findProductByScanCode(products, scanCode) || {})._id;
    if (!productId) {
      toast.error("Избери или сканирай продукт.");
      return;
    }

    const storeId = form.store || (stores && stores.length === 1 ? stores[0]._id : "");
    if (!storeId) {
      toast.error("Избери магазин преди бързо добавяне.");
      return;
    }

    const quantity = Number(form.quantity || 1);

    try {
      const response = await api.post("/inventory/summary", {
        product: productId,
        store: storeId,
        quantity: quantity,
        reorderLevel: Number(form.reorderLevel || 0),
        mode: "increment"
      });
      const nextRow = buildRow(response.data, productId, storeId);
      setData((current) => {
        const hasExisting = current.some((item) => item.product?._id === productId && item.store?._id === storeId);
        if (!hasExisting) return [nextRow, ...current];
        return current.map((item) => (item.product?._id === productId && item.store?._id === storeId ? nextRow : item));
      });
      setForm(initialStockForm);
      setScanCode("");
      setOpen(false);
      toast.success("Наличността е добавена.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно добавяне на наличност.");
    }
  }

  async function handleDelete() {
    if (!deletingItem?._id) return;

    try {
      await api.delete(`/inventory/summary/${deletingItem._id}`);
      setData((current) => current.filter((item) => item._id !== deletingItem._id));
      setDeletingItem(null);
      toast.success("Наличността е изтрита.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно изтриване на наличност.");
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader eyebrow="Наличности" title="Складови нива" subtitle="Добавяй, редактирай и изтривай наличности по обекти." icon={<WarehouseRoundedIcon />} />

      {loading && !data.length ? <PageLoadingNotice subject="наличностите" /> : null}

      <DataSection
        title="Наличности по обекти"
        subtitle="Редакция и триене на всеки ред"
        icon={<WarehouseRoundedIcon />}
        actions={<Button variant="contained" startIcon={<AddBoxRoundedIcon />} onClick={() => setOpen(true)}>Добави наличност</Button>}
        toolbar={
          <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} alignItems={{ xs: "stretch", lg: "center" }}>
            <TextField
              placeholder="Търси продукт, SKU, магазин, категория или марка"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
              sx={{ maxWidth: { xs: "100%", lg: 420 } }}
            />
            <TextField select label="Магазин" value={storeFilter} onChange={(event) => setStoreFilter(event.target.value)} sx={{ minWidth: { xs: "100%", sm: 190 } }}>
              <MenuItem value="all">Всички магазини</MenuItem>
              {stores.map((store) => (
                <MenuItem key={store._id} value={store._id}>
                  {store.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Статус" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} sx={{ minWidth: { xs: "100%", sm: 160 } }}>
              <MenuItem value="all">Всички</MenuItem>
              <MenuItem value="low">Ниска наличност</MenuItem>
              <MenuItem value="normal">Нормална</MenuItem>
            </TextField>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label={`Показани: ${filteredInventory.length}`} variant="outlined" />
              <Chip label={`Общо: ${data.length}`} color="secondary" variant="outlined" />
            </Stack>
          </Stack>
        }
      >
        {scannedProduct ? (
          <Box sx={{ mb: 2, p: 2, borderRadius: 2, border: "1px solid", borderColor: "primary.main", bgcolor: "rgba(39,86,107,0.04)" }}>
            <Stack spacing={1.25}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={800}>
                    Сканиран продукт
                  </Typography>
                  <ProductIdentity product={scannedProduct} />
                </Box>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip label={`Обекти: ${scannedProductSummary.storeCount}`} variant="outlined" />
                  <Chip label={`Общо бройки: ${scannedProductSummary.totalQuantity}`} variant="outlined" />
                  <Chip label={`Цена: ${formatCurrencyEUR(Number(scannedProduct.price || 0))}`} color="primary" variant="outlined" />
                </Stack>
              </Stack>

              {scannedProductStoreLabels.length ? (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {scannedProductStoreLabels.map((label) => (
                    <Chip key={label} label={label} color="default" variant="outlined" />
                  ))}
                </Stack>
              ) : null}

              <ResponsiveTable>
                <DataGrid
                  autoHeight
                  rows={scannedProductInventoryRows}
                  getRowId={(row) => row._id}
                  rowHeight={52}
                  columnHeaderHeight={42}
                  columns={[
                    { field: "store", headerName: "Магазин / склад", flex: 1.4, minWidth: 220, valueGetter: (_, row) => getStoreDisplayLabel(row.store) },
                    { field: "quantity", headerName: "Бройки", flex: 0.5, minWidth: 90 },
                    { field: "reorderLevel", headerName: "Мин.", flex: 0.5, minWidth: 90 },
                    { field: "status", headerName: "Статус", flex: 0.7, minWidth: 110, renderCell: (params) => <Chip label={params?.row?.isLowStock ? "Ниска" : "Нормално"} color={params?.row?.isLowStock ? "error" : "success"} size="small" /> }
                  ]}
                  disableRowSelectionOnClick
                />
              </ResponsiveTable>
            </Stack>
          </Box>
        ) : null}

        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rowHeight={56}
            columnHeaderHeight={44}
            rows={filteredInventory}
            getRowId={(row) => row._id}
            columns={[
              { field: "product", headerName: "Продукт", flex: 2, minWidth: 280, renderCell: (params) => <ProductIdentity product={params?.row?.product} /> },
              {
                field: "productCode",
                headerName: "Баркод / QR",
                flex: 1,
                minWidth: 180,
                valueGetter: (_, row) => {
                  const product = getResolvedProduct(row);
                  return product?.barcode || product?.qrCode || product?.productNumber || "-";
                }
              },
              { field: "updatedAt", headerName: "Дата актуализация", flex: 0.85, minWidth: 130, valueFormatter: (params) => formatDate(params?.value ?? params) },
              { field: "storeName", headerName: "Магазин / склад", flex: 1, minWidth: 200, valueGetter: (_, row) => getStoreDisplayLabel(row.store) },
              { field: "quantity", headerName: "Кол.", flex: 0.5, minWidth: 80 },
              { field: "reserved", headerName: "Рез.", flex: 0.5, minWidth: 80 },
              { field: "reorderLevel", headerName: "Мин.", flex: 0.5, minWidth: 80 },
              { field: "status", headerName: "Статус", flex: 0.75, minWidth: 115, renderCell: (params) => <Chip label={params?.row?.isLowStock ? "Ниска" : "Нормално"} color={params?.row?.isLowStock ? "error" : "success"} size="small" /> },
              { field: "actions", headerName: "", sortable: false, filterable: false, width: 110, align: "center", renderCell: (params) => <GridRowActions onEdit={() => openEditDialog(params.row)} onDelete={() => setDeletingItem(params.row)} /> }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>Добави наличност</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <FormGrid min={230}>
              <TextField
                fullWidth
                label="Сканирай продукт"
                value={scanCode}
                inputRef={scanFieldRef}
                onChange={(e) => setScanCode(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyScannedProduct();
                  }
                }}
                helperText="Сканирай баркод или SKU, за да избереш продукт за добавяне."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <QrCodeScannerRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button size="small" onClick={applyScannedProduct}>
                        Приложи
                      </Button>
                    </InputAdornment>
                  )
                }}
              />
              {scannedProduct ? (
                <Box sx={{ p: 1, borderRadius: 2, border: "1px solid rgba(0,0,0,0.08)", bgcolor: "rgba(39,86,107,0.04)" }}>
                  <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                    Открит продукт:
                  </Typography>
                  <ProductIdentity product={scannedProduct} />
                </Box>
              ) : null}
              <TextField select label="Продукт" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
                {products.map((product) => <MenuItem key={product._id} value={product._id}>{product.name} | № {product.productNumber || "-"} | {product.sku}</MenuItem>)}
              </TextField>
              <TextField select label="Магазин" value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })}>
                {stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}
              </TextField>
              <TextField label="Нови бройки" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              <TextField label="Минимална наличност" type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
            </FormGrid>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button variant="outlined" size="small" startIcon={<QrCodeScannerRoundedIcon />} onClick={() => setScanCameraOpen(true)}>
                Сканирай с камера
              </Button>
              <Button variant="contained" size="small" onClick={quickAddScannedProduct} disabled={!form.product && !scanCode}>
                Добави към склад
              </Button>
              <Button size="small" onClick={() => applyScannedProduct()} disabled={!scanCode}>
                Приложи
              </Button>
            </Stack>
            <FormGridFull>
              <Typography variant="body2" fontWeight={700}>
                Наличност след добавяне: {(Number(existingInventory?.quantity || 0) + Number(form.quantity || 0)).toFixed(0)} бр.
              </Typography>
            </FormGridFull>
          </Stack>
        </DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setOpen(false)} onConfirm={handleCreate} />
      </Dialog>

      <BarcodeScannerDialog
        open={scanCameraOpen}
        onClose={() => setScanCameraOpen(false)}
        onDetected={(code) => {
            setScanCode(code);
            void applyScannedProduct(code);
          setScanCameraOpen(false);
        }}
        onError={() => {
          setScanCameraOpen(false);
        }}
      />

      <Dialog open={Boolean(editingItem)} onClose={() => setEditingItem(null)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>Редактиране на наличност</DialogTitle>
        <DialogContent dividers>
          <FormGrid min={230}>
            <TextField select disabled label="Продукт" value={editingItem?.product || ""}>
              {products.map((product) => <MenuItem key={product._id} value={product._id}>{product.name} | № {product.productNumber || "-"}</MenuItem>)}
            </TextField>
            <TextField select disabled label="Магазин" value={editingItem?.store || ""}>
              {stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name}</MenuItem>)}
            </TextField>
            <TextField label="Количество" type="number" value={editingItem?.quantity || "0"} onChange={(e) => setEditingItem((current) => ({ ...current, quantity: e.target.value }))} />
            <TextField label="Минимална наличност" type="number" value={editingItem?.reorderLevel || "0"} onChange={(e) => setEditingItem((current) => ({ ...current, reorderLevel: e.target.value }))} />
          </FormGrid>
        </DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setEditingItem(null)} onConfirm={handleUpdate} />
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deletingItem)}
        title="Изтриване на наличност"
        description={`Сигурен ли си, че искаш да изтриеш наличността за ${deletingItem?.product?.name || "този запис"}?`}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}
