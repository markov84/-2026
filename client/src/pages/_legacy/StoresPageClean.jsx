import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useState } from "react";
import toast from "react-hot-toast";
import api from "../lib/api";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import DataSection from "../components/DataSection";
import FormPanel from "../components/FormPanel";
import { FormGrid } from "../components/FormGrid";
import GridRowActions from "../components/GridRowActions";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";

const emptyStore = { name: "", code: "", city: "", address: "" };

export default function StoresPageClean() {
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
      const response = await api.put(`/stores/${editingStore._id}`, {
        name: editingStore.name,
        code: editingStore.code,
        city: editingStore.city,
        address: editingStore.address
      });
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
      <PageHeader eyebrow="Мрежа от магазини" title="Управление на магазини" subtitle="Управлявай обекти, кодове и адреси от един по-ясен оперативен екран." />
      <FormPanel title="Добавяне на нов магазин" subtitle="Създай обект с код, град и адрес в по-подредена форма." actions={<Button variant="contained" onClick={addStore}>Добави магазин</Button>}>
        <FormGrid min={240}>
          <TextField fullWidth label="Име на магазин" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField fullWidth label="Код" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <TextField fullWidth label="Град" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <TextField fullWidth label="Адрес" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <TextField fullWidth disabled label="Тип обект" value="Търговски обект" />
        </FormGrid>
      </FormPanel>
      <DataSection title="Магазини" subtitle="Клонове и ключови оперативни данни">
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={data}
            getRowId={(row) => row._id}
            columns={[
              { field: "name", headerName: "Магазин", flex: 1.2, minWidth: 160 },
              { field: "code", headerName: "Код", flex: 0.7, minWidth: 100 },
              { field: "city", headerName: "Град", flex: 0.8, minWidth: 120 },
              { field: "address", headerName: "Адрес", flex: 1.5, minWidth: 180 },
              { field: "managerName", headerName: "Управител", flex: 1, minWidth: 140 }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>
    </Stack>
  );
}
