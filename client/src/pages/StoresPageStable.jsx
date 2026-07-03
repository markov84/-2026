import { useMemo, useState } from "react";
import AddBusinessRoundedIcon from "@mui/icons-material/AddBusinessRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import StoreMallDirectoryRoundedIcon from "@mui/icons-material/StoreMallDirectoryRounded";
import { Button, DialogContent, DialogTitle, InputAdornment, Stack, TextField } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import DataSection from "../components/DataSection";
import Dialog from "../components/DraggableDialog";
import DialogFooterActions from "../components/DialogFooterActions";
import { FormGrid } from "../components/FormGrid";
import FormPanel from "../components/FormPanel";
import GridRowActions from "../components/GridRowActions";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useBarcodeKeyboardScan } from "../hooks/useBarcodeKeyboardScan";
import { useMobileDetection } from "../hooks/useMobileDetection";
import api from "../lib/api";
import { formatDate } from "../lib/currency";

const emptyStore = { name: "", code: "", city: "", address: "" };

function validateStore(store) {
  if (!store?.name?.trim()) return "Името на магазина е задължително.";
  if (!store?.code?.trim()) return "Кодът на магазина е задължителен.";
  return "";
}

export default function StoresPageStable() {
  const { data, loading, setData } = useFetch("/stores");
  const [form, setForm] = useState(emptyStore);
  const [query, setQuery] = useState("");
  const [editingStore, setEditingStore] = useState(null);
  const [deletingStore, setDeletingStore] = useState(null);
  const isMobile = useMobileDetection();

  const filteredStores = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return data;

    return data.filter((store) =>
      [store.name, store.code, store.city, store.address]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [data, query]);

  useBarcodeKeyboardScan((code) => setQuery(code));

  async function addStore() {
    const validationMessage = validateStore(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.post("/stores", {
        name: form.name.trim(),
        code: form.code.trim(),
        city: form.city.trim() || undefined,
        address: form.address.trim() || undefined
      });
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

    const validationMessage = validateStore(editingStore);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.put(`/stores/${editingStore._id}`, {
        name: editingStore.name.trim(),
        code: editingStore.code.trim(),
        city: editingStore.city.trim() || undefined,
        address: editingStore.address.trim() || undefined
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
      <PageHeader eyebrow="Магазини" title="Управление на магазини" subtitle="Поддържай обекти, кодове и адреси от един работен екран." icon={<StoreMallDirectoryRoundedIcon />} />

      <FormPanel title="Нов магазин" subtitle="Създай обект с код, град и адрес." icon={<AddBusinessRoundedIcon />} actions={<Button variant="contained" startIcon={<AddBusinessRoundedIcon />} onClick={addStore}>Добави магазин</Button>}>
        <FormGrid min={240}>
          <TextField fullWidth label="Име" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField fullWidth label="Код" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <TextField fullWidth label="Град" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <TextField fullWidth label="Адрес" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </FormGrid>
      </FormPanel>

      <DataSection
        title="Списък с магазини"
        subtitle="Редакция и триене на всеки запис"
        icon={<StoreMallDirectoryRoundedIcon />}
        toolbar={<TextField placeholder="Търси по име, код, град или адрес" value={query} onChange={(e) => setQuery(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }} sx={{ maxWidth: 360 }} />}
      >
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={filteredStores}
            getRowId={(row) => row._id}
            columns={[
              { field: "name", headerName: "Магазин", flex: 1.2, minWidth: 180 },
              { field: "createdAt", headerName: "Дата създаване", flex: 0.85, minWidth: 130, valueFormatter: (params) => formatDate(params?.value ?? params) },
              { field: "code", headerName: "Код", flex: 0.7, minWidth: 100 },
              { field: "city", headerName: "Град", flex: 0.8, minWidth: 120 },
              { field: "address", headerName: "Адрес", flex: 1.3, minWidth: 200 },
              { field: "actions", headerName: "", sortable: false, filterable: false, width: 110, align: "center", renderCell: (params) => <GridRowActions onEdit={() => openEditDialog(params.row)} onDelete={() => setDeletingStore(params.row)} /> }
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
        <DialogFooterActions isMobile={isMobile} onCancel={() => setEditingStore(null)} onConfirm={handleUpdate} />
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
