import { useState } from "react";
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid2 as Grid, MenuItem, Stack, TextField } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import api from "../lib/api";
import { formatCurrencyEUR } from "../lib/currency";
import DataSection from "../components/DataSection";
import { FormGrid } from "../components/FormGrid";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";

const initialInvoice = { invoiceNumber: "", customerName: "", customerVatNumber: "", store: "", description: "", quantity: "1", unitPrice: "", vatRate: "20" };

export default function InvoicesPageClean() {
  const { data: invoices, loading, setData } = useFetch("/invoices");
  const { data: stores } = useFetch("/stores");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialInvoice);
  const isMobile = useMobileDetection();

  async function handleCreate() {
    try {
      const response = await api.post("/invoices", {
        invoiceNumber: form.invoiceNumber,
        customerName: form.customerName,
        customerVatNumber: form.customerVatNumber || undefined,
        store: form.store || undefined,
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

  return (
    <Stack spacing={3}>
      <PageHeader eyebrow="Фактуриране" title="Фактури" subtitle="Създавай и преглеждай фактури с ДДС стойности и обвързване към магазин." />
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
              { field: "totalAmount", headerName: "Общо", flex: 0.9, minWidth: 110, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) }
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
    </Stack>
  );
}
