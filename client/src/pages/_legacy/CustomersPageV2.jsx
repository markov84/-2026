
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import {
  Button,
  Card,
  CardContent,
  Chip,
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
import api from "../lib/api";
import { formatCurrencyEUR } from "../lib/currency";
import DataSection from "../components/DataSection";
import FormPanel from "../components/FormPanel";
import { FormGrid, FormGridFull } from "../components/FormGrid";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  company: "",
  preferredStore: "",
  notes: ""
};

function StatCard({ icon, label, value, tone = "primary" }) {
  const accents = {
    primary: { bg: "rgba(36,66,74,0.08)", color: "primary.main" },
    accent: { bg: "rgba(200,139,58,0.12)", color: "secondary.main" },
    success: { bg: "rgba(46,125,90,0.12)", color: "success.main" }
  };

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ p: 2.25 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h5">{value}</Typography>
          </Stack>
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{
              width: 44,
              height: 44,
              borderRadius: 3,
              bgcolor: accents[tone].bg,
              color: accents[tone].color
            }}
          >
            {icon}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function CustomersPageV2() {
  const { data, loading, setData } = useFetch("/customers");
  const { data: stores } = useFetch("/stores");
  const [form, setForm] = useState(initialForm);
  const [query, setQuery] = useState("");

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

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="CRM"
        title="Клиенти"
        subtitle="Управлявай контакти, лоялност и стойност на клиентите в по-подреден и бърз работен екран."
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard icon={<StorefrontRoundedIcon />} label="Активни клиенти" value={data.length} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard icon={<WorkspacePremiumRoundedIcon />} label="С точки за лоялност" value={stats.loyaltyCustomers} tone="accent" />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard icon={<TrendingUpRoundedIcon />} label="Общ оборот" value={formatCurrencyEUR(stats.totalRevenue)} tone="success" />
        </Grid>
      </Grid>

      <FormPanel
        title="Нов клиент"
        subtitle="Добави основните данни за клиента директно на страницата без претрупан модален прозорец."
        actions={
          <Button variant="contained" onClick={addCustomer} disabled={!form.fullName.trim()}>
            Добави клиент
          </Button>
        }
      >
        <FormGrid min={250}>
          <div>
            <TextField
              label="Име на клиент"
              value={form.fullName}
              onChange={(e) => setForm((current) => ({ ...current, fullName: e.target.value }))}
            />
          </div>
          <div>
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
            />
          </div>
          <div>
            <TextField
              label="Телефон"
              value={form.phone}
              onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
            />
          </div>
          <div>
            <TextField
              label="Фирма"
              value={form.company}
              onChange={(e) => setForm((current) => ({ ...current, company: e.target.value }))}
            />
          </div>
          <div>
            <TextField
              select
              label="Предпочитан магазин"
              value={form.preferredStore}
              onChange={(e) => setForm((current) => ({ ...current, preferredStore: e.target.value }))}
            >
              <MenuItem value="">Без предпочитан магазин</MenuItem>
              {stores.map((store) => (
                <MenuItem key={store._id} value={store._id}>
                  {store.name} - {store.city}
                </MenuItem>
              ))}
            </TextField>
          </div>
          <div>
            <TextField
              disabled
              label="Свързани магазини"
              value={stats.attachedStores ? `${stats.attachedStores} свързани магазина` : "Все още няма връзки"}
            />
          </div>
          <FormGridFull>
            <TextField
              label="Бележки"
              multiline
              minRows={3}
              placeholder="Предпочитани продукти, начин на контакт, важен контекст"
              value={form.notes}
              onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
            />
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
              <Chip label={`Лоялност: ${stats.loyaltyCustomers}`} color="success" variant="outlined" />
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
              {
                field: "company",
                headerName: "Фирма",
                flex: 1,
                minWidth: 160,
                valueGetter: (_, row) => row.company || "-"
              },
              {
                field: "email",
                headerName: "Имейл",
                flex: 1.1,
                minWidth: 180,
                valueGetter: (_, row) => row.email || "-"
              },
              {
                field: "phone",
                headerName: "Телефон",
                flex: 0.9,
                minWidth: 150,
                valueGetter: (_, row) => row.phone || "-"
              },
              {
                field: "preferredStore",
                headerName: "Предпочитан магазин",
                flex: 1,
                minWidth: 170,
                valueGetter: (_, row) => row.preferredStore?.name || "-"
              },
              { field: "loyaltyPoints", headerName: "Точки", flex: 0.6, minWidth: 110 },
              {
                field: "totalSpent",
                headerName: "Общо похарчено",
                flex: 0.8,
                minWidth: 130,
                valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0)
              }
            ]}
            pageSizeOptions={[5, 10, 20]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10, page: 0 }
              }
            }}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>
    </Stack>
  );
}

