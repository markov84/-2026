import { useCallback, useMemo, useRef, useState } from "react";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import NoteAddRoundedIcon from "@mui/icons-material/NoteAddRounded";
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
  Typography
} from "@mui/material";
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
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";
import api from "../lib/api";
import { formatCurrencyEUR } from "../lib/currency";
import { printInvoice } from "../lib/printDocuments";
import { findProductByScanCode, parseScannedInput } from "../lib/scanCode";

const statusOptions = [
  { value: "draft", label: "Чернова" },
  { value: "issued", label: "Издадена" },
  { value: "paid", label: "Платена" },
  { value: "cancelled", label: "Анулирана" }
];

const paymentMethods = ["Брой", "Банков превод", "Карта", "Наложен платеж"];

const defaultSupplier = {
  name: "MARK LIGHT LTD",
  address: "Габрово, ул. Пенчо Постомпиров 35",
  idNumber: "200288095",
  vatNumber: "",
  manager: "инж. Антон Марков",
  bank: "",
  iban: ""
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

import { useBarcodeKeyboardScan } from "../hooks/useBarcodeKeyboardScan";
function blankItem() {
  return {
    productId: "",
    description: "",
    unit: "бр.",
    quantity: "",
    unitPrice: "",
    vatRate: "20"
  };
}

function blankInvoice() {
  return {
    invoiceNumber: "Генерира се автоматично",
    issueDate: today(),
    taxEventDate: today(),
    supplier: { ...defaultSupplier },
    customerName: "",
    customerAddress: "",
    customerIdNumber: "",
    customerVatNumber: "",
    store: "",
    paymentMethod: "Банков превод",
    status: "issued",
    notes: "",
    items: [blankItem()]
  };
}

function toInputDate(value) {
  if (!value) return today();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return today();
  return date.toISOString().slice(0, 10);
}

function numberValue(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isInvoiceItemFilled(item) {
  return Boolean(item?.description?.trim() || numberValue(item?.quantity) > 0 || numberValue(item?.unitPrice) > 0);
}

function getCleanInvoiceItems(items = []) {
  return items.filter(isInvoiceItemFilled);
}

function withTrailingInvoiceRow(items) {
  const nextItems = items.length ? items : [blankItem()];
  const lastItem = nextItems[nextItems.length - 1];
  return isInvoiceItemFilled(lastItem) ? [...nextItems, blankItem()] : nextItems;
}

function calculateTotals(items) {
  return getCleanInvoiceItems(items).reduce(
    (totals, item) => {
      const lineBase = numberValue(item.quantity) * numberValue(item.unitPrice);
      const lineVat = lineBase * (numberValue(item.vatRate) / 100);
      return {
        subtotal: totals.subtotal + lineBase,
        vatAmount: totals.vatAmount + lineVat,
        totalAmount: totals.totalAmount + lineBase + lineVat
      };
    },
    { subtotal: 0, vatAmount: 0, totalAmount: 0 }
  );
}

function validateInvoice(invoice) {
  if (!invoice?.customerName?.trim()) return "Името на получателя е задължително.";
  if (!invoice?.customerAddress?.trim()) return "Адресът на получателя е задължителен.";
  if (!invoice?.customerIdNumber?.trim() && !invoice?.customerVatNumber?.trim()) {
    return "Попълни ЕИК/ЕГН или ДДС номер на получателя.";
  }
  if (!invoice?.issueDate) return "Датата на издаване е задължителна.";
  const items = getCleanInvoiceItems(invoice?.items);
  if (!items.length) return "Добави поне един ред във фактурата.";

  for (const [index, item] of items.entries()) {
    const row = index + 1;
    if (!item.description.trim()) return `Описание на ред ${row} е задължително.`;
    if (numberValue(item.quantity) <= 0) return `Количеството на ред ${row} трябва да е по-голямо от 0.`;
    if (numberValue(item.unitPrice) < 0) return `Единичната цена на ред ${row} не може да е отрицателна.`;
    if (numberValue(item.vatRate) < 0) return `ДДС ставката на ред ${row} не може да е отрицателна.`;
  }

  return "";
}

function buildPayload(invoice, { includeInvoiceNumber = false } = {}) {
  const cleanItems = getCleanInvoiceItems(invoice.items);
  const totals = calculateTotals(cleanItems);
  const payload = {
    supplier: {
      name: invoice.supplier?.name?.trim() || defaultSupplier.name,
      address: invoice.supplier?.address?.trim() || undefined,
      idNumber: invoice.supplier?.idNumber?.trim() || undefined,
      vatNumber: invoice.supplier?.vatNumber?.trim() || undefined,
      manager: invoice.supplier?.manager?.trim() || undefined,
      bank: invoice.supplier?.bank?.trim() || undefined,
      iban: invoice.supplier?.iban?.trim() || undefined
    },
    customerName: invoice.customerName.trim(),
    customerAddress: invoice.customerAddress.trim(),
    customerIdNumber: invoice.customerIdNumber.trim() || undefined,
    customerVatNumber: invoice.customerVatNumber.trim() || undefined,
    store: invoice.store || undefined,
    issueDate: invoice.issueDate,
    taxEventDate: invoice.taxEventDate || invoice.issueDate,
    paymentMethod: invoice.paymentMethod || undefined,
    status: invoice.status,
    notes: invoice.notes.trim() || undefined,
    items: cleanItems.map((item) => ({
      description: item.description.trim(),
      unit: item.unit.trim() || "бр.",
      quantity: numberValue(item.quantity),
      unitPrice: numberValue(item.unitPrice),
      vatRate: numberValue(item.vatRate)
    })),
    ...totals
  };

  if (includeInvoiceNumber) {
    payload.invoiceNumber = invoice.invoiceNumber.trim();
  }

  return payload;
}

function getProductOptionLabel(product) {
  if (!product) return "";
  return [product.name, product.productNumber ? `№ ${product.productNumber}` : "", product.sku || product.barcode || ""].filter(Boolean).join(" | ");
}

function findProductByInvoiceItem(products, item) {
  if (!Array.isArray(products) || !products.length) return null;
  if (item?.productId) {
    const byId = products.find((product) => product._id === item.productId);
    if (byId) return byId;
  }

  const query = String(item?.description || "").trim().toLowerCase();
  if (!query) return null;

  return (
    products.find((product) => {
      const name = String(product?.name || "").toLowerCase();
      const sku = String(product?.sku || "").toLowerCase();
      const barcode = String(product?.barcode || "").toLowerCase();
      return name === query || sku === query || barcode === query;
    }) || null
  );
}

function StatusChip({ value }) {
  const color = value === "paid" ? "success" : value === "cancelled" ? "error" : value === "draft" ? "warning" : "default";
  const label = statusOptions.find((item) => item.value === value)?.label || value || "-";
  return <Chip label={label} size="small" color={color} />;
}

function TotalsPreview({ totals }) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={1.25}
      justifyContent="flex-end"
      alignItems={{ md: "flex-start" }}
      sx={{ p: 1.5, borderRadius: 2, bgcolor: "rgba(39,86,107,0.06)", border: "1px solid rgba(39,86,107,0.10)", width: "100%" }}
    >
      <Stack spacing={0.25} sx={{ width: { xs: "100%", md: 270 }, ml: { md: "auto" }, alignItems: { xs: "stretch", md: "flex-start" } }}>
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
  );
}

