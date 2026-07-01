import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Button, DialogContent, DialogTitle, InputAdornment, Stack, Switch, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import DataSection from "../components/DataSection";
import Dialog from "../components/DraggableDialog";
import DialogFooterActions from "../components/DialogFooterActions";
import { FormGrid, FormGridFull } from "../components/FormGrid";
import GridRowActions from "../components/GridRowActions";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";
import api from "../lib/api";

const initialForm = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  vatNumber: "",
  notes: "",
  active: true
};

function validateSupplier(supplier) {
  if (!supplier?.name?.trim()) return "Името на доставчика е задължително.";
  return "";
}

export default function SuppliersPage() {
  const { data = [], loading, setData } = useFetch("/suppliers");
  const isMobile = useMobileDetection();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deletingSupplier, setDeletingSupplier] = useState(null);

  const filteredSuppliers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return data;
    return data.filter((supplier) =>
      [supplier.name, supplier.contactPerson, supplier.phone, supplier.email, supplier.address, supplier.vatNumber, supplier.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [data, query]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingSupplier(null);
  }

  function openCreateDialog() {
    resetForm();
    setOpen(true);
  }

  function openEditDialog(supplier) {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name || "",
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      vatNumber: supplier.vatNumber || "",
      notes: supplier.notes || "",
      active: supplier.active ?? true
    });
    setOpen(true);
  }

  async function handleSave() {
    const validationMessage = validateSupplier(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      if (editingSupplier?._id) {
        const response = await api.put(`/suppliers/${editingSupplier._id}`, form);
        setData((current) => current.map((item) => (item._id === editingSupplier._id ? response.data : item)));
        toast.success("Доставчикът е обновен.");
      } else {
        const response = await api.post("/suppliers", form);
        setData((current) => [response.data, ...current]);
        toast.success("Доставчикът е добавен.");
      }
      resetForm();
      setOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно записване на доставчик.");
    }
  }

  async function handleDelete() {
    if (!deletingSupplier?._id) return;
    try {
      await api.delete(`/suppliers/${deletingSupplier._id}`);
      setData((current) => current.filter((item) => item._id !== deletingSupplier._id));
      setDeletingSupplier(null);
      toast.success("Доставчикът е изтрит.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно изтриване на доставчик.");
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Партньори"
        title="Регистър на доставчици"
        subtitle="Поддържай фирми, контакти и данни за поръчки към доставчици."
        icon={<LocalShippingRoundedIcon />}
      />

      <DataSection
        title="Доставчици"
        subtitle="Списък с фирми и контакти за зареждане"
        icon={<LocalShippingRoundedIcon />}
        toolbar={
          <TextField
            placeholder="Търси по име, лице, телефон, имейл или ДДС номер"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              )
            }}
            sx={{ maxWidth: 420 }}
          />
        }
        actions={<Button variant="contained" startIcon={<PersonAddRoundedIcon />} onClick={openCreateDialog}>Нов доставчик</Button>}
      >
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={filteredSuppliers}
            getRowId={(row) => row._id}
            columns={[
              { field: "name", headerName: "Доставчик", flex: 1.1, minWidth: 180 },
              { field: "contactPerson", headerName: "Лице за контакт", flex: 0.9, minWidth: 150 },
              { field: "phone", headerName: "Телефон", flex: 0.8, minWidth: 130 },
              { field: "email", headerName: "Email", flex: 1, minWidth: 180 },
              { field: "vatNumber", headerName: "ДДС номер", flex: 0.8, minWidth: 130 },
              { field: "address", headerName: "Адрес", flex: 1.1, minWidth: 190 },
              { field: "actions", headerName: "", sortable: false, filterable: false, width: 110, align: "center", renderCell: (params) => <GridRowActions onEdit={() => openEditDialog(params.row)} onDelete={() => setDeletingSupplier(params.row)} /> }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>{editingSupplier ? "Редактиране на доставчик" : "Нов доставчик"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.25}>
            <FormGrid min={240}>
              <TextField label="Име на фирма" value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
              <TextField label="Лице за контакт" value={form.contactPerson} onChange={(event) => updateField("contactPerson", event.target.value)} />
              <TextField label="Телефон" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
              <TextField label="Email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
              <TextField label="ДДС номер" value={form.vatNumber} onChange={(event) => updateField("vatNumber", event.target.value)} />
              <TextField label="Адрес" value={form.address} onChange={(event) => updateField("address", event.target.value)} />
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minHeight: 56 }}>
                <Typography variant="body2" fontWeight={700}>Активен доставчик</Typography>
                <Switch checked={form.active} onChange={(event) => updateField("active", event.target.checked)} />
              </Stack>
              <FormGridFull>
                <TextField label="Бележки" multiline minRows={3} value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
              </FormGridFull>
            </FormGrid>
          </Stack>
        </DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setOpen(false)} onConfirm={handleSave} />
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deletingSupplier)}
        title="Изтриване на доставчик"
        description={`Сигурен ли си, че искаш да изтриеш ${deletingSupplier?.name || "този доставчик"}?`}
        onClose={() => setDeletingSupplier(null)}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}