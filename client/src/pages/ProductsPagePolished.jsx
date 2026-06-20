import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import {
  Avatar,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";

import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";

import ConfirmDeleteDialogStable from "../components/ConfirmDeleteDialogStable";
import DataSection from "../components/DataSection";
import DialogFooterActions from "../components/DialogFooterActions";
import { FormGrid, FormGridFull } from "../components/FormGrid";
import GridRowActions from "../components/GridRowActions";
import PageHeader from "../components/PageHeader";
import { ProductIdentity } from "../components/ProductPresentation";
import ResponsiveTable from "../components/ResponsiveTable";

import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";

import BarcodeScannerDialog from "../components/BarcodeScannerDialog";
import { useAuth } from "../providers/AuthProviderStable";

import { formatCurrencyEUR } from "../lib/currency";
import api from "../lib/api";
import { normalizeScanCode, parseScannedInput } from "../lib/scanCode";

const PRODUCT_NAME_SUGGESTIONS_KEY = "productNameSuggestions";
const HIDDEN_PRODUCT_NAME_SUGGESTIONS_KEY = "hiddenProductNameSuggestions";

const initialForm = {
  name: "",
  productNumber: "",
  sku: "",
  category: "",
  brand: "",
  barcode: "",
  description: "",
  imageUrl: "",
  price: "",
  cost: "",
  vatRate: "20",
  lowStockThreshold: "5",
  initialStore: "",
  initialQuantity: "0",
  isActive: true
};

function validateProductForm(form) {
  if (!form.name.trim()) return "Името на продукта е задължително.";
  if (Number.isNaN(Number(form.price)) || Number(form.price) < 0) return "Продажната цена трябва да е число 0 или повече.";
  if (Number.isNaN(Number(form.cost)) || Number(form.cost) < 0) return "Себестойността трябва да е число 0 или повече.";
  if (Number.isNaN(Number(form.vatRate)) || Number(form.vatRate) < 0) return "ДДС трябва да е число 0 или повече.";
  if (!Number.isInteger(Number(form.lowStockThreshold)) || Number(form.lowStockThreshold) < 0) return "Минималната наличност трябва да е цяло число 0 или повече.";
  if (!editingModeInitialStoreGuard(form)) return "Избери начален магазин, когато задаваш начални бройки.";
  return null;
}

function editingModeInitialStoreGuard(form) {
  return !(Number(form.initialQuantity || 0) > 0 && !form.initialStore);
}

function getUniqueSortedValues(items, key) {
  return Array.from(
    new Set(items.map((item) => String(item?.[key] || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
}

function sortProductsNewestFirst(products) {
  return [...products].sort((a, b) => {
    const getTime = (product) => {
      const createdAt = new Date(product.createdAt || 0).getTime();
      if (createdAt) return createdAt;
      const objectIdTime = Number.parseInt(String(product._id || "").slice(0, 8), 16) * 1000;
      return Number.isFinite(objectIdTime) ? objectIdTime : 0;
    };
    const createdAtDiff = getTime(b) - getTime(a);
    if (createdAtDiff) return createdAtDiff;
    return String(b._id || "").localeCompare(String(a._id || ""));
  });
}

function readStoredList(key) {
  if (typeof window === "undefined") return [];

  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function saveStoredList(key, values) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(values));
}

export default function ProductsPagePolished() {
  const { user } = useAuth();
  const { data, loading, setData } = useFetch("/products");
  const { data: stores } = useFetch("/stores");
  const [open, setOpen] = useState(false);
    const location = useLocation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [form, setForm] = useState(initialForm);
  const [savedProductNames, setSavedProductNames] = useState(() => readStoredList(PRODUCT_NAME_SUGGESTIONS_KEY));
  const [hiddenProductNames, setHiddenProductNames] = useState(() => readStoredList(HIDDEN_PRODUCT_NAME_SUGGESTIONS_KEY));
  const [editingProductId, setEditingProductId] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [scanBarcodeOpen, setScanBarcodeOpen] = useState(false);
  const isMobile = useMobileDetection();
  const fileInputRef = useRef(null);
  const canViewCost = ["admin", "manager"].includes(user?.role);

  useEffect(() => {
    const handleFocus = () => {
      window.dispatchEvent(new CustomEvent("productsUpdated"));
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const filteredProducts = useMemo(() => {

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const newProductSku = params.get("newProductSku");
    if (newProductSku) {
      setForm((current) => ({ ...current, sku: newProductSku }));
      setOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.search]);
    const normalized = query.trim().toLowerCase();
    const sortedProducts = sortProductsNewestFirst(data);
    if (!normalized) return sortedProducts;

    return sortedProducts.filter((product) =>
      [product.name, product.productNumber, product.sku, product.category, product.brand, product.barcode, product.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [data, query]);

  const categoryOptions = useMemo(() => getUniqueSortedValues(data, "category"), [data]);
  const brandOptions = useMemo(() => getUniqueSortedValues(data, "brand"), [data]);
  const productNameOptions = useMemo(() => {
    const hidden = new Set(hiddenProductNames.map((name) => name.toLowerCase()));
    return Array.from(
      new Set([...data.map((product) => product.name), ...savedProductNames].map((name) => String(name || "").trim()).filter(Boolean))
    )
      .filter((name) => !hidden.has(name.toLowerCase()))
      .sort((a, b) => a.localeCompare(b));
  }, [data, savedProductNames, hiddenProductNames]);

  useEffect(() => {
    setPaginationModel((current) => ({ ...current, page: 0 }));
  }, [query]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function rememberProductName(name) {
    const trimmed = name.trim();
    if (!trimmed) return;

    setSavedProductNames((current) => {
      const next = [trimmed, ...current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 80);
      saveStoredList(PRODUCT_NAME_SUGGESTIONS_KEY, next);
      return next;
    });
    setHiddenProductNames((current) => {
      const next = current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      saveStoredList(HIDDEN_PRODUCT_NAME_SUGGESTIONS_KEY, next);
      return next;
    });
  }

  function removeProductNameSuggestion(name) {
    const trimmed = name.trim();
    if (!trimmed) return;

    setSavedProductNames((current) => {
      const next = current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      saveStoredList(PRODUCT_NAME_SUGGESTIONS_KEY, next);
      return next;
    });
    setHiddenProductNames((current) => {
      if (current.some((item) => item.toLowerCase() === trimmed.toLowerCase())) return current;
      const next = [...current, trimmed];
      saveStoredList(HIDDEN_PRODUCT_NAME_SUGGESTIONS_KEY, next);
      return next;
    });
  }

  function resetForm() {
    setForm(initialForm);
    setEditingProductId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function openCreateDialog() {
    resetForm();
    setOpen(true);
  }

  async function openEditDialog(product) {
    let editableProduct = product;
    try {
      editableProduct = product.imageUrl ? product : (await api.get(`/products/${product._id}`)).data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно зареждане на продукта.");
      return;
    }

    setEditingProductId(editableProduct._id);
    setForm({
      name: editableProduct.name || "",
      productNumber: editableProduct.productNumber || "",
      sku: editableProduct.sku || "",
      category: editableProduct.category || "",
      brand: editableProduct.brand || "",
      barcode: editableProduct.barcode || "",
      description: editableProduct.description || "",
      imageUrl: editableProduct.imageUrl || "",
      price: String(editableProduct.price ?? ""),
      cost: String(editableProduct.cost ?? ""),
      vatRate: String(editableProduct.vatRate ?? 20),
      lowStockThreshold: String(editableProduct.lowStockThreshold ?? 5),
      initialStore: "",
      initialQuantity: "0",
      isActive: editableProduct.isActive ?? true
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setOpen(true);
  }

  function openDeleteDialog(product) {
    setProductToDelete(product);
    setDeleteOpen(true);
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Избери валиден файл със снимка.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateField("imageUrl", String(reader.result || ""));
      toast.success("Снимката е заредена.");
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    const validationMessage = validateProductForm(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const payload = {
      name: form.name,
      productNumber: form.productNumber,
      sku: form.sku,
      category: form.category,
      brand: form.brand,
      barcode: form.barcode,
      description: form.description,
      imageUrl: form.imageUrl,
      isActive: form.isActive,
      price: Number(form.price || 0),
      cost: Number(form.cost || 0),
      vatRate: Number(form.vatRate || 20),
      lowStockThreshold: Number(form.lowStockThreshold || 0)
    };

    try {
      if (editingProductId) {
        const response = await api.put(`/products/${editingProductId}`, payload);
        setData((current) => current.map((item) => (item._id === editingProductId ? response.data : item)));
        toast.success("Продуктът е обновен.");
      } else {
        const response = await api.post("/products", {
          ...payload,
          initialStore: form.initialStore,
          initialQuantity: Number(form.initialQuantity || 0)
        });
        setData((current) => [response.data, ...current]);
        setPaginationModel((current) => ({ ...current, page: 0 }));
        toast.success("Продуктът е създаден.");
      }

      rememberProductName(form.name);
      resetForm();
      setOpen(false);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          (editingProductId ? "Неуспешно обновяване на продукт." : "Неуспешно създаване на продукт.")
      );
    }
  }

  const existingProductByBarcode = useMemo(() => {
    const normalizedCode = parseScannedInput(form.barcode);
    if (!normalizedCode) return null;

    return data.find((product) =>
      [product.barcode, product.sku, product.productNumber]
        .filter(Boolean)
        .some((value) => normalizeScanCode(value).toLowerCase() === normalizedCode.toLowerCase())
    );
  }, [data, form.barcode]);

  function handleProductBarcodeDetected(code) {
    const normalizedCode = parseScannedInput(code);
    if (!normalizedCode) {
      toast.error("Невалиден баркод или QR код.");
      return;
    }

    updateField("barcode", normalizedCode);
    const duplicateProduct = data.find((product) =>
      [product.barcode, product.sku, product.productNumber]
        .filter(Boolean)
        .some((value) => normalizeScanCode(value).toLowerCase() === normalizedCode.toLowerCase())
    );

    if (duplicateProduct && duplicateProduct._id !== editingProductId) {
      toast.error(`Този баркод вече е записан за продукт '${duplicateProduct.name || duplicateProduct.sku}'.`);
    } else {
      toast.success(`Сканиран баркод: ${normalizedCode}`);
    }

    setScanBarcodeOpen(false);
  }

  async function handleDelete() {
    if (!productToDelete?._id) return;

    try {
      await api.delete(`/products/${productToDelete._id}`);
      setData((current) => current.filter((item) => item._id !== productToDelete._id));
      setDeleteOpen(false);
      setProductToDelete(null);
      toast.success("Продуктът е изтрит.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно изтриване на продукт.");
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Каталог"
        title="Управление на продукти"
        subtitle="Поддържай пълни продуктови профили със снимка, цена, минимална наличност, ДДС и подробно описание."
        icon={<Inventory2RoundedIcon />}
      />

      <DataSection
        title="Продуктов каталог"
        subtitle="Централен регистър с изображения, статус, цени и минимални наличности."
        icon={<Inventory2RoundedIcon />}
        toolbar={
          <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} alignItems={{ xs: "stretch", lg: "center" }}>
            <TextField
              placeholder="Търси по име, SKU, категория, марка, баркод или описание"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
              sx={{ maxWidth: { xs: "100%", lg: 460 } }}
            />
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label={`Показани: ${filteredProducts.length}`} variant="outlined" />
              <Chip label={`Продукти: ${data.length}`} color="secondary" variant="outlined" />
              <Chip label="Снимки от линк или компютър" color="primary" variant="outlined" />
              <Chip label="Редакция и изтриване" color="success" variant="outlined" />
            </Stack>
          </Stack>
        }
        actions={<Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>Нов продукт</Button>}
      >
        <ResponsiveTable>
          <DataGrid
            loading={loading}
            rows={filteredProducts}
            getRowId={(row) => row._id}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            rowHeight={60}
            sx={{
              "& .product-cell": {
                pl: 0.5,
                pr: 0.5
              }
            }}
            columns={[
              {
                field: "product",
                headerName: "Продукт",
                flex: 2.2,
                minWidth: 280,
                cellClassName: "product-cell",
                renderCell: (params) => <ProductIdentity product={params?.row} />
              },
              { field: "category", headerName: "Категория", flex: 0.75, minWidth: 110 },
              { field: "brand", headerName: "Марка", flex: 0.7, minWidth: 100 },
              {
                field: "barcode",
                headerName: "Баркод",
                flex: 0.85,
                minWidth: 140,
                valueGetter: (_, row) => row.barcode || "-"
              },
              { field: "price", headerName: "Продажна цена", flex: 0.75, minWidth: 145, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) },
              ...(canViewCost
                ? [{ field: "cost", headerName: "Себестойност", flex: 0.75, minWidth: 145, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) }]
                : []),
              { field: "lowStockThreshold", headerName: "Мин. наличност", flex: 0.35, minWidth: 72 },
              {
                field: "isActive",
                headerName: "Статус",
                flex: 0.55,
                minWidth: 95,
                renderCell: (params) => <Chip size="small" label={params?.value ? "Активен" : "Скрит"} color={params?.value ? "success" : "default"} />
              },
              {
                field: "actions",
                headerName: "Действия",
                sortable: false,
                filterable: false,
                width: 132,
                minWidth: 132,
                align: "center",
                headerAlign: "center",
                renderCell: (params) => <GridRowActions onEdit={() => openEditDialog(params.row)} onDelete={() => openDeleteDialog(params.row)} />
              },
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => { setOpen(false); resetForm(); }} fullWidth maxWidth="md" fullScreen={isMobile} PaperProps={{ sx: { borderRadius: { xs: 0, sm: 2.5 } } }}>
        <DialogTitle>{editingProductId ? "Редактиране на продукт" : "Нов продукт"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight={800}>Основни данни</Typography>
              <FormGrid min={230}>
                <Autocomplete
                  freeSolo
                  options={Array.isArray(productNameOptions) ? productNameOptions : []}
                  value={form.name}
                  onInputChange={(_, value) => updateField("name", value)}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                      <Typography variant="body2" noWrap>{option}</Typography>
                      <IconButton
                        size="small"
                        aria-label="Премахни предложението"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          removeProductNameSuggestion(option);
                        }}
                      >
                        <CloseRoundedIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                  renderInput={(params) => <TextField {...params} label="Име на продукт" />}
                />
                <TextField
                  label="Номер на продукт"
                  value={form.productNumber}
                  onChange={(e) => updateField("productNumber", e.target.value)}
                  helperText="Например ML-A5151-2. По този номер също може да търсиш и сканираш."
                />
                <TextField
                  label="SKU код"
                  value={form.sku}
                  onChange={(e) => updateField("sku", e.target.value)}
                  helperText="Остави празно за автоматичен код по категория"
                />
                <Autocomplete
                  freeSolo
                  options={Array.isArray(categoryOptions) ? categoryOptions : []}
                  value={form.category}
                  onInputChange={(_, value) => updateField("category", value)}
                  renderInput={(params) => <TextField {...params} label="Категория" />}
                />
                <Autocomplete
                  freeSolo
                  options={Array.isArray(brandOptions) ? brandOptions : []}
                  value={form.brand}
                  onInputChange={(_, value) => updateField("brand", value)}
                  renderInput={(params) => <TextField {...params} label="Марка" />}
                />
                <TextField
                  label="Баркод"
                  value={form.barcode}
                  onChange={(e) => updateField("barcode", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  helperText="Сканирай с баркод четец или въведи ръчно. Кодът трябва да е уникален."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <QrCodeScannerRoundedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button size="small" onClick={() => setScanBarcodeOpen(true)}>
                          Камера
                        </Button>
                      </InputAdornment>
                    )
                  }}
                />
                {existingProductByBarcode ? (
                  <Box sx={{ p: 1.25, borderRadius: 2, border: "1px solid rgba(0,0,0,0.08)", bgcolor: "rgba(39,86,107,0.03)" }}>
                    <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                      Този код вече е записан за продукт:
                    </Typography>
                    <ProductIdentity product={existingProductByBarcode} />
                  </Box>
                ) : null}
                {existingProductByBarcode ? (
                  <Box sx={{ p: 1.25, borderRadius: 2, border: "1px solid rgba(0,0,0,0.08)", bgcolor: "rgba(39,86,107,0.03)" }}>
                    <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                      Този код вече съществува за продукт:
                    </Typography>
                    <ProductIdentity product={existingProductByBarcode} />
                  </Box>
                ) : null}
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minHeight: 56 }}>
                  <Typography variant="body2" fontWeight={700}>Активен продукт</Typography>
                  <Switch checked={form.isActive} onChange={(e) => updateField("isActive", e.target.checked)} />
                </Stack>
              </FormGrid>
            </Stack>

            <Divider />

            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight={800}>Цени и контрол</Typography>
              <FormGrid min={220}>
                <TextField label="Продажна цена" type="number" value={form.price} onChange={(e) => updateField("price", e.target.value)} />
                {canViewCost ? <TextField label="Себестойност" type="number" value={form.cost} onChange={(e) => updateField("cost", e.target.value)} /> : null}
                <TextField label="ДДС %" type="number" value={form.vatRate} onChange={(e) => updateField("vatRate", e.target.value)} />
                <TextField label="Минимална наличност" type="number" value={form.lowStockThreshold} onChange={(e) => updateField("lowStockThreshold", e.target.value)} />
                {editingProductId ? null : (
                  <TextField select label="Начален магазин" value={form.initialStore} onChange={(e) => updateField("initialStore", e.target.value)}>
                    <MenuItem value="">Без начална наличност</MenuItem>
                    {stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}
                  </TextField>
                )}
                {editingProductId ? null : (
                  <TextField label="Начални бройки" type="number" value={form.initialQuantity} onChange={(e) => updateField("initialQuantity", e.target.value)} />
                )}
              </FormGrid>
            </Stack>

            <Divider />

            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight={800}>Снимка</Typography>
              <FormGrid min={240}>
                <TextField
                  label="Онлайн адрес на снимка"
                  placeholder="https://example.com/product.jpg"
                  value={form.imageUrl}
                  onChange={(e) => updateField("imageUrl", e.target.value)}
                />
                <Stack spacing={1}>
                  <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
                  <Button variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={() => fileInputRef.current?.click()}>
                    Качи снимка от компютъра
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Позволен е линк към снимка или локален файл.
                  </Typography>
                </Stack>
              </FormGrid>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ p: 2, border: "1px solid rgba(39,86,107,0.12)", borderRadius: 3 }}>
                <Avatar src={form.imageUrl || undefined} variant="rounded" sx={{ width: 92, height: 92, borderRadius: 2, bgcolor: "rgba(39,86,107,0.08)" }}>
                  {form.name?.[0] || "P"}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={800}>
                    {form.name || "Преглед на продукта"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {form.category || "Категория"} {form.brand ? `| ${form.brand}` : ""}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Цена: {formatCurrencyEUR(form.price)}
                  </Typography>
                </Box>
              </Stack>
            </Stack>

            <Divider />

            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight={800}>Описание</Typography>
              <FormGridFull>
                <TextField multiline minRows={4} label="Детайлно описание" value={form.description} onChange={(e) => updateField("description", e.target.value)} />
              </FormGridFull>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogFooterActions
          isMobile={isMobile}
          onCancel={() => { setOpen(false); resetForm(); }}
          onConfirm={handleSave}
          confirmLabel={editingProductId ? "Запази промените" : "Запази"}
        />
      </Dialog>
      <BarcodeScannerDialog
        open={scanBarcodeOpen}
        onClose={() => setScanBarcodeOpen(false)}
        onDetected={handleProductBarcodeDetected}
        onError={() => setScanBarcodeOpen(false)}
        title="Сканирай баркод за продукта"
      />
      <ConfirmDeleteDialogStable
        open={deleteOpen}
        title="Изтриване на продукт"
        description={`Сигурен ли си, че искаш да изтриеш ${productToDelete?.name || "този продукт"}?`}
        onClose={() => { setDeleteOpen(false); setProductToDelete(null); }}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}
