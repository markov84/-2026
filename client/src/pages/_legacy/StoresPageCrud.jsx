import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import DataSection from "../components/DataSection";
import { FormGrid } from "../components/FormGrid";
import FormPanel from "../components/FormPanel";
import GridRowActions from "../components/GridRowActions";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";
import api from "../lib/api";

const emptyStore = { name: "", code: "", city: "", address: "" };

export default function StoresPageCrud() {
  const { data, loading, setData } = useFetch("/stores");
  const [form, setForm] = useState(emptyStore);
  const [editingStore, setEditingStore] = useState(null);
  const [deletingStore, setDeletingStore] = useState(null);
  const isMobile = useMobileDetection();

  async function addStore() {
    try {
      const response = await api.post("/stores", form);
      setData((current) => [...current, response.data]);
      setForm(emptyStore);
      toast.success("Магазинът е добавен.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно създаване на магазин.");
    }
  }

  function openEditDialog(store) {
    setEditingStore({
      _id: store._id,
      name: store.name || "",
      code: store.code || "",
      city: store.city || "",
      address: store.address || ""
    });
  }

  async function handleUpdate() {
    if (!editingStore?._id) return;

    try {
      const response = await api.put(`/stores/${editingStore._id}`, editingStore);
      setData((current) => current.map((item) => (item._id === editingStore._id ? response.data : item)));
      setEditingStore(null);
      toast.success("Магазинът е обновен.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешна редакция на магазин.");
    }
  }

  async function handleDelete() {
    if (!deletingStore?._id) return;

    try {
      await api.delete(`/stores/${deletingStore._id}`);
      setData((current) => current.filter((item) => item._id !== deletingStore._id));
      setDeletingStore(null);
      toast.success("Магазинът е изтрит.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно изтриване на магазин.");
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader eyebrow="Магазини" title="Управление на магазини" subtitle="Поддържай обекти, кодове и адреси от един работен екран." />

      <FormPanel title="Нов магазин" subtitle="Създай обект с код, град и адрес." actions={<Button variant="contained" onClick={addStore}>Добави магазин</Button>}>
        <FormGrid min={240}>
          <TextField fullWidth label="Име" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField fullWidth label="Код" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <TextField fullWidth label="Град" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <TextField fullWidth label="Адрес" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </FormGrid>
      </FormPanel>

      <DataSection title="Списък с магазини" subtitle="Редакция и триене на всеки запис">
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={data}
            getRowId={(row) => row._id}
            columns={[
              { field: "name", headerName: "Магазин", flex: 1.2, minWidth: 180 },
              { field: "code", headerName: "Код", flex: 0.7, minWidth: 100 },
              { field: "city", headerName: "Град", flex: 0.8, minWidth: 120 },
              { field: "address", headerName: "Адрес", flex: 1.3, minWidth: 200 },
              {
                field: "actions",
                headerName: "",
                sortable: false,
                filterable: false,
                width: 110,
                align: "center",
                renderCell: (params) => (
                  <GridRowActions onEdit={() => openEditDialog(params.row)} onDelete={() => setDeletingStore(params.row)} />
                )
              }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={Boolean(editingStore)} onClose={() => setEditingStore(null)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>Редактиране на магазин</DialogTitle>
        <DialogContent dividers>
          <FormGrid min={240}>
            <TextField fullWidth label="Име" value={editingStore?.name || ""} onChange={(e) => setEditingStore((current) => ({ ...current, name: e.target.value }))} />
            <TextField fullWidth label="Код" value={editingStore?.code || ""} onChange={(e) => setEditingStore((current) => ({ ...current, code: e.target.value }))} />
            <TextField fullWidth label="Град" value={editingStore?.city || ""} onChange={(e) => setEditingStore((current) => ({ ...current, city: e.target.value }))} />
            <TextField fullWidth label="Адрес" value={editingStore?.address || ""} onChange={(e) => setEditingStore((current) => ({ ...current, address: e.target.value }))} />
          </FormGrid>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: "column", sm: "row" }, p: 2, gap: 1 }}>
          <Button fullWidth={isMobile} onClick={() => setEditingStore(null)}>Отказ</Button>
          <Button fullWidth={isMobile} variant="contained" onClick={handleUpdate}>Запази</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deletingStore)}
        title="Изтриване на магазин"
        description={`Сигурен ли си, че искаш да изтриеш ${deletingStore?.name || "този магазин"}?`}
        onClose={() => setDeletingStore(null)}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}
