import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import PageLoadingNotice from "../components/PageLoadingNotice";
import PageHeader from "../components/PageHeader";
import { ProductIdentity } from "../components/ProductPresentation";
import ResponsiveTable from "../components/ResponsiveTable";

import { useFetch } from "../hooks/useFetch";
import { useBarcodeKeyboardScan } from "../hooks/useBarcodeKeyboardScan";
import { useMobileDetection } from "../hooks/useMobileDetection";

import BarcodeScannerDialog from "../components/BarcodeScannerDialog";
import { useAuth } from "../providers/AuthProviderStable";

import { formatCurrencyEUR, formatDate } from "../lib/currency";
import api from "../lib/api";
import {
  getProductLabelCopies,
  getProductLabelCustomHeightMm,
  getProductLabelCustomWidthMm,
  getProductLabelFontScale,
  getProductLabelOffsetXmm,
  getProductLabelOffsetYmm,
  MAX_LABEL_DIMENSION_MM,
  MAX_LABEL_OFFSET_MM,
  MAX_LABEL_SCALE_PERCENT,
  MAX_LABEL_FONT_SCALE_PERCENT,
  MIN_LABEL_DIMENSION_MM,
  MIN_LABEL_FONT_SCALE_PERCENT,
  MIN_LABEL_OFFSET_MM,
  MIN_LABEL_SCALE_PERCENT,
  getProductLabelPaperPreset,
  getProductLabelScale,
  getProductLabelThermalOrientation,
  printProductLabel,
  PRODUCT_LABEL_PAPER_PRESETS,
  PRODUCT_LABEL_THERMAL_ORIENTATIONS,
  setProductLabelCopies,
  setProductLabelCustomHeightMm,
  setProductLabelCustomWidthMm,
  setProductLabelFontScale,
  setProductLabelOffsetXmm,
  setProductLabelOffsetYmm,
  setProductLabelPaperPreset,
  setProductLabelScale,
  setProductLabelThermalOrientation
} from "../lib/printDocuments";
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

function getPresetLabelSizeMm(presetId, customWidthMm, customHeightMm) {
  const preset = PRODUCT_LABEL_PAPER_PRESETS.find((item) => item.id === presetId) || PRODUCT_LABEL_PAPER_PRESETS[0];
  if (preset?.kind === "thermal-custom") {
    return {
      widthMm: Math.min(MAX_LABEL_DIMENSION_MM, Math.max(MIN_LABEL_DIMENSION_MM, Number(customWidthMm) || 60)),
      heightMm: Math.min(MAX_LABEL_DIMENSION_MM, Math.max(MIN_LABEL_DIMENSION_MM, Number(customHeightMm) || 40)),
      kind: "thermal-custom"
    };
  }
  if (preset?.kind === "thermal") {
    return {
      widthMm: Number(preset.widthMm) || 60,
      heightMm: Number(preset.heightMm) || 40,
      kind: "thermal"
    };
  }

  return {
    widthMm: 63.5,
    heightMm: 33.9,
    kind: "a4"
  };
}

function getPreviewPageSizeMm(widthMm, heightMm, orientation) {
  const longSideMm = Math.max(widthMm, heightMm);
  const shortSideMm = Math.min(widthMm, heightMm);
  if (orientation === "long-edge") {
    return { pageWidthMm: longSideMm, pageHeightMm: shortSideMm };
  }
  return { pageWidthMm: shortSideMm, pageHeightMm: longSideMm };
}

