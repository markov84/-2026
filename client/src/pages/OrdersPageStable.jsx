import { useEffect, useMemo, useState } from "react";
import AddShoppingCartRoundedIcon from "@mui/icons-material/AddShoppingCartRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import { Button, DialogContent, DialogTitle, InputAdornment, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import DataSection from "../components/DataSection";
import Dialog from "../components/DraggableDialog";
import DialogFooterActions from "../components/DialogFooterActions";
import { FormGrid, FormGridFull } from "../components/FormGrid";
import GridRowActions from "../components/GridRowActions";
import PageHeader from "../components/PageHeader";
import { ProductIdentity, ProductPreviewCard } from "../components/ProductPresentation";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";
import api from "../lib/api";
import { formatCurrencyEUR } from "../lib/currency";
import { printOrder } from "../lib/printDocuments";
import { useAuth } from "../providers/AuthProviderStable";

const initialOrder = {
  orderNumber: "Генерира се автоматично",
  store: "",
  customer: "",
  product: "",
  quantity: "1",
  unitPrice: "",
  totalAmount: "",
  status: "pending",
  paymentStatus: "unpaid"
};

const paymentStatusLabels = {
  unpaid: "Неплатена",
  partial: "Частично",
  paid: "Платена"
};

function getCustomerDisplayName(customer) {
  if (!customer) return "На място";
  return customer.customerType === "company" ? customer.company || customer.fullName || "На място" : customer.fullName || customer.company || "На място";
}

function validateOrder(order) {
  if (!order?.store) return "Избери магазин.";
  if (!order?.product) return "Избери продукт.";
  if (Number(order?.quantity || 0) <= 0) return "Количеството трябва да е по-голямо от 0.";
  if (Number(order?.unitPrice || 0) < 0) return "Единичната цена не може да е отрицателна.";
  if (Number(order?.totalAmount || 0) <= 0) return "Крайната сума трябва да е по-голяма от 0.";
  return "";
}

function normalizeScanCode(value) {
  return String(value || "").replace(/[\r\n\t]/g, "").trim();
}

function findProductByScanCode(products, code) {
  const normalized = normalizeScanCode(code).toLowerCase();
  if (!normalized) return null;

  return products.find((product) =>
    [product.productNumber, product.barcode, product.sku]
      .filter(Boolean)
      .some((value) => String(value).trim().toLowerCase() === normalized)
  );
}

