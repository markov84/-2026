import { useEffect, useMemo, useState } from "react";
import ManageSearchRoundedIcon from "@mui/icons-material/ManageSearchRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import { Button, Grid2 as Grid, MenuItem, Stack, TextField } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import DataSection from "../components/DataSection";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import StatCard from "../components/StatCard";
import { useFetch } from "../hooks/useFetch";
import api from "../lib/api";

const movementTypeLabels = {
  all: "Всички",
  in: "Вход",
  out: "Изход",
  adjustment: "Корекция"
};

const sourceLabels = {
  inventory: "Наличности",
  order: "Продажби",
  transfer: "Трансфери",
  audit: "Ревизии",
  product: "Продукти",
  system: "Система"
};

function formatDateTime(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("bg-BG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export default function InventoryMovementsPage() {
  const { data: stores } = useFetch("/stores");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [store, setStore] = useState("all");
  const [movementType, setMovementType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function loadMovements() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (store !== "all") params.set("store", store);
      if (movementType !== "all") params.set("movementType", movementType);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const response = await api.get(`/inventory-movements?${params.toString()}`);
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно зареждане на движенията.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMovements();
  }, []);

  const summary = useMemo(() => {
    const inCount = rows.filter((row) => row.movementType === "in").length;
    const outCount = rows.filter((row) => row.movementType === "out").length;
    const adjustmentCount = rows.filter((row) => row.movementType === "adjustment").length;
    return {
      total: rows.length,
      inCount,
      outCount,
      adjustmentCount
    };
  }, [rows]);

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Складови движения"
        title="Дневник на вход и изход на стока"
        subtitle="Филтрирай по име, баркод/QR, магазин, тип движение и период."
        icon={<SwapHorizRoundedIcon />}
      />

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Общо" value={String(summary.total)} accent="primary" icon={<SwapHorizRoundedIcon />} /></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Вход" value={String(summary.inCount)} accent="success" icon={<SwapHorizRoundedIcon />} /></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Изход" value={String(summary.outCount)} accent="danger" icon={<SwapHorizRoundedIcon />} /></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Корекции" value={String(summary.adjustmentCount)} accent="warning" icon={<SwapHorizRoundedIcon />} /></Grid>
      </Grid>

      <DataSection
        title="Филтър и резултати"
        subtitle="Търсене по име, SKU, баркод и QR код"
        icon={<ManageSearchRoundedIcon />}
        actions={<Button variant="contained" onClick={loadMovements}>Обнови</Button>}
      >
        <Stack direction={{ xs: "column", lg: "row" }} spacing={1.2} useFlexGap flexWrap="wrap" mb={1.5}>
          <TextField
            size="small"
            label="Търси"
            placeholder="Име, SKU, баркод, QR код"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ minWidth: { xs: "100%", lg: 300 } }}
          />
          <TextField select size="small" label="Магазин" value={store} onChange={(event) => setStore(event.target.value)} sx={{ minWidth: 210 }}>
            <MenuItem value="all">Всички магазини</MenuItem>
            {stores.map((item) => <MenuItem key={item._id} value={item._id}>{item.name} | {item.city}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Тип" value={movementType} onChange={(event) => setMovementType(event.target.value)} sx={{ minWidth: 170 }}>
            {Object.entries(movementTypeLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
          </TextField>
          <TextField size="small" type="date" label="От дата" value={from} onChange={(event) => setFrom(event.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }} />
          <TextField size="small" type="date" label="До дата" value={to} onChange={(event) => setTo(event.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }} />
          <Button variant="outlined" onClick={loadMovements}>Приложи</Button>
        </Stack>

        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={rows}
            getRowId={(row) => row._id}
            columns={[
              { field: "createdAt", headerName: "Дата/час", flex: 0.95, valueFormatter: (params) => formatDateTime(params?.value ?? params) },
              { field: "product", headerName: "Продукт", flex: 1.35, valueGetter: (_, row) => row.product?.name || "-" },
              { field: "productNumber", headerName: "Номер", flex: 0.85, valueGetter: (_, row) => row.product?.productNumber || "-" },
              { field: "sku", headerName: "SKU", flex: 0.8, valueGetter: (_, row) => row.product?.sku || "-" },
              { field: "barcode", headerName: "Баркод", flex: 0.9, valueGetter: (_, row) => row.product?.barcode || row.product?.productNumber || "-" },
              { field: "store", headerName: "Магазин", flex: 1, valueGetter: (_, row) => row.store?.name || "-" },
              { field: "movementType", headerName: "Тип", flex: 0.65, valueGetter: (_, row) => movementTypeLabels[row.movementType] || row.movementType || "-" },
              { field: "quantityBefore", headerName: "Преди", flex: 0.55 },
              { field: "quantityDelta", headerName: "Промяна", flex: 0.65 },
              { field: "quantityAfter", headerName: "След", flex: 0.55 },
              { field: "sourceModule", headerName: "Източник", flex: 0.8, valueGetter: (_, row) => sourceLabels[row.sourceModule] || row.sourceModule || "-" },
              { field: "reason", headerName: "Причина", flex: 1.2 },
              {
                field: "actorName",
                headerName: "Потребител",
                flex: 0.85,
                valueGetter: (_, row) => row.actorName || row.actorUser?.fullName || row.actorUser?.username || "-"
              }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>
    </Stack>
  );
}
