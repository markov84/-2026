import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid2 as Grid,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import DataSection from "../components/DataSection";
import { FormGrid, FormGridFull } from "../components/FormGrid";
import FormPanel from "../components/FormPanel";
import GridRowActions from "../components/GridRowActions";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";
import api from "../lib/api";
import { formatCurrencyEUR } from "../lib/currency";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  company: "",
  preferredStore: "",
  notes: ""
};

function StatCard({ label, value }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ p: 2.25 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5">{value}</Typography>
      </CardContent>
    </Card>
  );
}

export default function CustomersPageCrud() {
  const { data, loading, setData } = useFetch("/customers");
  const { data: stores } = useFetch("/stores");
  const [form, setForm] = useState(initialForm);
  const [query, setQuery] = useState("");
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const isMobile = useMobileDetection();

  const filteredCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return data;

    return data.filter((customer) =>
      [customer.fullName, customer.email, customer.phone, customer.company, customer.preferredStore?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [data, query]);

  const stats = useMemo(() => {
    const loyaltyCustomers = data.filter((customer) => Number(customer.loyaltyPoints || 0) > 0).length;
    const totalRevenue = data.reduce((sum, customer) => sum + Number(customer.totalSpent || 0), 0);
    const attachedStores = new Set(data.map((customer) => customer.preferredStore?._id).filter(Boolean)).size;

    return { loyaltyCustomers, totalRevenue, attachedStores };
  }, [data]);

  async function addCustomer() {
    if (!form.fullName.trim()) {
      toast.error("Името на клиента е задължително.");
      return;
    }

    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        preferredStore: form.preferredStore || undefined,
        notes: form.notes.trim() || undefined
      };

      const response = await api.post("/customers", payload);
      setData((current) => [response.data, ...current]);
      setForm(initialForm);
      toast.success("Клиентът е добавен успешно.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно създаване на клиент.");
    }
  }

  function openEditDialog(customer) {
    setEditingCustomer({
      _id: customer._id,
      fullName: customer.fullName || "",
      email: customer.email || "",
      phone: customer.phone || "",
      company: customer.company || "",
      preferredStore: customer.preferredStore?._id || "",
      notes: customer.notes || ""
    });
  }

  async function handleUpdate() {
    if (!editingCustomer?._id) return;

    try {
      const response = await api.put(`/customers/${editingCustomer._id}`, {
        fullName: editingCustomer.fullName.trim(),
        email: editingCustomer.email.trim() || undefined,
        phone: editingCustomer.phone.trim() || undefined,
        company: editingCustomer.company.trim() || undefined,
        preferredStore: editingCustomer.preferredStore || undefined,
        notes: editingCustomer.notes.trim() || undefined
      });
      setData((current) => current.map((item) => (item._id === editingCustomer._id ? response.data : item)));
      setEditingCustomer(null);
      toast.success("Клиентът е обновен.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешна редакция на клиент.");
    }
  }

  async function handleDelete() {
    if (!deletingCustomer?._id) return;

    try {
      await api.delete(`/customers/${deletingCustomer._id}`);
      setData((current) => current.filter((item) => item._id !== deletingCustomer._id));
      setDeletingCustomer(null);
      toast.success("Клиентът е изтрит.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно изтриване на клиент.");
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="CRM"
        title="Клиенти"
        subtitle="Управлявай контакти, лоялност и стойност на клиентите в по-подреден и бърз работен екран."
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}><StatCard label="Активни клиенти" value={data.length} /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><StatCard label="С точки за лоялност" value={stats.loyaltyCustomers} /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><StatCard label="Общ оборот" value={formatCurrencyEUR(stats.totalRevenue)} /></Grid>
      </Grid>

      <FormPanel
        title="Нов клиент"
        subtitle="Добави основните данни за клиента директно на страницата."
        actions={<Button variant="contained" onClick={addCustomer}>Добави клиент</Button>}
      >
        <FormGrid min={250}>
          <div><TextField label="Име на клиент" value={form.fullName} onChange={(e) => setForm((current) => ({ ...current, fullName: e.target.value }))} /></div>
          <div><TextField label="Email" type="email" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} /></div>
          <div><TextField label="Телефон" value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} /></div>
          <div><TextField label="Фирма" value={form.company} onChange={(e) => setForm((current) => ({ ...current, company: e.target.value }))} /></div>
          <div>
            <TextField select label="Предпочитан магазин" value={form.preferredStore} onChange={(e) => setForm((current) => ({ ...current, preferredStore: e.target.value }))}>
              <MenuItem value="">Без предпочитан магазин</MenuItem>
              {stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} - {store.city}</MenuItem>)}
            </TextField>
          </div>
          <div><TextField disabled label="Свързани магазини" value={stats.attachedStores ? `${stats.attachedStores} свързани магазина` : "Все още няма връзки"} /></div>
          <FormGridFull>
            <TextField label="Бележки" multiline minRows={3} value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} />
          </FormGridFull>
        </FormGrid>
      </FormPanel>

      <DataSection
        title="Клиенти"
        subtitle="По-ясен CRM регистър с търсене и контекст за всеки клиент."
        toolbar={
          <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} alignItems={{ xs: "stretch", lg: "center" }}>
            <TextField
              placeholder="Търси по име, имейл, телефон, фирма или магазин"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
              sx={{ maxWidth: { xs: "100%", lg: 460 } }}
            />
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label={`Показани: ${filteredCustomers.length}`} variant="outlined" />
              <Chip label={`Всички клиенти: ${data.length}`} color="secondary" variant="outlined" />
            </Stack>
          </Stack>
        }
      >
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={filteredCustomers}
            getRowId={(row) => row._id}
            columns={[
              { field: "fullName", headerName: "Име", flex: 1.2, minWidth: 180 },
              { field: "company", headerName: "Фирма", flex: 1, minWidth: 160, valueGetter: (_, row) => row.company || "-" },
              { field: "email", headerName: "Имейл", flex: 1.1, minWidth: 180, valueGetter: (_, row) => row.email || "-" },
              { field: "phone", headerName: "Телефон", flex: 0.9, minWidth: 150, valueGetter: (_, row) => row.phone || "-" },
              { field: "preferredStore", headerName: "Предпочитан магазин", flex: 1, minWidth: 170, valueGetter: (_, row) => row.preferredStore?.name || "-" },
              { field: "loyaltyPoints", headerName: "Точки", flex: 0.6, minWidth: 110 },
              { field: "totalSpent", headerName: "Общо похарчено", flex: 0.8, minWidth: 130, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) },
              {
                field: "actions",
                headerName: "",
                sortable: false,
                filterable: false,
                width: 110,
                align: "center",
                renderCell: (params) => (
                  <GridRowActions onEdit={() => openEditDialog(params.row)} onDelete={() => setDeletingCustomer(params.row)} />
                )
              }
            ]}
            pageSizeOptions={[5, 10, 20]}
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={Boolean(editingCustomer)} onClose={() => setEditingCustomer(null)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>Редактиране на клиент</DialogTitle>
        <DialogContent dividers>
          <FormGrid min={250}>
            <div><TextField label="Име на клиент" value={editingCustomer?.fullName || ""} onChange={(e) => setEditingCustomer((current) => ({ ...current, fullName: e.target.value }))} /></div>
            <div><TextField label="Email" type="email" value={editingCustomer?.email || ""} onChange={(e) => setEditingCustomer((current) => ({ ...current, email: e.target.value }))} /></div>
            <div><TextField label="Телефон" value={editingCustomer?.phone || ""} onChange={(e) => setEditingCustomer((current) => ({ ...current, phone: e.target.value }))} /></div>
            <div><TextField label="Фирма" value={editingCustomer?.company || ""} onChange={(e) => setEditingCustomer((current) => ({ ...current, company: e.target.value }))} /></div>
            <div>
              <TextField select label="Предпочитан магазин" value={editingCustomer?.preferredStore || ""} onChange={(e) => setEditingCustomer((current) => ({ ...current, preferredStore: e.target.value }))}>
                <MenuItem value="">Без предпочитан магазин</MenuItem>
                {stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} - {store.city}</MenuItem>)}
              </TextField>
            </div>
            <FormGridFull>
              <TextField label="Бележки" multiline minRows={3} value={editingCustomer?.notes || ""} onChange={(e) => setEditingCustomer((current) => ({ ...current, notes: e.target.value }))} />
            </FormGridFull>
          </FormGrid>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: "column", sm: "row" }, p: 2, gap: 1 }}>
          <Button fullWidth={isMobile} onClick={() => setEditingCustomer(null)}>Отказ</Button>
          <Button fullWidth={isMobile} variant="contained" onClick={handleUpdate}>Запази</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deletingCustomer)}
        title="Изтриване на клиент"
        description={`Сигурен ли си, че искаш да изтриеш ${deletingCustomer?.fullName || "този клиент"}?`}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}
