import { useEffect, useMemo, useRef, useState } from "react";
import AddBoxRoundedIcon from "@mui/icons-material/AddBoxRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";
import { Button, Chip, DialogContent, DialogTitle, InputAdornment, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
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
import { useMobileDetection } from "../hooks/useMobileDetection";
import api from "../lib/api";
import { parseScannedInput } from "../lib/scanCode";

const initialStockForm = { product: "", store: "", quantity: "1", reorderLevel: "5" };

function validateInventoryPayload(payload) {
  if (!payload.product) return "Избери продукт.";
  if (!payload.store) return "Избери магазин.";
  if (!Number.isInteger(Number(payload.quantity)) || Number(payload.quantity) < 0) return "Количеството трябва да е цяло число 0 или повече.";
  if (!Number.isInteger(Number(payload.reorderLevel)) || Number(payload.reorderLevel) < 0) return "Минималната наличност трябва да е цяло число 0 или повече.";
  return null;
}

function findProductByScanCode(products, code) {
  const normalized = parseScannedInput(code).toLowerCase();
  if (!normalized) return null;

  return (products || []).find((product) =>
    [product.productNumber, product.barcode, product.sku]
      .filter(Boolean)
      .some((value) => String(value).trim().toLowerCase() === normalized)
  );
}

export default function InventoryPageReady() {
  const { data, loading, setData } = useFetch("/inventory/summary");
  const { data: products, refresh: refreshProducts } = useFetch("/products?compact=1");
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
  const isMobile = useMobileDetection();
  const scannedProduct = useMemo(() => findProductByScanCode(products, scanCode), [products, scanCode]);

  const previewItem = editingItem || form;
  const existingInventory = useMemo(() => data.find((item) => item.product?._id === previewItem.product && item.store?._id === previewItem.store), [data, previewItem.product, previewItem.store]);

  useEffect(() => {
    refreshProducts();
    const handleFocus = () => refreshProducts();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshProducts]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scanParam = params.get("scan");
    if (scanParam === "1" || scanParam?.toLowerCase() === "true") {
      setOpen(true);
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

  function applyScannedProduct(rawCode = scanCode) {
    const code = parseScannedInput(rawCode);
    if (!code) return;

    const product = findProductByScanCode(products, code);
    if (!product) {
      toast.error(`Няма продукт с баркод/SKU ${code}.`);
      return;
    }

    setForm((current) => ({ ...current, product: product._id, quantity: current.quantity || "1" }));
    setScanCode("");
    toast.success(`Продуктът ${product.name} е готов за добавяне.`);
  }

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
              { field: "storeName", headerName: "Магазин", flex: 0.8, minWidth: 120, valueGetter: (_, row) => row.store?.name },
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
                {products.map((product) => <MenuItem key={product._id} value={product._id}>{product.name} | {product.sku}</MenuItem>)}
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
          applyScannedProduct(code);
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
              {products.map((product) => <MenuItem key={product._id} value={product._id}>{product.name}</MenuItem>)}
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
