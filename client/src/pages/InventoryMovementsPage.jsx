import { useEffect, useMemo, useState } from "react";
import ManageSearchRoundedIcon from "@mui/icons-material/ManageSearchRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import { Button, Grid2 as Grid, MenuItem, Stack, TextField, Typography, Box, Chip } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import DataSection from "../components/DataSection";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import StatCard from "../components/StatCard";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import Dialog from "../components/DraggableDialog";
import DialogFooterActions from "../components/DialogFooterActions";
import GridRowActions from "../components/GridRowActions";
import { useFetch } from "../hooks/useFetch";
import { useAuth } from "../providers/AuthProviderStable";
import api from "../lib/api";
import { formatDate } from "../lib/currency";
import { printDailyStockMovementReport, printRecord } from "../lib/printDocuments";

const movementTypeLabels = {
  all: "Всички",
  in: "Вход",
  out: "Изход",
  adjustment: "Корекция"
};

const sourceLabels = {
  inventory: "Наличности",
  "inventory-correction": "Корекция на наличности",
  order: "Продажби",
  transfer: "Трансфери",
  audit: "Ревизии",
  product: "Продукти",
  system: "Система"
};

function formatDateTime(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "-";
  const datePart = formatDate(date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${datePart} ${hours}:${minutes}`;
}

function getTodayDateInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function InventoryMovementsPage() {
  const { data: stores } = useFetch("/stores");
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [store, setStore] = useState("all");
  const [movementType, setMovementType] = useState("all");
  const [from, setFrom] = useState(getTodayDateInputValue);
  const [to, setTo] = useState(getTodayDateInputValue);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [dailyDocument, setDailyDocument] = useState(null);
  const [dailyDocumentLoading, setDailyDocumentLoading] = useState(false);

  const isAdmin = user?.role === "admin";

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

  async function handleDeleteMovement(movementId) {
    try {
      setLoading(true);
      await api.delete(`/inventory-movements/${movementId}`);
      toast.success("Движението е успешно изтрито.");
      setDeletingId(null);
      setSelectedIds(selectedIds.filter(id => id !== movementId));
      await loadMovements();
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно триене на движението.");
      setDeletingId(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkDelete() {
    try {
      setLoading(true);
      await Promise.all(selectedIds.map(id => api.delete(`/inventory-movements/${id}`)));
      toast.success(`${selectedIds.length} движения са успешно изтрити.`);
      setDeletingId(null);
      setSelectedIds([]);
      await loadMovements();
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно триене на движенията.");
      setDeletingId(null);
    } finally {
      setLoading(false);
    }
  }

  async function getDailyReport() {
    if (!from || from !== to) {
      toast.error("За дневен отчет избери една и съща дата в полетата „От дата“ и „До дата“.");
      return null;
    }

    try {
      setDailyDocumentLoading(true);
      const params = new URLSearchParams({ date: from });
      if (search.trim()) params.set("search", search.trim());
      if (store !== "all") params.set("store", store);
      if (movementType !== "all") params.set("movementType", movementType);
      const response = await api.get(`/inventory-movements/daily-report?${params.toString()}`);
      const selectedStore = stores.find((item) => item._id === store);
      return {
        date: from,
        movements: Array.isArray(response.data) ? response.data : [],
        filters: {
          storeName: selectedStore?.name || "",
          movementTypeLabel: movementType !== "all" ? movementTypeLabels[movementType] : "",
          search: search.trim()
        }
      };
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно създаване на дневния отчет.");
      return null;
    } finally {
      setDailyDocumentLoading(false);
    }
  }

  async function handleOpenDailyDocument() {
    const report = await getDailyReport();
    if (report) setDailyDocument(report);
  }

  async function handlePrintDailyReport() {
    const report = dailyDocument || await getDailyReport();
    if (report) printDailyStockMovementReport(report);
  }

  function handleConfirmDelete() {
    if (deletingId === "bulk") {
      handleBulkDelete();
    } else {
      handleDeleteMovement(deletingId);
    }
  }

  const summary = useMemo(() => {
    const inCount = rows.filter((row) => row.movementType === "in").length;
    const outCount = rows.filter((row) => row.movementType === "out").length;
    const adjustmentCount = rows.filter((row) => row.movementType === "adjustment").length;
    const inQuantity = rows.filter((row) => row.movementType === "in").reduce((sum, row) => sum + (row.quantityDelta || 0), 0);
    const outQuantity = rows.filter((row) => row.movementType === "out").reduce((sum, row) => sum + (row.quantityDelta || 0), 0);
    return {
      total: rows.length,
      inCount,
      outCount,
      adjustmentCount,
      inQuantity,
      outQuantity,
      netBalance: rows.reduce((sum, row) => sum + Number(row.quantityDelta || 0), 0)
    };
  }, [rows]);

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Управление на склад"
        title="Дневник на движенията на стока"
        subtitle="Всички входове, изходи и корекции на наличности - история на промяната на всяко количество в системата."
        icon={<SwapHorizRoundedIcon />}
      />

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard 
            label="Движения" 
            value={String(summary.total)} 
            accent="primary" 
            icon={<SwapHorizRoundedIcon />} 
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard 
            label="Входи" 
            value={String(summary.inCount)} 
            accent="success" 
            icon={<TrendingUpRoundedIcon />} 
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard 
            label="Изходи" 
            value={String(summary.outCount)} 
            accent="error" 
            icon={<TrendingDownRoundedIcon />} 
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard 
            label="Корекции" 
            value={String(summary.adjustmentCount)} 
            accent="warning" 
            icon={<AutoFixHighRoundedIcon />} 
          />
        </Grid>
      </Grid>

      <DataSection
        title="Преглед на движенията"
        subtitle="Търсете, филтрирайте и анализирайте историята на наличностите"
        icon={<ManageSearchRoundedIcon />}
        actions={
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
            <Button variant="contained" onClick={loadMovements}>Обнови</Button>
            <Button variant="contained" startIcon={<ManageSearchRoundedIcon />} onClick={handleOpenDailyDocument} disabled={!from || from !== to || dailyDocumentLoading}>
              Отвори дневен документ
            </Button>
            {(search || store !== "all" || movementType !== "all" || from || to) && (
              <Button 
                variant="text" 
                size="small"
                onClick={() => {
                  setSearch("");
                  setStore("all");
                  setMovementType("all");
                  setFrom("");
                  setTo("");
                  setRows([]);
                }}
              >
                Изчисти
              </Button>
            )}
            {isAdmin && selectedIds.length > 0 && (
              <Button 
                color="error"
                variant="outlined"
                startIcon={<DeleteRoundedIcon />}
                onClick={() => setDeletingId("bulk")}
              >
                Изтрий избраните ({selectedIds.length})
              </Button>
            )}
          </Stack>
        }
      >
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="caption" fontWeight={800} color="text.secondary" display="block" mb={0.75}>
              Филтри на търсенето
            </Typography>
            <Stack direction={{ xs: "column", lg: "row" }} spacing={1.2} useFlexGap flexWrap="wrap">
              <TextField
                size="small"
                label="Търси по име, SKU, баркод"
                placeholder="Напр. Кола, 123456, 8712345"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                sx={{ minWidth: { xs: "100%", lg: 300 } }}
              />
              <TextField 
                select 
                size="small" 
                label="Магазин" 
                value={store} 
                onChange={(event) => setStore(event.target.value)} 
                sx={{ minWidth: 210 }}
              >
                <MenuItem value="all">Всички магазини</MenuItem>
                {stores.map((item) => <MenuItem key={item._id} value={item._id}>{item.name} | {item.city}</MenuItem>)}
              </TextField>
              <TextField 
                select 
                size="small" 
                label="Вид движение" 
                value={movementType} 
                onChange={(event) => setMovementType(event.target.value)} 
                sx={{ minWidth: 180 }}
              >
                {Object.entries(movementTypeLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
              </TextField>
              <TextField 
                size="small" 
                type="date" 
                label="От дата" 
                value={from} 
                onChange={(event) => setFrom(event.target.value)} 
                InputLabelProps={{ shrink: true }} 
                sx={{ minWidth: 160 }} 
              />
              <TextField 
                size="small" 
                type="date" 
                label="До дата" 
                value={to} 
                onChange={(event) => setTo(event.target.value)} 
                InputLabelProps={{ shrink: true }} 
                sx={{ minWidth: 160 }} 
              />
              <Button variant="outlined" onClick={loadMovements}>Приложи</Button>
            </Stack>
          </Box>
          <Box>
            <Typography variant="caption" fontWeight={800} color="text.secondary" display="block" mb={1}>
              Резултати: {rows.length} движения
            </Typography>
          </Box>

        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={rows}
            getRowId={(row) => row._id}
            columns={[
              { 
                field: "createdAt", 
                headerName: "Дата / Час", 
                flex: 1, 
                minWidth: 140,
                valueFormatter: (params) => formatDateTime(params?.value ?? params),
                cellClassName: "font-mono"
              },
              { 
                field: "product", 
                headerName: "Продукт", 
                flex: 1.4,
                minWidth: 150,
                valueGetter: (_, row) => row.product?.name || "-",
                cellClassName: "font-semibold"
              },
              { 
                field: "productNumber", 
                headerName: "Код", 
                flex: 0.8,
                minWidth: 90,
                valueGetter: (_, row) => row.product?.productNumber || "-" 
              },
              { 
                field: "barcode", 
                headerName: "Баркод", 
                flex: 0.9,
                minWidth: 100,
                valueGetter: (_, row) => row.product?.barcode || "-",
                cellClassName: "font-mono"
              },
              { 
                field: "store", 
                headerName: "Магазин", 
                flex: 1,
                minWidth: 110,
                valueGetter: (_, row) => row.store?.name || "-" 
              },
              { 
                field: "movementType", 
                headerName: "Вид", 
                flex: 0.75,
                minWidth: 85,
                valueGetter: (_, row) => movementTypeLabels[row.movementType] || row.movementType || "-",
                renderCell: (params) => {
                  const type = params.row.movementType;
                  let color = "default";
                  if (type === "in") color = "success";
                  if (type === "out") color = "error";
                  if (type === "adjustment") color = "warning";
                  return <Chip label={movementTypeLabels[type] || type} size="small" color={color} variant="outlined" />;
                }
              },
              { 
                field: "quantityBefore", 
                headerName: "Преди", 
                flex: 0.65,
                minWidth: 70,
                align: "right",
                type: "number"
              },
              { 
                field: "quantityDelta", 
                headerName: "Промяна", 
                flex: 0.75,
                minWidth: 80,
                align: "right",
                type: "number",
                renderCell: (params) => {
                  const value = params.value || 0;
                  return (
                    <Typography 
                      variant="body2" 
                      fontWeight={700}
                      color={value > 0 ? "success.main" : value < 0 ? "error.main" : "text.primary"}
                    >
                      {value > 0 ? `+${value}` : value}
                    </Typography>
                  );
                }
              },
              { 
                field: "quantityAfter", 
                headerName: "След", 
                flex: 0.65,
                minWidth: 70,
                align: "right",
                type: "number",
                cellClassName: "font-semibold"
              },
              { 
                field: "sourceModule", 
                headerName: "Източник", 
                flex: 1,
                minWidth: 110,
                valueGetter: (_, row) => sourceLabels[row.sourceModule] || row.sourceModule || "-" 
              },
              { 
                field: "reason", 
                headerName: "Причина / Коментар", 
                flex: 1.3,
                minWidth: 130,
                valueGetter: (_, row) => row.reason || "-"
              },
              {
                field: "actorName",
                headerName: "Потребител",
                flex: 1,
                minWidth: 120,
                valueGetter: (_, row) => row.actorName || row.actorUser?.fullName || row.actorUser?.username || "-"
              },
              {
                field: "actions",
                headerName: "",
                sortable: false,
                filterable: false,
                width: isAdmin ? 190 : 100,
                align: "center",
                renderCell: (params) => (
                  <GridRowActions
                    onPrint={() => printRecord("Складово движение", {
                      "Дата / час": formatDateTime(params.row.createdAt),
                      "Продукт": params.row.product?.name,
                      "Код": params.row.product?.productNumber,
                      "Магазин": params.row.store?.name,
                      "Вид": movementTypeLabels[params.row.movementType] || params.row.movementType,
                      "Преди": params.row.quantityBefore,
                      "Промяна": params.row.quantityDelta,
                      "След": params.row.quantityAfter,
                      "Източник": sourceLabels[params.row.sourceModule] || params.row.sourceModule,
                      "Причина / коментар": params.row.reason,
                      "Потребител": params.row.actorName || params.row.actorUser?.fullName || params.row.actorUser?.username
                    })}
                    onDelete={isAdmin ? () => setDeletingId(params.row._id) : undefined}
                  />
                )
              }
            ]}
            checkboxSelection={isAdmin}
            rowSelectionModel={selectedIds}
            onRowSelectionModelChange={(nextSelection) => setSelectedIds(nextSelection)}
            disableRowSelectionOnClick
            sx={{ 
              "& .MuiDataGrid-cell": {
                py: 1.2
              },
              "& .font-mono": {
                fontFamily: "monospace"
              },
              "& .font-semibold": {
                fontWeight: 600
              }
            }}
          />
        </ResponsiveTable>
        </Stack>
      </DataSection>

      <Dialog open={Boolean(dailyDocument)} onClose={() => setDailyDocument(null)} fullWidth maxWidth="xl">
        <DialogTitle>Дневен документ за движенията - {formatDate(dailyDocument?.date ? `${dailyDocument.date}T00:00:00` : "")}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {[dailyDocument?.filters?.storeName, dailyDocument?.filters?.movementTypeLabel, dailyDocument?.filters?.search ? `Търсене: ${dailyDocument.filters.search}` : ""].filter(Boolean).join(" | ") || "Всички обекти и всички видове движения"}
            </Typography>
            {[...new Set((dailyDocument?.movements || []).map((movement) => movement.store?.name || "Неуточнен обект"))]
              .sort((first, second) => first.localeCompare(second, "bg"))
              .map((storeName) => {
                const storeMovements = (dailyDocument?.movements || []).filter((movement) => (movement.store?.name || "Неуточнен обект") === storeName);
                const netQuantity = storeMovements.reduce((sum, movement) => sum + Number(movement.quantityDelta || 0), 0);
                return (
                  <Box key={storeName}>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={0.5} sx={{ mb: 0.75 }}>
                      <Typography variant="h6">{storeName}</Typography>
                      <Typography variant="body2" color="text.secondary">{storeMovements.length} движения | Нетна промяна: {netQuantity > 0 ? "+" : ""}{netQuantity} бр.</Typography>
                    </Stack>
                    <ResponsiveTable>
                      <DataGrid
                        autoHeight
                        hideFooter
                        disableColumnMenu
                        rows={storeMovements}
                        getRowId={(row) => row._id}
                        columns={[
                          { field: "createdAt", headerName: "Час", width: 80, valueFormatter: (params) => formatDateTime(params?.value ?? params).slice(-5) },
                          { field: "product", headerName: "Продукт", flex: 1.4, minWidth: 180, valueGetter: (_, row) => row.product?.name || "-" },
                          { field: "productNumber", headerName: "Код / SKU", flex: 0.85, minWidth: 110, valueGetter: (_, row) => row.product?.productNumber || row.product?.sku || "-" },
                          { field: "movementType", headerName: "Вид", width: 100, valueGetter: (_, row) => movementTypeLabels[row.movementType] || row.movementType || "-" },
                          { field: "quantityBefore", headerName: "Преди", width: 80, type: "number", align: "right" },
                          { field: "quantityDelta", headerName: "Промяна", width: 100, type: "number", align: "right", valueFormatter: (params) => { const value = Number(params?.value ?? params ?? 0); return `${value > 0 ? "+" : ""}${value}`; } },
                          { field: "quantityAfter", headerName: "След", width: 80, type: "number", align: "right" },
                          { field: "reason", headerName: "Причина", flex: 1.1, minWidth: 160, valueGetter: (_, row) => row.reason || "-" }
                        ]}
                        disableRowSelectionOnClick
                      />
                    </ResponsiveTable>
                  </Box>
                );
              })}
            {!dailyDocument?.movements?.length ? <Typography color="text.secondary">Няма движения за избраната дата и филтри.</Typography> : null}
          </Stack>
        </DialogContent>
        <DialogFooterActions isMobile={false} onCancel={() => setDailyDocument(null)} onConfirm={handlePrintDailyReport} confirmLabel="Печат на документа" />
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deletingId)}
        title={deletingId === "bulk" ? "Изтриване на движения" : "Изтриване на движение"}
        description={
          deletingId === "bulk"
            ? `Сигурен ли си, че искаш да изтриеш ${selectedIds.length} движения? Това действие не може да бъде отменено.`
            : "Сигурен ли си, че искаш да изтриеш това движение? Това действие не може да бъде отменено."
        }
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingId(null)}
      />
    </Stack>
  );
}
