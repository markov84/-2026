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
import StatCard from "../components/StatCard";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";

const initialEntry = { type: "income", category: "", description: "", amount: "", store: "" };

export default function FinancePageClean() {
  const { data, loading, setData } = useFetch("/finance");
  const { data: stores } = useFetch("/stores");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialEntry);
  const isMobile = useMobileDetection();

  async function handleCreate() {
    try {
      const response = await api.post("/finance", { ...form, amount: Number(form.amount), store: form.store || undefined });
      const amount = Number(form.amount);
      setData((current) => ({
        ...current,
        summary: {
          income: (current.summary?.income || 0) + (form.type === "income" ? amount : 0),
          expenses: (current.summary?.expenses || 0) + (form.type === "expense" ? amount : 0),
          bank: (current.summary?.bank || 0) + (form.type === "bank" ? amount : 0),
          net: (current.summary?.net || 0) + (form.type === "income" ? amount : 0) - (form.type === "expense" ? amount : 0)
        },
        entries: [response.data, ...(current.entries || [])]
      }));
      setForm(initialEntry);
      setOpen(false);
      toast.success("Финансовият запис е добавен.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно добавяне на финансов запис.");
    }
  }

  const summary = data?.summary || {};

  return (
    <Stack spacing={3}>
      <PageHeader eyebrow="Финансов контрол" title="Паричен поток, разходи и банкова позиция" subtitle="Следи състоянието на бизнеса и записвай ключовите финансови движения по магазини." />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Приходи" value={formatCurrencyEUR(summary.income)} accent="success" /></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Разходи" value={formatCurrencyEUR(summary.expenses)} accent="warning" /></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Банка" value={formatCurrencyEUR(summary.bank)} accent="primary" /></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Нетен резултат" value={formatCurrencyEUR(summary.net)} accent="secondary" /></Grid>
      </Grid>
      <DataSection title="Финансов дневник" subtitle="Приходи, разходи и банкови движения" actions={<Button variant="contained" onClick={() => setOpen(true)}>Добави запис</Button>}>
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={data?.entries || []}
            getRowId={(row) => row._id}
            columns={[
              { field: "type", headerName: "Тип", flex: 0.8, renderCell: (params) => <Chip label={params?.value || "-"} size="small" /> },
              { field: "category", headerName: "Категория", flex: 1.1 },
              { field: "description", headerName: "Описание", flex: 1.4 },
              { field: "store", headerName: "Магазин", flex: 1, valueGetter: (_, row) => row.store?.name || "Централа" },
              { field: "amount", headerName: "Сума", flex: 0.8, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile} PaperProps={{ sx: { borderRadius: { xs: 0, sm: 5 } } }}>
        <DialogTitle>Нов финансов запис</DialogTitle>
        <DialogContent dividers>
          <FormGrid min={240}>
            <TextField select fullWidth label="Тип" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <MenuItem value="income">Приход</MenuItem>
              <MenuItem value="expense">Разход</MenuItem>
              <MenuItem value="bank">Банка</MenuItem>
            </TextField>
            <TextField fullWidth label="Категория" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <TextField fullWidth label="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <TextField fullWidth label="Сума" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <TextField select fullWidth label="Магазин" value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })}>
              <MenuItem value="">Централни финанси</MenuItem>
              {stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}
            </TextField>
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


