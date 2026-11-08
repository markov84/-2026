import { useMemo, useState } from "react";
import { Box, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import DataSection from "../components/DataSection";
import PageHeader from "../components/PageHeader";
import PageLoadingNotice from "../components/PageLoadingNotice";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { formatDate } from "../lib/currency";

const resourceLabels = {
  products: "Продукти",
  customers: "Клиенти",
  stores: "Магазини",
  suppliers: "Доставчици",
  "supplier-orders": "Поръчки към доставчици",
  inventory: "Наличности",
  "inventory-movements": "Движения",
  "inventory-audits": "Ревизии",
  orders: "Продажби",
  finance: "Финанси",
  invoices: "Фактури",
  employees: "Служители",
  transfers: "Заявки"
};

const actionLabels = {
  create: "Създаване",
  update: "Промяна",
  delete: "Изтриване"
};

function formatTimestamp(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "-";
  return `${formatDate(date)} ${date.toLocaleTimeString("bg-BG", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function ActivityLogPage() {
  const { data, loading } = useFetch("/activity?limit=500");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return data;

    return data.filter((entry) =>
      [
        entry.actorName,
        entry.actorRole,
        resourceLabels[entry.resource] || entry.resource,
        actionLabels[entry.action],
        ...(entry.changedFields || [])
      ]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(normalized))
    );
  }, [data, query]);

  const columns = [
    {
      field: "createdAt",
      headerName: "Дата и час",
      minWidth: 165,
      flex: 0.8,
      valueGetter: (_, row) => formatTimestamp(row.createdAt)
    },
    { field: "actorName", headerName: "Потребител", minWidth: 150, flex: 1 },
    { field: "actorRole", headerName: "Роля", width: 110 },
    {
      field: "action",
      headerName: "Действие",
      minWidth: 130,
      valueGetter: (_, row) => actionLabels[row.action] || row.action
    },
    {
      field: "resource",
      headerName: "Раздел",
      minWidth: 150,
      flex: 0.9,
      valueGetter: (_, row) => resourceLabels[row.resource] || row.resource
    },
    {
      field: "changedFields",
      headerName: "Променени полета",
      minWidth: 220,
      flex: 1.4,
      valueGetter: (_, row) => (row.changedFields || []).join(", ") || "—"
    },
    { field: "resourceId", headerName: "ID на записа", minWidth: 180, flex: 1 }
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="КОНТРОЛ И ПРОЗРАЧНОСТ"
        title="Журнал на промените"
        subtitle="Последните промени по основните раздели, с потребител, час, действие и засегнати полета."
        icon={<HistoryRoundedIcon />}
      />
      {loading && !data.length ? <PageLoadingNotice subject="журнала на промените" /> : null}
      <DataSection
        title="Последни 500 промени"
        subtitle="Записват се само успешни промени. Стойностите на полетата не се съхраняват в журнала."
        icon={<HistoryRoundedIcon />}
        toolbar={
          <TextField
            fullWidth
            placeholder="Търси по потребител, раздел или поле"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              )
            }}
            sx={{ maxWidth: 480 }}
          />
        }
      >
        <ResponsiveTable>
          <Box sx={{ width: "100%" }}>
            <DataGrid
              autoHeight
              rows={rows}
              getRowId={(row) => row._id}
              columns={columns}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { page: 0, pageSize: 25 } } }}
              disableRowSelectionOnClick
            />
          </Box>
        </ResponsiveTable>
        {!loading && rows.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" sx={{ py: 2 }}>
            {query ? "Няма съвпадащи промени." : "Все още няма записани промени."}
          </Typography>
        ) : null}
      </DataSection>
    </Stack>
  );
}
