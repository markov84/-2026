import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import DataSection from "../components/DataSection";
import { FormGrid, FormGridFull } from "../components/FormGrid";
import GridRowActions from "../components/GridRowActions";
import PageHeader from "../components/PageHeader";
import { ProductIdentity, ProductPreviewCard } from "../components/ProductPresentation";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";
import api from "../lib/api";
import { formatCurrencyEUR } from "../lib/currency";

const initialOrder = {
  orderNumber: "",
  store: "",
  customer: "",
  product: "",
  quantity: "1",
  unitPrice: "",
  totalAmount: "",
  status: "pending",
  paymentStatus: "unpaid"
};

export default function OrdersPageCrud() {
  const { data: orders, loading, setData } = useFetch("/orders");
  const { data: stores } = useFetch("/stores");
  const { data: customers } = useFetch("/customers");
  const { data: products } = useFetch("/products");
  const { data: inventory } = useFetch("/inventory/summary");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialOrder);
  const [editingOrder, setEditingOrder] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const isMobile = useMobileDetection();

  const activeForm = editingOrder || form;
  const selectedProduct = useMemo(() => products.find((product) => product._id === activeForm.product), [products, activeForm.product]);
  const selectedInventory = useMemo(
    () => inventory.find((item) => item.product?._id === activeForm.product && item.store?._id === activeForm.store),
    [inventory, activeForm.product, activeForm.store]
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
    try {
      const response = await api.post("/orders", {
        orderNumber: form.orderNumber,
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

    try {
      const response = await api.put(`/orders/${editingOrder._id}`, {
        orderNumber: editingOrder.orderNumber,
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

  return (
    <Stack spacing={3}>
      <PageHeader eyebrow="Продажби" title="Продажби и търговски поток" subtitle="Създавай, редактирай и изтривай продажби с визуален избор на продукт." />

      <DataSection title="Регистър на продажбите" subtitle="Последни търговски операции" actions={<Button variant="contained" onClick={() => setOpen(true)}>Нова продажба</Button>}>
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={orders}
            getRowId={(row) => row._id}
            columns={[
              { field: "orderNumber", headerName: "Продажба", flex: 1, minWidth: 130 },
              { field: "customer", headerName: "Клиент", flex: 1.2, minWidth: 160, valueGetter: (_, row) => row.customer?.fullName || row.customer?.company || "На място" },
              { field: "store", headerName: "Магазин", flex: 1, minWidth: 140, valueGetter: (_, row) => row.store?.name || "-" },
              { field: "product", headerName: "Продукт", flex: 1.2, minWidth: 200, renderCell: (params) => <ProductIdentity compact product={params?.row?.items?.[0]?.product} /> },
              { field: "paymentStatus", headerName: "Плащане", flex: 0.9, minWidth: 120 },
              { field: "totalAmount", headerName: "Общо", flex: 1, minWidth: 180, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) },
              {
                field: "actions",
                headerName: "",
                sortable: false,
                filterable: false,
                width: 110,
                align: "center",
                renderCell: (params) => (
                  <GridRowActions onEdit={() => openEditDialog(params.row)} onDelete={() => setDeletingOrder(params.row)} />
                )
              }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>Нова продажба</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <FormGrid min={230}>
              <TextField label="Номер на продажба" value={form.orderNumber} onChange={(e) => setForm({ ...form, orderNumber: e.target.value })} />
              <TextField select label="Магазин" value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })}>{stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}</TextField>
              <TextField select label="Клиент" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })}><MenuItem value="">Клиент на място</MenuItem>{customers.map((customer) => <MenuItem key={customer._id} value={customer._id}>{customer.fullName}</MenuItem>)}</TextField>
              <TextField select label="Продукт" value={form.product} onChange={(e) => updateDraft(setForm, { product: e.target.value, unitPrice: String(products.find((product) => product._id === e.target.value)?.price ?? form.unitPrice) })}>{products.map((product) => <MenuItem key={product._id} value={product._id}>{product.name} | {product.sku}</MenuItem>)}</TextField>
              <TextField label="Количество" type="number" value={form.quantity} onChange={(e) => updateDraft(setForm, { quantity: e.target.value })} />
              <TextField label="Единична цена" type="number" value={form.unitPrice} onChange={(e) => updateDraft(setForm, { unitPrice: e.target.value })} />
              <TextField label="Крайна сума" type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} />
            </FormGrid>
            <FormGridFull><ProductPreviewCard product={selectedProduct} /></FormGridFull>
            <FormGridFull>
              <Typography variant="body2" color={selectedInventory ? "text.primary" : "warning.main"} fontWeight={700}>
                Наличност в избрания магазин: {selectedInventory ? `${selectedInventory.quantity} бр.` : "няма наличност"}
              </Typography>
            </FormGridFull>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: "column", sm: "row" }, p: 2, gap: 1 }}>
          <Button fullWidth={isMobile} onClick={() => setOpen(false)}>Отказ</Button>
          <Button fullWidth={isMobile} variant="contained" onClick={handleCreate}>Запази</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editingOrder)} onClose={() => setEditingOrder(null)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>Редактиране на продажба</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <FormGrid min={230}>
              <TextField label="Номер на продажба" value={editingOrder?.orderNumber || ""} onChange={(e) => setEditingOrder((current) => ({ ...current, orderNumber: e.target.value }))} />
              <TextField select label="Магазин" value={editingOrder?.store || ""} onChange={(e) => setEditingOrder((current) => ({ ...current, store: e.target.value }))}>{stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}</TextField>
              <TextField select label="Клиент" value={editingOrder?.customer || ""} onChange={(e) => setEditingOrder((current) => ({ ...current, customer: e.target.value }))}><MenuItem value="">Клиент на място</MenuItem>{customers.map((customer) => <MenuItem key={customer._id} value={customer._id}>{customer.fullName}</MenuItem>)}</TextField>
              <TextField select label="Продукт" value={editingOrder?.product || ""} onChange={(e) => updateDraft(setEditingOrder, { product: e.target.value, unitPrice: String(products.find((product) => product._id === e.target.value)?.price ?? editingOrder?.unitPrice) })}>{products.map((product) => <MenuItem key={product._id} value={product._id}>{product.name} | {product.sku}</MenuItem>)}</TextField>
              <TextField label="Количество" type="number" value={editingOrder?.quantity || "1"} onChange={(e) => updateDraft(setEditingOrder, { quantity: e.target.value })} />
              <TextField label="Единична цена" type="number" value={editingOrder?.unitPrice || ""} onChange={(e) => updateDraft(setEditingOrder, { unitPrice: e.target.value })} />
              <TextField label="Крайна сума" type="number" value={editingOrder?.totalAmount || ""} onChange={(e) => setEditingOrder((current) => ({ ...current, totalAmount: e.target.value }))} />
              <TextField select label="Статус" value={editingOrder?.status || "pending"} onChange={(e) => setEditingOrder((current) => ({ ...current, status: e.target.value }))}>
                <MenuItem value="pending">Чакаща</MenuItem>
                <MenuItem value="confirmed">Потвърдена</MenuItem>
                <MenuItem value="fulfilled">Изпълнена</MenuItem>
                <MenuItem value="cancelled">Отказана</MenuItem>
              </TextField>
              <TextField select label="Плащане" value={editingOrder?.paymentStatus || "unpaid"} onChange={(e) => setEditingOrder((current) => ({ ...current, paymentStatus: e.target.value }))}>
                <MenuItem value="unpaid">Неплатена</MenuItem>
                <MenuItem value="partial">Частично</MenuItem>
                <MenuItem value="paid">Платена</MenuItem>
              </TextField>
            </FormGrid>
            <FormGridFull><ProductPreviewCard product={selectedProduct} /></FormGridFull>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: "column", sm: "row" }, p: 2, gap: 1 }}>
          <Button fullWidth={isMobile} onClick={() => setEditingOrder(null)}>Отказ</Button>
          <Button fullWidth={isMobile} variant="contained" onClick={handleUpdate}>Запази</Button>
        </DialogActions>
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
