import { useState } from "react";
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import DataSection from "../components/DataSection";
import { FormGrid } from "../components/FormGrid";
import GridRowActions from "../components/GridRowActions";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";
import api from "../lib/api";
import { formatCurrencyEUR } from "../lib/currency";

const initialInvoice = {
  invoiceNumber: "",
  customerName: "",
  customerVatNumber: "",
  store: "",
  description: "",
  quantity: "1",
  unitPrice: "",
  vatRate: "20",
  status: "issued"
};

export default function InvoicesPageCrud() {
  const { data: invoices, loading, setData } = useFetch("/invoices");
  const { data: stores } = useFetch("/stores");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialInvoice);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [deletingInvoice, setDeletingInvoice] = useState(null);
  const isMobile = useMobileDetection();

  async function handleCreate() {
    try {
      const response = await api.post("/invoices", {
        invoiceNumber: form.invoiceNumber,
        customerName: form.customerName,
        customerVatNumber: form.customerVatNumber || undefined,
        store: form.store || undefined,
        status: form.status,
        items: [{ description: form.description, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice), vatRate: Number(form.vatRate) }]
      });
      setData((current) => [response.data, ...current]);
      setForm(initialInvoice);
      setOpen(false);
      toast.success("Фактурата е създадена.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно създаване на фактура.");
    }
  }

  function openEditDialog(invoice) {
    const item = invoice.items?.[0] || {};
    setEditingInvoice({
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber || "",
      customerName: invoice.customerName || "",
      customerVatNumber: invoice.customerVatNumber || "",
      store: invoice.store?._id || "",
      description: item.description || "",
      quantity: String(item.quantity ?? 1),
      unitPrice: String(item.unitPrice ?? ""),
      vatRate: String(item.vatRate ?? 20),
      status: invoice.status || "issued"
    });
  }

  async function handleUpdate() {
    if (!editingInvoice?._id) return;

    try {
      const response = await api.put(`/invoices/${editingInvoice._id}`, {
        invoiceNumber: editingInvoice.invoiceNumber,
        customerName: editingInvoice.customerName,
        customerVatNumber: editingInvoice.customerVatNumber || undefined,
        store: editingInvoice.store || undefined,
        status: editingInvoice.status,
        items: [{ description: editingInvoice.description, quantity: Number(editingInvoice.quantity), unitPrice: Number(editingInvoice.unitPrice), vatRate: Number(editingInvoice.vatRate) }]
      });
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

  return (
    <Stack spacing={3}>
      <PageHeader eyebrow="Фактуриране" title="Фактури" subtitle="Редакция и изтриване на издадените документи." />

      <DataSection title="Регистър на фактурите" subtitle="Издадени документи за продажби" actions={<Button variant="contained" onClick={() => setOpen(true)}>Нова фактура</Button>}>
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={invoices}
            getRowId={(row) => row._id}
            columns={[
              { field: "invoiceNumber", headerName: "Фактура", flex: 1, minWidth: 140 },
              { field: "customerName", headerName: "Клиент", flex: 1.2, minWidth: 160 },
              { field: "store", headerName: "Магазин", flex: 1, minWidth: 140, valueGetter: (_, row) => row.store?.name || "Централа" },
              { field: "status", headerName: "Статус", flex: 0.8, minWidth: 120, renderCell: (params) => <Chip label={params?.value || "-"} size="small" color={params?.value === "paid" ? "success" : "default"} /> },
              { field: "vatAmount", headerName: "ДДС", flex: 0.8, minWidth: 110, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) },
              { field: "totalAmount", headerName: "Общо", flex: 0.9, minWidth: 110, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) },
              {
                field: "actions",
                headerName: "",
                sortable: false,
                filterable: false,
                width: 110,
                align: "center",
                renderCell: (params) => (
                  <GridRowActions onEdit={() => openEditDialog(params.row)} onDelete={() => setDeletingInvoice(params.row)} />
                )
              }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>Нова фактура</DialogTitle>
        <DialogContent dividers>
          <FormGrid min={240}>
            <TextField fullWidth label="Номер на фактура" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
            <TextField fullWidth label="Клиент" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            <TextField fullWidth label="ДДС номер" value={form.customerVatNumber} onChange={(e) => setForm({ ...form, customerVatNumber: e.target.value })} />
            <TextField select fullWidth label="Магазин" value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })}>
              <MenuItem value="">Централа</MenuItem>
              {stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}
            </TextField>
            <TextField fullWidth label="Описание на позицията" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <TextField fullWidth label="Количество" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <TextField fullWidth label="Единична цена" type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
            <TextField fullWidth label="ДДС ставка" type="number" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })} />
          </FormGrid>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: "column", sm: "row" }, p: 2, gap: 1 }}>
          <Button fullWidth={isMobile} onClick={() => setOpen(false)}>Отказ</Button>
          <Button fullWidth={isMobile} variant="contained" onClick={handleCreate}>Запази</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editingInvoice)} onClose={() => setEditingInvoice(null)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>Редактиране на фактура</DialogTitle>
        <DialogContent dividers>
          <FormGrid min={240}>
            <TextField fullWidth label="Номер на фактура" value={editingInvoice?.invoiceNumber || ""} onChange={(e) => setEditingInvoice((current) => ({ ...current, invoiceNumber: e.target.value }))} />
            <TextField fullWidth label="Клиент" value={editingInvoice?.customerName || ""} onChange={(e) => setEditingInvoice((current) => ({ ...current, customerName: e.target.value }))} />
            <TextField fullWidth label="ДДС номер" value={editingInvoice?.customerVatNumber || ""} onChange={(e) => setEditingInvoice((current) => ({ ...current, customerVatNumber: e.target.value }))} />
            <TextField select fullWidth label="Магазин" value={editingInvoice?.store || ""} onChange={(e) => setEditingInvoice((current) => ({ ...current, store: e.target.value }))}>
              <MenuItem value="">Централа</MenuItem>
              {stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}
            </TextField>
            <TextField fullWidth label="Описание на позицията" value={editingInvoice?.description || ""} onChange={(e) => setEditingInvoice((current) => ({ ...current, description: e.target.value }))} />
            <TextField fullWidth label="Количество" type="number" value={editingInvoice?.quantity || "1"} onChange={(e) => setEditingInvoice((current) => ({ ...current, quantity: e.target.value }))} />
            <TextField fullWidth label="Единична цена" type="number" value={editingInvoice?.unitPrice || ""} onChange={(e) => setEditingInvoice((current) => ({ ...current, unitPrice: e.target.value }))} />
            <TextField fullWidth label="ДДС ставка" type="number" value={editingInvoice?.vatRate || "20"} onChange={(e) => setEditingInvoice((current) => ({ ...current, vatRate: e.target.value }))} />
            <TextField select fullWidth label="Статус" value={editingInvoice?.status || "issued"} onChange={(e) => setEditingInvoice((current) => ({ ...current, status: e.target.value }))}>
              <MenuItem value="draft">Чернова</MenuItem>
              <MenuItem value="issued">Издадена</MenuItem>
              <MenuItem value="paid">Платена</MenuItem>
              <MenuItem value="cancelled">Анулирана</MenuItem>
            </TextField>
          </FormGrid>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: "column", sm: "row" }, p: 2, gap: 1 }}>
          <Button fullWidth={isMobile} onClick={() => setEditingInvoice(null)}>Отказ</Button>
          <Button fullWidth={isMobile} variant="contained" onClick={handleUpdate}>Запази</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deletingInvoice)}
        title="Изтриване на фактура"
        description={`Сигурен ли си, че искаш да изтриеш ${deletingInvoice?.invoiceNumber || "тази фактура"}?`}
        onClose={() => setDeletingInvoice(null)}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}