function InvoiceForm({ invoice, setInvoice, stores, products = [] }) {
  const totals = useMemo(() => calculateTotals(invoice.items), [invoice.items]);

  function updateField(key, value) {
    setInvoice((current) => ({ ...current, [key]: value }));
  }

  function updateSupplier(key, value) {
    setInvoice((current) => ({
      ...current,
      supplier: {
        ...defaultSupplier,
        ...current.supplier,
        [key]: value
      }
    }));
  }

  function updateItem(index, key, value) {
    setInvoice((current) => ({
      ...current,
      items: withTrailingInvoiceRow(current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)))
    }));
  }

  function applyProductToItem(index, product) {
    if (!product) {
      updateItem(index, "productId", "");
      return;
    }

    setInvoice((current) => ({
      ...current,
      items: withTrailingInvoiceRow(
        current.items.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                productId: product._id,
                description: product.name || item.description,
                unit: item.unit || "бр.",
                unitPrice: String(product.price ?? item.unitPrice ?? ""),
                vatRate: String(product.vatRate ?? item.vatRate ?? 20)
              }
            : item
        )
      )
    }));
  }

  function removeItem(index) {
    setInvoice((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  return (
    <Stack spacing={2.5}>
      <Stack spacing={1}>
        <Typography variant="subtitle1" fontWeight={800}>Документ</Typography>
        <FormGrid min={220}>
          <TextField label="Номер на фактура" value={invoice.invoiceNumber} disabled={invoice.invoiceNumber === "Генерира се автоматично"} onChange={(e) => updateField("invoiceNumber", e.target.value)} />
          <TextField label="Дата на издаване" type="date" value={invoice.issueDate} onChange={(e) => updateField("issueDate", e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="Дата на данъчно събитие" type="date" value={invoice.taxEventDate} onChange={(e) => updateField("taxEventDate", e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField select label="Магазин/обект" value={invoice.store} onChange={(e) => updateField("store", e.target.value)}>
            <MenuItem value="">Централа</MenuItem>
            {stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}
          </TextField>
        </FormGrid>
      </Stack>

      <Divider />

      <Stack spacing={1}>
        <Typography variant="subtitle1" fontWeight={800}>Доставчик</Typography>
        <FormGrid min={240}>
          <TextField label="Фирма" value={invoice.supplier?.name || ""} onChange={(e) => updateSupplier("name", e.target.value)} />
          <TextField label="ЕИК" value={invoice.supplier?.idNumber || ""} onChange={(e) => updateSupplier("idNumber", e.target.value)} />
          <TextField label="ДДС номер" value={invoice.supplier?.vatNumber || ""} onChange={(e) => updateSupplier("vatNumber", e.target.value)} placeholder="BG..." />
          <TextField label="МОЛ" value={invoice.supplier?.manager || ""} onChange={(e) => updateSupplier("manager", e.target.value)} />
          <TextField label="Адрес" value={invoice.supplier?.address || ""} onChange={(e) => updateSupplier("address", e.target.value)} />
          <TextField label="Банка" value={invoice.supplier?.bank || ""} onChange={(e) => updateSupplier("bank", e.target.value)} />
          <TextField label="IBAN" value={invoice.supplier?.iban || ""} onChange={(e) => updateSupplier("iban", e.target.value)} sx={{ gridColumn: { md: "span 2" } }} />
        </FormGrid>
      </Stack>

      <Divider />

      <Stack spacing={1}>
        <Typography variant="subtitle1" fontWeight={800}>Получател</Typography>
        <FormGrid min={240}>
          <TextField label="Име / фирма" value={invoice.customerName} onChange={(e) => updateField("customerName", e.target.value)} />
          <TextField label="ЕИК / ЕГН" value={invoice.customerIdNumber} onChange={(e) => updateField("customerIdNumber", e.target.value)} />
          <TextField label="ДДС номер" value={invoice.customerVatNumber} onChange={(e) => updateField("customerVatNumber", e.target.value)} placeholder="BG..." />
          <TextField label="Адрес" value={invoice.customerAddress} onChange={(e) => updateField("customerAddress", e.target.value)} />
        </FormGrid>
      </Stack>

      <Divider />

      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Typography variant="subtitle1" fontWeight={800}>Редове във фактурата</Typography>
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
          <Table size="small" sx={{ minWidth: 706, tableLayout: "fixed" }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 28, fontWeight: 900 }}>№</TableCell>
                <TableCell sx={{ width: 290, fontWeight: 900 }}>Наименование</TableCell>
                <TableCell sx={{ width: 64, fontWeight: 900 }}>Мярка</TableCell>
                <TableCell align="right" sx={{ width: 72, fontWeight: 900 }}>Брой</TableCell>
                <TableCell align="right" sx={{ width: 116, fontWeight: 900 }}>Ед. цена</TableCell>
                <TableCell align="right" sx={{ width: 66, fontWeight: 900 }}>ДДС %</TableCell>
                <TableCell align="center" sx={{ width: 36, fontWeight: 900 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {invoice.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Typography variant="caption" fontWeight={800} color="text.secondary">
                      {index + 1}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      size="small"
                      options={Array.isArray(products) ? products : []}
                      getOptionLabel={getProductOptionLabel}
                      value={findProductByInvoiceItem(products, item)}
                      inputValue={item.description || ""}
                      onInputChange={(_, value, reason) => {
                        if (reason === "input" || reason === "clear") {
                          updateItem(index, "description", value);
                        }
                      }}
                      onChange={(_, product) => applyProductToItem(index, product)}
                      isOptionEqualToValue={(option, value) => option?._id === value?._id}
                      noOptionsText="Няма продукт"
                      renderInput={(params) => <TextField {...params} size="small" placeholder="Описание / продукт" fullWidth />}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={item.unit}
                      onChange={(e) => updateItem(index, "unit", e.target.value)}
                      placeholder="бр."
                      fullWidth
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      inputProps={{ min: 0 }}
                      sx={{ width: 64 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                      inputProps={{ min: 0 }}
                      sx={{ width: 108 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={item.vatRate}
                      onChange={(e) => updateItem(index, "vatRate", e.target.value)}
                      inputProps={{ min: 0 }}
                      sx={{ width: 58 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => removeItem(index)} disabled={invoice.items.length === 1} aria-label="Премахни ред">
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack spacing={0.75} sx={{ display: { xs: "flex", md: "none" } }}>
          {invoice.items.map((item, index) => (
            <Box
              key={index}
              sx={{
                p: 1,
                borderRadius: 1.25,
                border: "1px solid rgba(39,86,107,0.12)",
                bgcolor: "background.paper"
              }}
            >
              <Stack spacing={0.75}>
                <Typography variant="caption" fontWeight={800} color="text.secondary">
                  Ред {index + 1}
                </Typography>
                <TextField size="small" label="Описание" value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} />
                <Autocomplete
                  size="small"
                  options={Array.isArray(products) ? products : []}
                  getOptionLabel={getProductOptionLabel}
                  value={findProductByInvoiceItem(products, item)}
                  onChange={(_, product) => applyProductToItem(index, product)}
                  isOptionEqualToValue={(option, value) => option?._id === value?._id}
                  noOptionsText="Няма продукт"
                  renderInput={(params) => <TextField {...params} size="small" label="Продукт" placeholder="Търси по име/номер/SKU/баркод" />}
                />
                <Stack direction="row" spacing={0.75}>
                  <TextField size="small" label="Мярка" value={item.unit} onChange={(e) => updateItem(index, "unit", e.target.value)} fullWidth />
                  <TextField size="small" label="Брой" type="number" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} inputProps={{ min: 0 }} fullWidth />
                </Stack>
                <Stack direction="row" spacing={0.75}>
                  <TextField size="small" label="Ед. цена" type="number" value={item.unitPrice} onChange={(e) => updateItem(index, "unitPrice", e.target.value)} inputProps={{ min: 0 }} fullWidth />
                  <TextField size="small" label="ДДС %" type="number" value={item.vatRate} onChange={(e) => updateItem(index, "vatRate", e.target.value)} inputProps={{ min: 0 }} fullWidth />
                </Stack>
                <Button size="small" color="error" variant="text" onClick={() => removeItem(index)} disabled={invoice.items.length === 1}>
                  Премахни ред
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Stack>

      <TotalsPreview totals={totals} />

      <Divider />

      <FormGrid min={220}>
        <TextField select label="Начин на плащане" value={invoice.paymentMethod} onChange={(e) => updateField("paymentMethod", e.target.value)}>
          {paymentMethods.map((method) => <MenuItem key={method} value={method}>{method}</MenuItem>)}
        </TextField>
        <TextField select label="Статус" value={invoice.status} onChange={(e) => updateField("status", e.target.value)}>
          {statusOptions.map((status) => <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>)}
        </TextField>
        <FormGridFull>
          <TextField label="Бележки / основание" value={invoice.notes} onChange={(e) => updateField("notes", e.target.value)} multiline minRows={2} />
        </FormGridFull>
      </FormGrid>
    </Stack>
  );
}

export default function InvoicesPageStable() {
  const { data: invoices, loading, setData } = useFetch("/invoices");
  const { data: stores } = useFetch("/stores");
  const { data: products = [] } = useFetch("/products");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => blankInvoice());
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [deletingInvoice, setDeletingInvoice] = useState(null);
  const [scanCode, setScanCode] = useState("");
  const [scanCameraOpen, setScanCameraOpen] = useState(false);
  const audioContextRef = useRef(null);
  const isMobile = useMobileDetection();

  async function handleCreate() {
    const validationMessage = validateInvoice(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.post("/invoices", buildPayload(form));
      setData((current) => [response.data, ...current]);
      setForm(blankInvoice());
      setOpen(false);
      toast.success("Фактурата е създадена.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно създаване на фактура.");
    }
  }

  function openEditDialog(invoice) {
    setEditingInvoice({
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber || "",
      issueDate: toInputDate(invoice.issueDate),
      taxEventDate: toInputDate(invoice.taxEventDate || invoice.issueDate),
      supplier: { ...defaultSupplier, ...(invoice.supplier || {}) },
      customerName: invoice.customerName || "",
      customerAddress: invoice.customerAddress || "",
      customerIdNumber: invoice.customerIdNumber || "",
      customerVatNumber: invoice.customerVatNumber || "",
      store: invoice.store?._id || "",
      paymentMethod: invoice.paymentMethod || "Банков превод",
      status: invoice.status || "issued",
      notes: invoice.notes || "",
      items: withTrailingInvoiceRow(
        invoice.items?.length
          ? invoice.items.map((item) => ({
              description: item.description || "",
              unit: item.unit || "бр.",
              quantity: String(item.quantity ?? 1),
              unitPrice: String(item.unitPrice ?? ""),
              vatRate: String(item.vatRate ?? 20)
            }))
          : [blankItem()]
      )
    });
  }

  async function handleUpdate() {
    if (!editingInvoice?._id) return;

    const validationMessage = validateInvoice(editingInvoice);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.put(`/invoices/${editingInvoice._id}`, buildPayload(editingInvoice, { includeInvoiceNumber: true }));
      setData((current) => current.map((item) => (item._id === editingInvoice._id ? response.data : item)));
      setEditingInvoice(null);
      toast.success("Фактурата е обновена.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешна редакция на фактура.");
    }
  }

  async function handleDelete() {
    if (!deletingInvoice?._id) return;

    try {
      await api.delete(`/invoices/${deletingInvoice._id}`);
      setData((current) => current.filter((item) => item._id !== deletingInvoice._id));
      setDeletingInvoice(null);
      toast.success("Фактурата е изтрита.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно изтриване на фактура.");
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

  const handleInvoiceScannerDetected = useCallback(
    async (rawCode) => {
      const { code, product } = await resolveScannedProduct(rawCode);
      if (!code) return;

      if (!product) {
        playScanFeedback("error");
        toast.error(`Няма продукт с баркод/SKU ${code}.`);
        return;
      }

      setForm((current) => {
        const currentItems = (current.items || []).filter((item) => item.product || Number(item.quantity || 0) > 0);
        const existingItem = currentItems.find((item) => item.product === product._id);

        if (existingItem) {
          toast.success(`Количество +1: ${product.name}`);
          return {
            ...current,
            items: [...currentItems.slice(0, -1), 
              {
                ...currentItems[currentItems.length - 1],
                product: existingItem.product,
                quantity: String(Number(existingItem.quantity || 0) + 1)
              }
            ]
          };
        }

        return {
          ...current,
          items: [
            ...currentItems,
            { product: product._id, quantity: "1", unitPrice: String(product.price ?? ""), vatRate: String(product.vatRate ?? 20) }
          ]
        };
      });

      setScanCode("");
      playScanFeedback("success");
      toast.success(`Добавен продукт: ${product.name}`);
      setScanCameraOpen(false);
    },
    [resolveScannedProduct]
  );

  useBarcodeKeyboardScan((code) => {
    setScanCode(code);
    void handleInvoiceScannerDetected(code);
  });

  return (
    <Stack spacing={3}>
      <PageHeader eyebrow="Фактуриране" title="Фактури" subtitle="Регистър и форма с основните реквизити за издаване на фактура." icon={<DescriptionRoundedIcon />} />

      <DataSection title="Регистър на фактурите" subtitle="Издадени документи, статуси и суми" icon={<DescriptionRoundedIcon />} actions={<Button variant="contained" startIcon={<NoteAddRoundedIcon />} onClick={() => setOpen(true)}>Нова фактура</Button>}>
        <ResponsiveTable>
          <DataGrid
            autoHeight
            rowHeight={44}
            columnHeaderHeight={44}
            loading={loading}
            rows={invoices}
            getRowId={(row) => row._id}
            columns={[
              { field: "invoiceNumber", headerName: "Фактура", flex: 0.9, minWidth: 135 },
              { field: "issueDate", headerName: "Дата", flex: 0.75, minWidth: 115, valueFormatter: (params) => toInputDate(params?.value ?? params) },
              { field: "customerName", headerName: "Получател", flex: 1.35, minWidth: 180 },
              { field: "customerIdNumber", headerName: "ЕИК/ДДС", flex: 0.9, minWidth: 130, valueGetter: (_, row) => row.customerVatNumber || row.customerIdNumber || "-" },
              { field: "store", headerName: "Обект", flex: 0.9, minWidth: 130, valueGetter: (_, row) => row.store?.name || "Централа" },
              { field: "status", headerName: "Статус", flex: 0.75, minWidth: 115, renderCell: (params) => <StatusChip value={params?.value} /> },
              { field: "vatAmount", headerName: "ДДС", flex: 0.75, minWidth: 105, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) },
              { field: "totalAmount", headerName: "Общо", flex: 0.85, minWidth: 115, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) },
              { field: "actions", headerName: "", sortable: false, filterable: false, width: 150, align: "center", renderCell: (params) => <GridRowActions onPrint={() => printInvoice(params.row)} onEdit={() => openEditDialog(params.row)} onDelete={() => setDeletingInvoice(params.row)} /> }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="lg" fullScreen={isMobile}>
        <DialogTitle>Нова фактура</DialogTitle>
        <DialogContent dividers>
          <InvoiceForm invoice={form} setInvoice={setForm} stores={stores} products={products} />
        </DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setOpen(false)} onConfirm={handleCreate} />
      </Dialog>

      <Dialog open={Boolean(editingInvoice)} onClose={() => setEditingInvoice(null)} fullWidth maxWidth="lg" fullScreen={isMobile}>
        <DialogTitle>Редактиране на фактура</DialogTitle>
        <DialogContent dividers>
          {editingInvoice ? <InvoiceForm invoice={editingInvoice} setInvoice={setEditingInvoice} stores={stores} products={products} /> : null}
        </DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setEditingInvoice(null)} onConfirm={handleUpdate} />
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deletingInvoice)}
        title="Изтриване на фактура"
        description={`Сигурен ли си, че искаш да изтриеш ${deletingInvoice?.invoiceNumber || "тази фактура"}?`}
        onClose={() => setDeletingInvoice(null)}
        onConfirm={handleDelete}
      />

      <BarcodeScannerDialog
        open={scanCameraOpen}
        onClose={() => setScanCameraOpen(false)}
        onDetected={handleInvoiceScannerDetected}
        onError={() => setScanCameraOpen(false)}
        title="Сканирай продукт за фактурата"
      />
    </Stack>
  );
}