export default function ProductsPagePolished() {
  const { user } = useAuth();
  const { data, loading, setData } = useFetch("/products");
  const { data: stores } = useFetch("/stores");
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedProductId, setHighlightedProductId] = useState("");
  const [selectionModel, setSelectionModel] = useState([]);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [form, setForm] = useState(initialForm);
  const [labelSettingsOpen, setLabelSettingsOpen] = useState(false);
  const [labelScalePercent, setLabelScalePercent] = useState(() => getProductLabelScale());
  const [labelFontScalePercent, setLabelFontScalePercent] = useState(() => getProductLabelFontScale());
  const [labelCopies, setLabelCopies] = useState(() => getProductLabelCopies());
  const [labelPaperPreset, setLabelPaperPreset] = useState(() => getProductLabelPaperPreset());
  const [labelCustomWidthMm, setLabelCustomWidthMm] = useState(() => getProductLabelCustomWidthMm());
  const [labelCustomHeightMm, setLabelCustomHeightMm] = useState(() => getProductLabelCustomHeightMm());
  const [labelThermalOrientation, setLabelThermalOrientation] = useState(() => getProductLabelThermalOrientation());
  const [labelOffsetXmm, setLabelOffsetXmm] = useState(() => getProductLabelOffsetXmm());
  const [labelOffsetYmm, setLabelOffsetYmm] = useState(() => getProductLabelOffsetYmm());
  const [showLabelPreview, setShowLabelPreview] = useState(true);
  const [savedProductNames, setSavedProductNames] = useState(() => readStoredList(PRODUCT_NAME_SUGGESTIONS_KEY));
  const [hiddenProductNames, setHiddenProductNames] = useState(() => readStoredList(HIDDEN_PRODUCT_NAME_SUGGESTIONS_KEY));
  const [editingProductId, setEditingProductId] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [scanBarcodeOpen, setScanBarcodeOpen] = useState(false);
  const isMobile = useMobileDetection();
  const fileInputRef = useRef(null);
  const canViewCost = ["admin", "manager"].includes(user?.role);
  const previewLabelSize = useMemo(
    () => getPresetLabelSizeMm(labelPaperPreset, labelCustomWidthMm, labelCustomHeightMm),
    [labelPaperPreset, labelCustomWidthMm, labelCustomHeightMm]
  );
  const previewPageSize = useMemo(
    () => getPreviewPageSizeMm(previewLabelSize.widthMm, previewLabelSize.heightMm, labelThermalOrientation),
    [previewLabelSize, labelThermalOrientation]
  );
  const previewFitScale = useMemo(() => {
    const maxPreviewWidthPx = 300;
    const maxPreviewHeightPx = 170;
    const widthScale = maxPreviewWidthPx / previewPageSize.pageWidthMm;
    const heightScale = maxPreviewHeightPx / previewPageSize.pageHeightMm;
    return Math.max(1.6, Math.min(widthScale, heightScale));
  }, [previewPageSize]);

  useEffect(() => {
    const handleFocus = () => {
      window.dispatchEvent(new CustomEvent("productsUpdated"));
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openCreateProduct = params.get("openCreateProduct") === "1";
    const rawScannedCode = params.get("newProductCode") || params.get("newProductSku") || "";
    const parsedCode = parseScannedInput(rawScannedCode);

    if (openCreateProduct || parsedCode) {
      setEditingProductId(null);
      setForm({
        ...initialForm,
        barcode: parsedCode || ""
      });
      setOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.search]);

  const filteredProducts = useMemo(() => {
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

  const openEditDialog = useCallback(async (product) => {
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
  }, []);

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

  function findProductByCode(rawCode) {
    const normalizedCode = parseScannedInput(rawCode);
    if (!normalizedCode) return null;

    const searchTerms = normalizedCode
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((term) => term.trim())
      .filter(Boolean);

    return (
      data.find((product) => {
        const searchableFields = [product.name, product.productNumber, product.barcode, product.sku, product.qrCode]
          .filter(Boolean)
          .map((value) => normalizeScanCode(value).toLowerCase());

        return searchableFields.some((value) => {
          if (value === normalizedCode.toLowerCase()) return true;
          return searchTerms.some((term) => value.includes(term));
        });
      }) || null
    );
  }

  function focusProductInTable(product) {
    if (!product?._id) return;
    setHighlightedProductId(String(product._id));
    setSelectionModel([String(product._id)]);
    setQuery(product.name || product.productNumber || product.sku || product.barcode || "");
    setPaginationModel((current) => ({ ...current, page: 0 }));
  }

  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      if (event.key !== "F2") return;

      const selectedId = selectionModel[0] || highlightedProductId;
      const selectedProduct = filteredProducts.find((product) => String(product._id) === String(selectedId)) || data.find((product) => String(product._id) === String(selectedId));

      if (!selectedProduct) return;

      event.preventDefault();
      event.stopPropagation();
      void openEditDialog(selectedProduct);
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [data, filteredProducts, highlightedProductId, openEditDialog, selectionModel]);

  useBarcodeKeyboardScan((code) => {
    if (open) {
      handleProductBarcodeDetected(code);
      return;
    }

    const product = findProductByCode(code);
    if (!product) {
      const parsedCode = parseScannedInput(code);
      if (parsedCode) {
        setQuery(parsedCode);
        setHighlightedProductId("");
      }
      toast.error("Няма намерен продукт по този код.");
      return;
    }

    focusProductInTable(product);
    toast.success(`Маркиран продукт: ${product.name}`);
  });

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

  async function handlePrintLabel(product) {
    try {
      await printProductLabel(product, {
        scalePercent: labelScalePercent,
        fontScalePercent: labelFontScalePercent,
        copies: labelCopies,
        paperPreset: labelPaperPreset,
        customWidthMm: labelCustomWidthMm,
        customHeightMm: labelCustomHeightMm,
        thermalOrientation: labelThermalOrientation,
        offsetXmm: labelOffsetXmm,
        offsetYmm: labelOffsetYmm
      });
    } catch (error) {
      toast.error(error?.message || "Неуспешно генериране на етикет.");
    }
  }

  function handleLabelScaleChange(nextValue) {
    const parsedValue = Number(nextValue);
    const safeValue = Number.isFinite(parsedValue)
      ? Math.min(MAX_LABEL_SCALE_PERCENT, Math.max(MIN_LABEL_SCALE_PERCENT, Math.round(parsedValue)))
      : 100;
    setLabelScalePercent(safeValue);
    setProductLabelScale(safeValue);
  }

  function handleLabelCopiesChange(nextValue) {
    const parsedValue = Number(nextValue);
    const safeValue = Number.isFinite(parsedValue) ? Math.min(500, Math.max(1, Math.round(parsedValue))) : 1;
    setLabelCopies(safeValue);
    setProductLabelCopies(safeValue);
  }

  function handleLabelFontScaleChange(nextValue) {
    const parsedValue = Number(nextValue);
    const safeValue = Number.isFinite(parsedValue)
      ? Math.min(MAX_LABEL_FONT_SCALE_PERCENT, Math.max(MIN_LABEL_FONT_SCALE_PERCENT, Math.round(parsedValue)))
      : 100;
    setLabelFontScalePercent(safeValue);
    setProductLabelFontScale(safeValue);
  }

  function handleLabelPaperPresetChange(nextValue) {
    setLabelPaperPreset(nextValue);
    setProductLabelPaperPreset(nextValue);
  }

  function handleLabelCustomWidthChange(nextValue) {
    const numeric = Number(nextValue);
    const safeValue = Number.isFinite(numeric)
      ? Math.min(MAX_LABEL_DIMENSION_MM, Math.max(MIN_LABEL_DIMENSION_MM, Math.round(numeric)))
      : 60;
    if (labelPaperPreset !== "thermal-custom") {
      setLabelPaperPreset("thermal-custom");
      setProductLabelPaperPreset("thermal-custom");
    }
    setLabelCustomWidthMm(safeValue);
    setProductLabelCustomWidthMm(safeValue);
  }

  function handleLabelCustomHeightChange(nextValue) {
    const numeric = Number(nextValue);
    const safeValue = Number.isFinite(numeric)
      ? Math.min(MAX_LABEL_DIMENSION_MM, Math.max(MIN_LABEL_DIMENSION_MM, Math.round(numeric)))
      : 40;
    if (labelPaperPreset !== "thermal-custom") {
      setLabelPaperPreset("thermal-custom");
      setProductLabelPaperPreset("thermal-custom");
    }
    setLabelCustomHeightMm(safeValue);
    setProductLabelCustomHeightMm(safeValue);
  }

  function handleLabelThermalOrientationChange(nextValue) {
    setLabelThermalOrientation(nextValue);
    setProductLabelThermalOrientation(nextValue);
  }

  function handleLabelOffsetXChange(nextValue) {
    const numeric = Number(nextValue);
    const safeValue = Number.isFinite(numeric)
      ? Math.min(MAX_LABEL_OFFSET_MM, Math.max(MIN_LABEL_OFFSET_MM, Number(numeric.toFixed(1))))
      : 0;
    setLabelOffsetXmm(safeValue);
    setProductLabelOffsetXmm(safeValue);
  }

  function handleLabelOffsetYChange(nextValue) {
    const numeric = Number(nextValue);
    const safeValue = Number.isFinite(numeric)
      ? Math.min(MAX_LABEL_OFFSET_MM, Math.max(MIN_LABEL_OFFSET_MM, Number(numeric.toFixed(1))))
      : 0;
    setLabelOffsetYmm(safeValue);
    setProductLabelOffsetYmm(safeValue);
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Каталог"
        title="Управление на продукти"
        subtitle="Поддържай пълни продуктови профили със снимка, цена, минимална наличност, ДДС и подробно описание."
        icon={<Inventory2RoundedIcon />}
      />

      {loading && !data.length ? <PageLoadingNotice subject="продуктите" /> : null}

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
        actions={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", md: "auto" } }}>
            <Button variant="outlined" onClick={() => setLabelSettingsOpen(true)}>
              Настройки етикет
            </Button>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>Нов продукт</Button>
          </Stack>
        }
      >
        <ResponsiveTable>
          <DataGrid
            loading={loading}
            rows={filteredProducts}
            getRowId={(row) => row._id}
            rowSelectionModel={selectionModel}
            onRowSelectionModelChange={(nextSelection) => setSelectionModel(nextSelection)}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            onRowClick={(params) => {
              setHighlightedProductId(String(params.row._id));
              setSelectionModel([String(params.row._id)]);
            }}
            rowHeight={60}
            columnHeaderHeight={54}
            getRowClassName={(params) => {
              if (String(params.row._id) === String(highlightedProductId)) return "product-row-scanned";
              if (query.trim()) return "product-row-filter-hit";
              return "";
            }}
            sx={{
              "& .product-cell": {
                pl: 0.5,
                pr: 0.5
              },
              "& .product-row-filter-hit .MuiDataGrid-cell": {
                bgcolor: "rgba(39, 86, 107, 0.06)"
              },
              "& .product-row-scanned .MuiDataGrid-cell": {
                bgcolor: "rgba(255, 193, 7, 0.18)",
                borderLeft: "4px solid rgba(255, 143, 0, 0.85)"
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
                { field: "createdAt", headerName: "Дата създаване", flex: 0.85, minWidth: 130, valueFormatter: (params) => formatDate(params?.value ?? params) },
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
                  width: 180,
                  minWidth: 180,
                  align: "center",
                  headerAlign: "center",
                  renderCell: (params) => (
                    <GridRowActions
                      onEdit={() => openEditDialog(params.row)}
                      onDelete={() => openDeleteDialog(params.row)}
                      onPrint={() => void handlePrintLabel(params.row)}
                    />
                  )
                }
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

      <Dialog
        open={labelSettingsOpen}
        onClose={() => setLabelSettingsOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: { xs: 0, sm: 2.5 } } }}
      >
        <DialogTitle>Настройки за етикети</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              select
              size="small"
              label="Тип печат"
              value={labelPaperPreset}
              onChange={(event) => handleLabelPaperPresetChange(event.target.value)}
              fullWidth
            >
              {PRODUCT_LABEL_PAPER_PRESETS.map((preset) => (
                <MenuItem key={preset.id} value={preset.id}>
                  {preset.label}
                </MenuItem>
              ))}
            </TextField>

            {labelPaperPreset !== "a4-3x8" ? (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  size="small"
                  type="number"
                  label="Ширина (mm)"
                  value={String(labelCustomWidthMm)}
                  onChange={(event) => handleLabelCustomWidthChange(event.target.value)}
                  inputProps={{ min: MIN_LABEL_DIMENSION_MM, max: MAX_LABEL_DIMENSION_MM, step: 1 }}
                  helperText={labelPaperPreset === "thermal-custom" ? "Персонален размер" : "Промяна = автоматично към персонален"}
                  fullWidth
                />
                <TextField
                  size="small"
                  type="number"
                  label="Височина (mm)"
                  value={String(labelCustomHeightMm)}
                  onChange={(event) => handleLabelCustomHeightChange(event.target.value)}
                  inputProps={{ min: MIN_LABEL_DIMENSION_MM, max: MAX_LABEL_DIMENSION_MM, step: 1 }}
                  helperText={labelPaperPreset === "thermal-custom" ? "Персонален размер" : "Промяна = автоматично към персонален"}
                  fullWidth
                />
              </Stack>
            ) : null}

            {labelPaperPreset !== "a4-3x8" ? (
              <TextField
                select
                size="small"
                label="Ориентация на термо етикета"
                value={labelThermalOrientation}
                onChange={(event) => handleLabelThermalOrientationChange(event.target.value)}
                fullWidth
              >
                {PRODUCT_LABEL_THERMAL_ORIENTATIONS.map((orientation) => (
                  <MenuItem key={orientation.id} value={orientation.id}>
                    {orientation.label}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}

            <TextField
              size="small"
              type="number"
              label="Размер на етикета (%)"
              value={String(labelScalePercent)}
              onChange={(event) => handleLabelScaleChange(event.target.value)}
              inputProps={{ min: MIN_LABEL_SCALE_PERCENT, max: MAX_LABEL_SCALE_PERCENT, step: 1 }}
              helperText={`Ръчно въвеждане: ${MIN_LABEL_SCALE_PERCENT}% - ${MAX_LABEL_SCALE_PERCENT}%`}
              fullWidth
            />

            <TextField
              size="small"
              type="number"
              label="Размер на шрифта (%)"
              value={String(labelFontScalePercent)}
              onChange={(event) => handleLabelFontScaleChange(event.target.value)}
              inputProps={{ min: MIN_LABEL_FONT_SCALE_PERCENT, max: MAX_LABEL_FONT_SCALE_PERCENT, step: 1 }}
              helperText={`Само текстът: ${MIN_LABEL_FONT_SCALE_PERCENT}% - ${MAX_LABEL_FONT_SCALE_PERCENT}%`}
              fullWidth
            />

            <TextField
              size="small"
              type="number"
              label="Брой етикети"
              value={String(labelCopies)}
              onChange={(event) => handleLabelCopiesChange(event.target.value)}
              inputProps={{ min: 1, max: 500, step: 1 }}
              fullWidth
            />

            {labelPaperPreset !== "a4-3x8" ? (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  size="small"
                  type="number"
                  label="Отместване X (mm)"
                  value={String(labelOffsetXmm)}
                  onChange={(event) => handleLabelOffsetXChange(event.target.value)}
                  inputProps={{ min: MIN_LABEL_OFFSET_MM, max: MAX_LABEL_OFFSET_MM, step: 0.5 }}
                  helperText="- = наляво, + = надясно"
                  fullWidth
                />
                <TextField
                  size="small"
                  type="number"
                  label="Отместване Y (mm)"
                  value={String(labelOffsetYmm)}
                  onChange={(event) => handleLabelOffsetYChange(event.target.value)}
                  inputProps={{ min: MIN_LABEL_OFFSET_MM, max: MAX_LABEL_OFFSET_MM, step: 0.5 }}
                  helperText="- = нагоре, + = надолу"
                  fullWidth
                />
              </Stack>
            ) : null}

            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pt: 0.25 }}>
              <Typography variant="subtitle2" fontWeight={800}>
                Покажи преглед на етикета
              </Typography>
              <Switch size="small" checked={showLabelPreview} onChange={(event) => setShowLabelPreview(event.target.checked)} />
            </Stack>

            {showLabelPreview ? (
              <Box sx={{ border: "1px solid rgba(39,86,107,0.2)", borderRadius: 2, p: 1.25, bgcolor: "rgba(39,86,107,0.03)" }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                  Преглед на етикета (live)
                </Typography>
              <Box
                sx={{
                  width: "100%",
                  minHeight: 190,
                  borderRadius: 1.5,
                  border: "1px dashed rgba(17,24,39,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  p: 1,
                  bgcolor: "#fff"
                }}
              >
                <Box
                  sx={{
                    width: `${Math.round(previewPageSize.pageWidthMm * previewFitScale)}px`,
                    height: `${Math.round(previewPageSize.pageHeightMm * previewFitScale)}px`,
                    border: "1px solid #111827",
                    borderRadius: 1,
                    p: 0.7,
                    overflow: "hidden",
                    bgcolor: "#fff",
                    transform: `translate(${Math.round((labelOffsetXmm - 2) * previewFitScale)}px, ${Math.round(labelOffsetYmm * previewFitScale)}px) rotate(${labelThermalOrientation === "short-edge" ? 90 : 0}deg) scale(${Math.min(2.6, Math.max(0.7, labelScalePercent / 100))})`,
                    transformOrigin: "center center"
                  }}
                >
                  <Box component="img" src="/MARKLIGHT.png" alt="Logo" sx={{ maxWidth: "66%", maxHeight: 16, width: "auto", height: "auto", display: "block", mb: 0.4 }} />
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, lineHeight: 1.05 }} noWrap>
                    Име: POL-ML-A5157+GD
                  </Typography>
                  <Typography sx={{ mt: 0.2, fontSize: 8.2, color: "#374151", lineHeight: 1.05 }} noWrap>
                    SKU: SKU-1-0007
                  </Typography>
                  <Typography sx={{ mt: 0.12, fontSize: 8.2, color: "#374151", lineHeight: 1.05 }} noWrap>
                    Модел: ML-A5157+GD
                  </Typography>
                  <Typography sx={{ mt: 0.12, fontSize: 8.2, color: "#374151", lineHeight: 1.05 }} noWrap>
                    Баркод: SKU-1-0007
                  </Typography>
                  <Stack direction="row" spacing={0.8} sx={{ mt: 0.45, alignItems: "flex-end" }}>
                    <Box sx={{ flex: 1, alignSelf: "flex-end" }}>
                      <Box
                        sx={{
                          height: 17,
                          width: "100%",
                          backgroundImage: "repeating-linear-gradient(90deg, #111827 0 2px, transparent 2px 3px)",
                          backgroundSize: "3px 100%"
                        }}
                      />
                    </Box>
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        border: "1px solid #111827",
                        backgroundImage: "repeating-linear-gradient(0deg, #111827 0 2px, #fff 2px 4px), repeating-linear-gradient(90deg, rgba(17,24,39,0.85) 0 2px, transparent 2px 4px)"
                      }}
                    />
                  </Stack>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                Площ за печат: {previewPageSize.pageWidthMm} x {previewPageSize.pageHeightMm} mm | Мащаб: {labelScalePercent}%
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Отместване: X {labelOffsetXmm} mm, Y {labelOffsetYmm} mm
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Това е симулация за нагласяне. Реалният печат зависи и от настройката Scale/Zoom в драйвера на принтера.
              </Typography>
              </Box>
            ) : null}

            <Typography variant="caption" color="text.secondary">
              Можеш да печаташ както на термо ролка, така и на обикновен принтер на A4. Настройките се запомнят автоматично.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              За Phomemo M221 най-често се ползват 40x30, 50x30, 50x40, 60x40 и 70x80 mm етикети.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Ако печата на късата страна, избери "По дългата страна".
            </Typography>
          </Stack>
        </DialogContent>
        <Stack direction="row" justifyContent="flex-end" sx={{ p: 2 }}>
          <Button variant="contained" onClick={() => setLabelSettingsOpen(false)}>
            Готово
          </Button>
        </Stack>
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
