import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import {
  Button,
  Card,
  CardContent,
  Chip,
  DialogContent,
  DialogTitle,
  Grid2 as Grid,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import DataSection from "../components/DataSection";
import Dialog from "../components/DraggableDialog";
import DialogFooterActions from "../components/DialogFooterActions";
import { FormGrid, FormGridFull } from "../components/FormGrid";
import FormPanel from "../components/FormPanel";
import GridRowActions from "../components/GridRowActions";
import PageLoadingNotice from "../components/PageLoadingNotice";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useBarcodeKeyboardScan } from "../hooks/useBarcodeKeyboardScan";
import { useMobileDetection } from "../hooks/useMobileDetection";
import api from "../lib/api";
import { formatCurrencyEUR, formatDate } from "../lib/currency";

const initialForm = {
  customerType: "person",
  fullName: "",
  email: "",
  phone: "",
  company: "",
  contactPerson: "",
  taxNumber: "",
  vatNumber: "",
  legalAddress: "",
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

function isCompanyCustomer(customer) {
  return customer?.customerType === "company";
}

function getCustomerDisplayName(customer) {
  if (!customer) return "-";
  return isCompanyCustomer(customer) ? customer.company || customer.fullName || "-" : customer.fullName || customer.company || "-";
}

function validateCustomer(customer) {
  if (isCompanyCustomer(customer)) {
    if (!customer?.company?.trim()) {
      return "Името на фирмата е задължително.";
    }
    return "";
  }

  if (!customer?.fullName?.trim()) {
    return "Името на клиента е задължително.";
  }

  return "";
}

function toCustomerPayload(customer) {
  const isCompany = isCompanyCustomer(customer);
  const company = customer.company.trim();
  const contactPerson = customer.contactPerson.trim();
  const fullName = isCompany ? contactPerson || company : customer.fullName.trim();

  return {
    customerType: customer.customerType,
    fullName,
    email: customer.email.trim() || undefined,
    phone: customer.phone.trim() || undefined,
    company: company || undefined,
    contactPerson: contactPerson || undefined,
    taxNumber: customer.taxNumber.trim() || undefined,
    vatNumber: customer.vatNumber.trim() || undefined,
    legalAddress: customer.legalAddress.trim() || undefined,
    preferredStore: customer.preferredStore || undefined,
    notes: customer.notes.trim() || undefined
  };
}

function CustomerTypeToggle({ value, onChange }) {
  return (
    <ToggleButtonGroup
      exclusive
      color="primary"
      value={value}
      onChange={(_, nextValue) => {
        if (nextValue) onChange(nextValue);
      }}
      sx={{ alignSelf: "flex-start" }}
    >
      <ToggleButton value="person">
        <PersonRoundedIcon fontSize="small" sx={{ mr: 1 }} />
        Физическо лице
      </ToggleButton>
      <ToggleButton value="company">
        <BusinessRoundedIcon fontSize="small" sx={{ mr: 1 }} />
        Фирма
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

function CustomerFields({ customer, onChange, stores, attachedStoresLabel }) {
  const isCompany = isCompanyCustomer(customer);

  return (
    <Stack spacing={2.25}>
      <CustomerTypeToggle value={customer.customerType} onChange={(customerType) => onChange({ customerType })} />
      <FormGrid min={250}>
        {isCompany ? (
          <>
            <TextField label="Име на фирма" value={customer.company} onChange={(event) => onChange({ company: event.target.value })} required />
            <TextField label="ЕИК / Булстат" value={customer.taxNumber} onChange={(event) => onChange({ taxNumber: event.target.value })} />
            <TextField label="ДДС номер" value={customer.vatNumber} onChange={(event) => onChange({ vatNumber: event.target.value })} placeholder="BG..." />
            <TextField label="МОЛ / лице за контакт" value={customer.contactPerson} onChange={(event) => onChange({ contactPerson: event.target.value })} />
            <TextField label="Email" type="email" value={customer.email} onChange={(event) => onChange({ email: event.target.value })} />
            <TextField label="Телефон" value={customer.phone} onChange={(event) => onChange({ phone: event.target.value })} />
            <FormGridFull>
              <TextField label="Адрес на фирмата" value={customer.legalAddress} onChange={(event) => onChange({ legalAddress: event.target.value })} />
            </FormGridFull>
          </>
        ) : (
          <>
            <TextField label="Име на клиент" value={customer.fullName} onChange={(event) => onChange({ fullName: event.target.value })} required />
            <TextField label="Email" type="email" value={customer.email} onChange={(event) => onChange({ email: event.target.value })} />
            <TextField label="Телефон" value={customer.phone} onChange={(event) => onChange({ phone: event.target.value })} />
          </>
        )}
        <TextField select label="Предпочитан магазин" value={customer.preferredStore} onChange={(event) => onChange({ preferredStore: event.target.value })}>
          <MenuItem value="">Без предпочитан магазин</MenuItem>
          {stores.map((store) => (
            <MenuItem key={store._id} value={store._id}>
              {store.name} - {store.city}
            </MenuItem>
          ))}
        </TextField>
        {attachedStoresLabel ? <TextField disabled label="Свързани магазини" value={attachedStoresLabel} /> : null}
        <FormGridFull>
          <TextField label="Бележки" multiline minRows={3} value={customer.notes} onChange={(event) => onChange({ notes: event.target.value })} />
        </FormGridFull>
      </FormGrid>
    </Stack>
  );
}

export default function CustomersPageStable() {
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
      [
        getCustomerDisplayName(customer),
        customer.fullName,
        customer.email,
        customer.phone,
        customer.company,
        customer.contactPerson,
        customer.taxNumber,
        customer.vatNumber,
        customer.legalAddress,
        customer.preferredStore?.name
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [data, query]);

  useBarcodeKeyboardScan((code) => setQuery(code));

  const stats = useMemo(() => {
    const loyaltyCustomers = data.filter((customer) => Number(customer.loyaltyPoints || 0) > 0).length;
    const totalRevenue = data.reduce((sum, customer) => sum + Number(customer.totalSpent || 0), 0);
    const attachedStores = new Set(data.map((customer) => customer.preferredStore?._id).filter(Boolean)).size;

    return { loyaltyCustomers, totalRevenue, attachedStores };
  }, [data]);

  async function addCustomer() {
    const validationMessage = validateCustomer(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.post("/customers", toCustomerPayload(form));
      setData((current) => [response.data, ...current]);
      setForm(initialForm);
      toast.success("Клиентът е добавен успешно.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно създаване на клиент.");
    }
  }

  function openEditDialog(customer) {
    const customerType = customer.customerType || (customer.company ? "company" : "person");

    setEditingCustomer({
      _id: customer._id,
      customerType,
      fullName: customer.fullName || "",
      email: customer.email || "",
      phone: customer.phone || "",
      company: customer.company || "",
      contactPerson: customer.contactPerson || (customerType === "company" && customer.fullName !== customer.company ? customer.fullName || "" : ""),
      taxNumber: customer.taxNumber || "",
      vatNumber: customer.vatNumber || "",
      legalAddress: customer.legalAddress || "",
      preferredStore: customer.preferredStore?._id || "",
      notes: customer.notes || ""
    });
  }

  async function handleUpdate() {
    if (!editingCustomer?._id) return;

    const validationMessage = validateCustomer(editingCustomer);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.put(`/customers/${editingCustomer._id}`, toCustomerPayload(editingCustomer));
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

  const attachedStoresLabel = stats.attachedStores ? `${stats.attachedStores} свързани магазина` : "Все още няма връзки";

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="CRM"
        title="Клиенти"
        subtitle="Управлявай физически лица и фирми с ясни контактни, данъчни и търговски данни."
        icon={<PeopleAltRoundedIcon />}
      />

      {loading && !data.length ? <PageLoadingNotice subject="клиентите" /> : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard label="Активни клиенти" value={data.length} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard label="С точки за лоялност" value={stats.loyaltyCustomers} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard label="Общ оборот" value={formatCurrencyEUR(stats.totalRevenue)} />
        </Grid>
      </Grid>

      <FormPanel
        title="Нов клиент"
        subtitle="Избери дали добавяш физическо лице или фирма и попълни само релевантните полета."
        icon={<PersonAddRoundedIcon />}
        actions={
          <Button variant="contained" startIcon={<PersonAddRoundedIcon />} onClick={addCustomer}>
            Добави клиент
          </Button>
        }
      >
        <CustomerFields
          customer={form}
          stores={stores}
          attachedStoresLabel={attachedStoresLabel}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        />
      </FormPanel>

      <DataSection
        title="Клиенти"
        subtitle="CRM регистър с търсене по име, фирма, контакт, ЕИК, ДДС номер и магазин."
        icon={<PeopleAltRoundedIcon />}
        toolbar={
          <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} alignItems={{ xs: "stretch", lg: "center" }}>
            <TextField
              placeholder="Търси по име, фирма, телефон, ЕИК, ДДС номер или магазин"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
              sx={{ maxWidth: { xs: "100%", lg: 520 } }}
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
              { field: "displayName", headerName: "Клиент", flex: 1.25, minWidth: 190, valueGetter: (_, row) => getCustomerDisplayName(row) },
              { field: "createdAt", headerName: "Дата създаване", flex: 0.85, minWidth: 130, valueFormatter: (params) => formatDate(params?.value ?? params) },
              { field: "company", headerName: "Фирма", flex: 1, minWidth: 170, valueGetter: (_, row) => row.company || "-" },
              { field: "taxNumber", headerName: "ЕИК/ДДС", flex: 0.85, minWidth: 140, valueGetter: (_, row) => row.vatNumber || row.taxNumber || "-" },
              { field: "contactPerson", headerName: "Контакт", flex: 1, minWidth: 160, valueGetter: (_, row) => row.contactPerson || (!isCompanyCustomer(row) ? row.fullName : "-") },
              { field: "email", headerName: "Имейл", flex: 1.05, minWidth: 180, valueGetter: (_, row) => row.email || "-" },
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
                renderCell: (params) => <GridRowActions onEdit={() => openEditDialog(params.row)} onDelete={() => setDeletingCustomer(params.row)} />
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
          {editingCustomer ? (
            <CustomerFields
              customer={editingCustomer}
              stores={stores}
              onChange={(patch) => setEditingCustomer((current) => ({ ...current, ...patch }))}
            />
          ) : null}
        </DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setEditingCustomer(null)} onConfirm={handleUpdate} />
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deletingCustomer)}
        title="Изтриване на клиент"
        description={`Сигурен ли си, че искаш да изтриеш ${getCustomerDisplayName(deletingCustomer)}?`}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}
