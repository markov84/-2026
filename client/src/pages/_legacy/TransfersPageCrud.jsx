import { useMemo, useState } from "react";
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
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

const initialTransfer = {
  transferNumber: "",
  fromStore: "",
  toStore: "",
  product: "",
  quantity: "1",
  requestedBy: "",
  notes: "",
  status: "pending"
};

export default function TransfersPageCrud() {
  const { data: transfers, loading, setData } = useFetch("/transfers");
  const { data: stores } = useFetch("/stores");
  const { data: products } = useFetch("/products");
  const { data: inventory } = useFetch("/inventory/summary");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialTransfer);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [deletingTransfer, setDeletingTransfer] = useState(null);
  const isMobile = useMobileDetection();

  const activeForm = editingTransfer || form;
  const selectedProduct = useMemo(() => products.find((product) => product._id === activeForm.product), [products, activeForm.product]);
  const sourceInventory = useMemo(
    () => inventory.find((item) => item.product?._id === activeForm.product && item.store?._id === activeForm.fromStore),
    [inventory, activeForm.product, activeForm.fromStore]
  );

  async function handleCreate() {
    try {
      const response = await api.post("/transfers", {
        transferNumber: form.transferNumber,
        fromStore: form.fromStore,
        toStore: form.toStore,
        requestedBy: form.requestedBy,
        notes: form.notes,
        status: form.status,
        items: [{ product: form.product, quantity: Number(form.quantity) }]
      });
      setData((current) => [response.data, ...current]);
      setForm(initialTransfer);
      setOpen(false);
      toast.success("Трансферът е създаден.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно създаване на трансфер.");
    }
  }

  function openEditDialog(transfer) {
    const item = transfer.items?.[0] || {};
    setEditingTransfer({
      _id: transfer._id,
      transferNumber: transfer.transferNumber || "",
      fromStore: transfer.fromStore?._id || "",
      toStore: transfer.toStore?._id || "",
      product: item.product?._id || "",
      quantity: String(item.quantity ?? 1),
      requestedBy: transfer.requestedBy || "",
      notes: transfer.notes || "",
      status: transfer.status || "pending"
    });
  }

  async function handleUpdate() {
    if (!editingTransfer?._id) return;

    try {
      const response = await api.put(`/transfers/${editingTransfer._id}`, {
        transferNumber: editingTransfer.transferNumber,
        fromStore: editingTransfer.fromStore,
        toStore: editingTransfer.toStore,
        requestedBy: editingTransfer.requestedBy,
        notes: editingTransfer.notes,
        status: editingTransfer.status,
        items: [{ product: editingTransfer.product, quantity: Number(editingTransfer.quantity) }]
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
      <PageHeader eyebrow="Логистика" title="Трансфери между магазини" subtitle="Създавай, редактирай и изтривай трансфери от един екран." />

      <DataSection title="Регистър на трансферите" subtitle="Редакция и триене на заявки за движение на стока" actions={<Button variant="contained" onClick={() => setOpen(true)}>Нов трансфер</Button>}>
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={transfers}
            getRowId={(row) => row._id}
            columns={[
              { field: "transferNumber", headerName: "Трансфер", flex: 1, minWidth: 140 },
              { field: "fromStore", headerName: "От", flex: 1, minWidth: 140, valueGetter: (_, row) => row.fromStore?.name || "-" },
              { field: "toStore", headerName: "Към", flex: 1, minWidth: 140, valueGetter: (_, row) => row.toStore?.name || "-" },
              { field: "product", headerName: "Продукт", flex: 1.2, minWidth: 200, renderCell: (params) => <ProductIdentity compact product={params?.row?.items?.[0]?.product} /> },
              { field: "status", headerName: "Статус", flex: 0.9, minWidth: 120, renderCell: (params) => <Chip label={params?.value || "-"} size="small" color={params?.value === "completed" ? "success" : "warning"} /> },
              { field: "requestedBy", headerName: "Заявил", flex: 1, minWidth: 140 },
              {
                field: "actions",
                headerName: "",
                sortable: false,
                filterable: false,
                width: 110,
                align: "center",
                renderCell: (params) => (
                  <GridRowActions onEdit={() => openEditDialog(params.row)} onDelete={() => setDeletingTransfer(params.row)} />
                )
              }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>Нов трансфер</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <FormGrid min={230}>
              <TextField label="Номер на трансфер" value={form.transferNumber} onChange={(e) => setForm({ ...form, transferNumber: e.target.value })} />
              <TextField label="Заявил" value={form.requestedBy} onChange={(e) => setForm({ ...form, requestedBy: e.target.value })} />
              <TextField select label="От магазин" value={form.fromStore} onChange={(e) => setForm({ ...form, fromStore: e.target.value })}>{stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}</TextField>
              <TextField select label="Към магазин" value={form.toStore} onChange={(e) => setForm({ ...form, toStore: e.target.value })}>{stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}</TextField>
              <TextField select label="Продукт" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>{products.map((product) => <MenuItem key={product._id} value={product._id}>{product.name} | {product.sku}</MenuItem>)}</TextField>
              <TextField label="Количество" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </FormGrid>
            <FormGridFull><ProductPreviewCard product={selectedProduct} /></FormGridFull>
            <FormGridFull>
              <Stack spacing={1.25}>
                <Typography variant="body2" color={sourceInventory ? "text.primary" : "warning.main"} fontWeight={700}>
                  Наличност в изходния магазин: {sourceInventory ? `${sourceInventory.quantity} бр.` : "няма наличност"}
                </Typography>
                <TextField multiline minRows={3} label="Бележки към трансфера" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Stack>
            </FormGridFull>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: "column", sm: "row" }, p: 2, gap: 1 }}>
          <Button fullWidth={isMobile} onClick={() => setOpen(false)}>Отказ</Button>
          <Button fullWidth={isMobile} variant="contained" onClick={handleCreate}>Запази</Button>
        </DialogActions>
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
              <TextField select label="Продукт" value={editingTransfer?.product || ""} onChange={(e) => setEditingTransfer((current) => ({ ...current, product: e.target.value }))}>{products.map((product) => <MenuItem key={product._id} value={product._id}>{product.name} | {product.sku}</MenuItem>)}</TextField>
              <TextField label="Количество" type="number" value={editingTransfer?.quantity || "1"} onChange={(e) => setEditingTransfer((current) => ({ ...current, quantity: e.target.value }))} />
              <TextField select label="Статус" value={editingTransfer?.status || "pending"} onChange={(e) => setEditingTransfer((current) => ({ ...current, status: e.target.value }))}>
                <MenuItem value="draft">Чернова</MenuItem>
                <MenuItem value="pending">Чакащ</MenuItem>
                <MenuItem value="in_transit">В транспорт</MenuItem>
                <MenuItem value="completed">Завършен</MenuItem>
                <MenuItem value="cancelled">Отказан</MenuItem>
              </TextField>
            </FormGrid>
            <FormGridFull>
              <TextField multiline minRows={3} label="Бележки към трансфера" value={editingTransfer?.notes || ""} onChange={(e) => setEditingTransfer((current) => ({ ...current, notes: e.target.value }))} />
            </FormGridFull>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: "column", sm: "row" }, p: 2, gap: 1 }}>
          <Button fullWidth={isMobile} onClick={() => setEditingTransfer(null)}>Отказ</Button>
          <Button fullWidth={isMobile} variant="contained" onClick={handleUpdate}>Запази</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deletingTransfer)}
        title="Изтриване на трансфер"
        description={`Сигурен ли си, че искаш да изтриеш ${deletingTransfer?.transferNumber || "този трансфер"}?`}
        onClose={() => setDeletingTransfer(null)}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}
