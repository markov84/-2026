import { useState } from "react";
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid2 as Grid, MenuItem, Stack, TextField } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import DataSection from "../components/DataSection";
import { FormGrid } from "../components/FormGrid";
import GridRowActions from "../components/GridRowActions";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import StatCard from "../components/StatCard";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";
import api from "../lib/api";
import { formatCurrencyEUR } from "../lib/currency";

const initialEntry = { type: "income", category: "", description: "", amount: "", store: "" };

function buildFinanceState(entries) {
  const income = entries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const expenses = entries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const bank = entries.filter((entry) => entry.type === "bank").reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  return {
    summary: {
      income,
      expenses,
      bank,
      net: income - expenses
    },
    entries
  };
}

export default function FinancePageFixed() {
  const { data, loading, setData } = useFetch("/finance");
  const { data: stores } = useFetch("/stores");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialEntry);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingEntry, setDeletingEntry] = useState(null);
  const isMobile = useMobileDetection();
  const summary = data?.summary || {};

  async function handleCreate() {
    try {
      const response = await api.post("/finance", {
        ...form,
        amount: Number(form.amount),
        store: form.store || undefined
      });
      setData((current) => buildFinanceState([response.data, ...(current?.entries || [])]));
      setForm(initialEntry);
      setOpen(false);
      toast.success("Финансовият запис е добавен.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно добавяне на финансов запис.");
    }
  }

  function openEditDialog(entry) {
    setEditingEntry({
      _id: entry._id,
      type: entry.type || "income",
      category: entry.category || "",
      description: entry.description || "",
      amount: String(entry.amount ?? ""),
      store: entry.store?._id || ""
    });
  }

  async function handleUpdate() {
    if (!editingEntry?._id) return;

    try {
      const response = await api.put(`/finance/${editingEntry._id}`, {
        type: editingEntry.type,
        category: editingEntry.category,
        description: editingEntry.description,
        amount: Number(editingEntry.amount),
        store: editingEntry.store || undefined
      });
      setData((current) =>
        buildFinanceState((current?.entries || []).map((item) => (item._id === editingEntry._id ? response.data : item)))
      );
      setEditingEntry(null);
      toast.success("Финансовият запис е обновен.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешна редакция на запис.");
    }
  }

  async function handleDelete() {
    if (!deletingEntry?._id) return;

    try {
      await api.delete(`/finance/${deletingEntry._id}`);
      setData((current) =>
        buildFinanceState((current?.entries || []).filter((item) => item._id !== deletingEntry._id))
      );
      setDeletingEntry(null);
      toast.success("Финансовият запис е изтрит.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно изтриване на запис.");
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Финанси"
        title="Финансов дневник"
        subtitle="Приходи, разходи и банка с редакция и изтриване на всеки запис."
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Приходи" value={formatCurrencyEUR(summary.income)} accent="success" /></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Разходи" value={formatCurrencyEUR(summary.expenses)} accent="warning" /></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Банка" value={formatCurrencyEUR(summary.bank)} accent="primary" /></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Нетен резултат" value={formatCurrencyEUR(summary.net)} accent="secondary" /></Grid>
      </Grid>

      <DataSection
        title="Финансов дневник"
        subtitle="Редакция и триене на записи"
        actions={<Button variant="contained" onClick={() => setOpen(true)}>Добави запис</Button>}
      >
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
              { field: "amount", headerName: "Сума", flex: 0.8, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) },
              {
                field: "actions",
                headerName: "",
                sortable: false,
                filterable: false,
                width: 110,
                align: "center",
                renderCell: (params) => (
                  <GridRowActions onEdit={() => openEditDialog(params.row)} onDelete={() => setDeletingEntry(params.row)} />
                )
              }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
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
              <MenuItem value="">Централа</MenuItem>
              {stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}
            </TextField>
          </FormGrid>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: "column", sm: "row" }, p: 2, gap: 1 }}>
          <Button fullWidth={isMobile} onClick={() => setOpen(false)}>Отказ</Button>
          <Button fullWidth={isMobile} variant="contained" onClick={handleCreate}>Запази</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editingEntry)} onClose={() => setEditingEntry(null)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>Редактиране на финансов запис</DialogTitle>
        <DialogContent dividers>
          <FormGrid min={240}>
            <TextField select fullWidth label="Тип" value={editingEntry?.type || "income"} onChange={(e) => setEditingEntry((current) => ({ ...current, type: e.target.value }))}>
              <MenuItem value="income">Приход</MenuItem>
              <MenuItem value="expense">Разход</MenuItem>
              <MenuItem value="bank">Банка</MenuItem>
            </TextField>
            <TextField fullWidth label="Категория" value={editingEntry?.category || ""} onChange={(e) => setEditingEntry((current) => ({ ...current, category: e.target.value }))} />
            <TextField fullWidth label="Описание" value={editingEntry?.description || ""} onChange={(e) => setEditingEntry((current) => ({ ...current, description: e.target.value }))} />
            <TextField fullWidth label="Сума" type="number" value={editingEntry?.amount || ""} onChange={(e) => setEditingEntry((current) => ({ ...current, amount: e.target.value }))} />
            <TextField select fullWidth label="Магазин" value={editingEntry?.store || ""} onChange={(e) => setEditingEntry((current) => ({ ...current, store: e.target.value }))}>
              <MenuItem value="">Централа</MenuItem>
              {stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}
            </TextField>
          </FormGrid>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: "column", sm: "row" }, p: 2, gap: 1 }}>
          <Button fullWidth={isMobile} onClick={() => setEditingEntry(null)}>Отказ</Button>
          <Button fullWidth={isMobile} variant="contained" onClick={handleUpdate}>Запази</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deletingEntry)}
        title="Изтриване на финансов запис"
        description={`Сигурен ли си, че искаш да изтриеш "${deletingEntry?.category || "този запис"}"?`}
        onClose={() => setDeletingEntry(null)}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}