export default function OrdersPageStable() {
  const { user } = useAuth();
  const { data: orders, loading, setData } = useFetch("/orders");
  const { data: stores } = useFetch("/stores");
  const { data: customers } = useFetch("/customers");
  const { data: products } = useFetch("/products");
  const { data: inventory } = useFetch("/inventory/summary");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialOrder);
  const [scanCode, setScanCode] = useState("");
  const [editScanCode, setEditScanCode] = useState("");
  const [editingOrder, setEditingOrder] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const isMobile = useMobileDetection();
  const canSeeOrderAuthor = user?.role === "admin";

  const activeForm = editingOrder || form;
  const selectedProduct = useMemo(() => products.find((product) => product._id === activeForm.product), [products, activeForm.product]);
  const selectedInventory = useMemo(
    () => inventory.find((item) => item.product?._id === activeForm.product && item.store?._id === activeForm.store),
    [inventory, activeForm.product, activeForm.store]
  );

  const orderColumns = useMemo(
    () => [
      { field: "orderNumber", headerName: "Продажба", flex: 0.75, minWidth: 115 },
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
        field: "product",
        headerName: "Продукт",
        flex: 1.9,
        minWidth: 280,
        renderCell: (params) => <ProductIdentity compact product={params?.row?.items?.[0]?.product} />
      },
      {
        field: "paymentStatus",
        headerName: "Плащане",
        flex: 0.65,
        minWidth: 105,
        valueFormatter: (params) => paymentStatusLabels[params?.value ?? params] || "-"
      },
      {
        field: "totalAmount",
        headerName: "Общо",
        flex: 0.75,
        minWidth: 140,
        valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0)
      },
      {
        field: "actions",
        headerName: "",
        sortable: false,
        filterable: false,
        width: 150,
        align: "center",
        renderCell: (params) => <GridRowActions onPrint={() => printOrder(params.row)} onEdit={() => openEditDialog(params.row)} onDelete={() => setDeletingOrder(params.row)} />
      }
    ],
    [canSeeOrderAuthor]
  );

  useEffect(() => {
    if (!selectedProduct || editingOrder) return;
    setForm((current) => {
      const quantity = Number(current.quantity || 1);
      const unitPrice = current.unitPrice || String(selectedProduct.price ?? "");
      const totalAmount = Number(unitPrice || 0) * quantity;
      return { ...current, unitPrice, totalAmount: totalAmount ? totalAmount.toFixed(2) : current.totalAmount };
    });
  }, [selectedProduct, editingOrder]);

  function openEditDialog(order) {
    const item = order.items?.[0] || {};
    setEditingOrder({
      _id: order._id,
      orderNumber: order.orderNumber || "",
      store: order.store?._id || "",
      customer: order.customer?._id || "",
      product: item.product?._id || "",
      quantity: String(item.quantity ?? 1),
      unitPrice: String(item.unitPrice ?? ""),
      totalAmount: String(order.totalAmount ?? ""),
      status: order.status || "pending",
      paymentStatus: order.paymentStatus || "unpaid"
    });
  }

  async function handleCreate() {
    const validationMessage = validateOrder(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.post("/orders", {
        store: form.store,
        customer: form.customer || undefined,
        status: form.status,
        paymentStatus: form.paymentStatus,
        totalAmount: Number(form.totalAmount),
        items: [{ product: form.product, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) }]
      });
      setData((current) => [response.data, ...current]);
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
      const response = await api.put(`/orders/${editingOrder._id}`, {
        orderNumber: editingOrder.orderNumber.trim(),
        store: editingOrder.store,
        customer: editingOrder.customer || undefined,
        status: editingOrder.status,
        paymentStatus: editingOrder.paymentStatus,
        totalAmount: Number(editingOrder.totalAmount),
        items: [{ product: editingOrder.product, quantity: Number(editingOrder.quantity), unitPrice: Number(editingOrder.unitPrice) }]
      });
      setData((current) => current.map((item) => (item._id === editingOrder._id ? response.data : item)));
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
      setDeletingOrder(null);
      toast.success("Продажбата е изтрита.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно изтриване на продажба.");
    }
  }

  function updateDraft(setter, nextPatch) {
    setter((current) => {
      const next = { ...current, ...nextPatch };
      if ("quantity" in nextPatch || "unitPrice" in nextPatch) {
        const totalAmount = Number(next.quantity || 0) * Number(next.unitPrice || 0);
        next.totalAmount = totalAmount ? totalAmount.toFixed(2) : "";
      }
      return next;
    });
  }

  function applyScannedProduct(rawCode, setter, clearScan, activeDraft) {
    const code = normalizeScanCode(rawCode);
    if (!code) return;

    const product = findProductByScanCode(products, code);
    if (!product) {
      toast.error(`Няма продукт с номер/баркод/SKU ${code}.`);
      return;
    }

    setter((current) => {
      const currentQuantity = Number(current.quantity || 0);
      const isSameProduct = current.product === product._id;
      const quantity = isSameProduct ? String(currentQuantity + 1) : current.quantity || "1";
      const unitPrice = String(product.price ?? current.unitPrice ?? "");
      const totalAmount = Number(quantity || 0) * Number(unitPrice || 0);

      return {
        ...current,
        product: product._id,
        quantity,
        unitPrice,
        totalAmount: totalAmount ? totalAmount.toFixed(2) : ""
      };
    });
    clearScan("");
    toast.success(activeDraft?.product === product._id ? "Количество +1." : `Избран продукт: ${product.name}`);
  }

  function handleScanKeyDown(event, setter, clearScan, activeDraft) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    applyScannedProduct(event.currentTarget.value, setter, clearScan, activeDraft);
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Продажби"
        title="Продажби и търговски поток"
        subtitle="Създавай, редактирай и изтривай продажби с визуален избор на продукт."
        icon={<ReceiptLongRoundedIcon />}
      />

      <DataSection
        title="Регистър на продажбите"
        subtitle="Последни търговски операции"
        icon={<ReceiptLongRoundedIcon />}
        actions={
          <Button variant="contained" startIcon={<AddShoppingCartRoundedIcon />} onClick={() => setOpen(true)}>
            Нова продажба
          </Button>
        }
      >
        <ResponsiveTable>
          <DataGrid loading={loading} rowHeight={52} columnHeaderHeight={44} rows={orders} getRowId={(row) => row._id} columns={orderColumns} disableRowSelectionOnClick />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>Нова продажба</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <TextField
              fullWidth
              label="Сканирай номер, баркод или SKU"
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              onKeyDown={(e) => handleScanKeyDown(e, setForm, setScanCode, form)}
              helperText="Работи с USB/Bluetooth баркод четец. След сканиране натисни Enter, ако четецът не го изпраща автоматично."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <QrCodeScannerRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button size="small" onClick={() => applyScannedProduct(scanCode, setForm, setScanCode, form)}>
                      Добави
                    </Button>
                  </InputAdornment>
                )
              }}
            />
            <FormGrid min={230}>
              <TextField label="Номер на продажба" value={form.orderNumber} disabled />
              <TextField select label="Магазин" value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })}>
                {stores.map((store) => (
                  <MenuItem key={store._id} value={store._id}>
                    {store.name} | {store.city}
                  </MenuItem>
                ))}
              </TextField>
              <TextField select label="Клиент" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })}>
                <MenuItem value="">Клиент на място</MenuItem>
                {customers.map((customer) => (
                  <MenuItem key={customer._id} value={customer._id}>
                    {getCustomerDisplayName(customer)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Продукт"
                value={form.product}
                onChange={(e) =>
                  updateDraft(setForm, {
                    product: e.target.value,
                    unitPrice: String(products.find((product) => product._id === e.target.value)?.price ?? form.unitPrice)
                  })
                }
              >
                {products.map((product) => (
                  <MenuItem key={product._id} value={product._id}>
                    {product.name} | {product.sku}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label="Количество" type="number" value={form.quantity} onChange={(e) => updateDraft(setForm, { quantity: e.target.value })} />
              <TextField label="Единична цена" type="number" value={form.unitPrice} onChange={(e) => updateDraft(setForm, { unitPrice: e.target.value })} />
              <TextField label="Крайна сума" type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} />
            </FormGrid>
            <FormGridFull>
              <ProductPreviewCard product={selectedProduct} />
            </FormGridFull>
            <FormGridFull>
              <Typography variant="body2" color={selectedInventory ? "text.primary" : "warning.main"} fontWeight={700}>
                Наличност в избрания магазин: {selectedInventory ? `${selectedInventory.quantity} бр.` : "няма наличност"}
              </Typography>
            </FormGridFull>
          </Stack>
        </DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setOpen(false)} onConfirm={handleCreate} />
      </Dialog>

      <Dialog open={Boolean(editingOrder)} onClose={() => setEditingOrder(null)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>Редактиране на продажба</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <TextField
              fullWidth
              label="Сканирай номер, баркод или SKU"
              value={editScanCode}
              onChange={(e) => setEditScanCode(e.target.value)}
              onKeyDown={(e) => handleScanKeyDown(e, setEditingOrder, setEditScanCode, editingOrder)}
              helperText="Сканирай нов продукт или същия продукт за +1 към количеството."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <QrCodeScannerRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button size="small" onClick={() => applyScannedProduct(editScanCode, setEditingOrder, setEditScanCode, editingOrder)}>
                      Добави
                    </Button>
                  </InputAdornment>
                )
              }}
            />
            <FormGrid min={230}>
              <TextField
                label="Номер на продажба"
                value={editingOrder?.orderNumber || ""}
                onChange={(e) => setEditingOrder((current) => ({ ...current, orderNumber: e.target.value }))}
              />
              <TextField
                select
                label="Магазин"
                value={editingOrder?.store || ""}
                onChange={(e) => setEditingOrder((current) => ({ ...current, store: e.target.value }))}
              >
                {stores.map((store) => (
                  <MenuItem key={store._id} value={store._id}>
                    {store.name} | {store.city}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Клиент"
                value={editingOrder?.customer || ""}
                onChange={(e) => setEditingOrder((current) => ({ ...current, customer: e.target.value }))}
              >
                <MenuItem value="">Клиент на място</MenuItem>
                {customers.map((customer) => (
                  <MenuItem key={customer._id} value={customer._id}>
                    {getCustomerDisplayName(customer)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Продукт"
                value={editingOrder?.product || ""}
                onChange={(e) =>
                  updateDraft(setEditingOrder, {
                    product: e.target.value,
                    unitPrice: String(products.find((product) => product._id === e.target.value)?.price ?? editingOrder?.unitPrice)
                  })
                }
              >
                {products.map((product) => (
                  <MenuItem key={product._id} value={product._id}>
                    {product.name} | {product.sku}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Количество"
                type="number"
                value={editingOrder?.quantity || "1"}
                onChange={(e) => updateDraft(setEditingOrder, { quantity: e.target.value })}
              />
              <TextField
                label="Единична цена"
                type="number"
                value={editingOrder?.unitPrice || ""}
                onChange={(e) => updateDraft(setEditingOrder, { unitPrice: e.target.value })}
              />
              <TextField
                label="Крайна сума"
                type="number"
                value={editingOrder?.totalAmount || ""}
                onChange={(e) => setEditingOrder((current) => ({ ...current, totalAmount: e.target.value }))}
              />
              <TextField
                select
                label="Статус"
                value={editingOrder?.status || "pending"}
                onChange={(e) => setEditingOrder((current) => ({ ...current, status: e.target.value }))}
              >
                <MenuItem value="pending">Чакаща</MenuItem>
                <MenuItem value="confirmed">Потвърдена</MenuItem>
                <MenuItem value="fulfilled">Изпълнена</MenuItem>
                <MenuItem value="cancelled">Отказана</MenuItem>
              </TextField>
              <TextField
                select
                label="Плащане"
                value={editingOrder?.paymentStatus || "unpaid"}
                onChange={(e) => setEditingOrder((current) => ({ ...current, paymentStatus: e.target.value }))}
              >
                <MenuItem value="unpaid">Неплатена</MenuItem>
                <MenuItem value="partial">Частично</MenuItem>
                <MenuItem value="paid">Платена</MenuItem>
              </TextField>
            </FormGrid>
            <FormGridFull>
              <ProductPreviewCard product={selectedProduct} />
            </FormGridFull>
          </Stack>
        </DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setEditingOrder(null)} onConfirm={handleUpdate} />
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deletingOrder)}
        title="Изтриване на продажба"
        description={`Сигурен ли си, че искаш да изтриеш ${deletingOrder?.orderNumber || "тази продажба"}?`}
        onClose={() => setDeletingOrder(null)}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}
