import { useEffect, useMemo, useState } from "react";
import AddCardRoundedIcon from "@mui/icons-material/AddCardRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import { Button, Chip, DialogActions, DialogContent, DialogTitle, Grid2 as Grid, InputAdornment, MenuItem, Stack, TextField } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import DataSection from "../components/DataSection";
import Dialog from "../components/DraggableDialog";
import DialogFooterActions from "../components/DialogFooterActions";
import { FormGrid } from "../components/FormGrid";
import GridRowActions from "../components/GridRowActions";
import PageLoadingNotice from "../components/PageLoadingNotice";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import StatCard from "../components/StatCard";
import { useFetch } from "../hooks/useFetch";
import { useBarcodeKeyboardScan } from "../hooks/useBarcodeKeyboardScan";
import { useMobileDetection } from "../hooks/useMobileDetection";
import api from "../lib/api";
import { formatCurrencyEUR } from "../lib/currency";

const initialEntry = { type: "income", category: "", description: "", amount: "", store: "" };

const financeTypeLabels = {
  income: "Приход",
  expense: "Разход",
  bank: "Банка"
};

const financeTypeChipColors = {
  income: "success",
  expense: "error",
  bank: "primary"
};

const financePeriodLabels = {
  all: "Всички",
  today: "Днес",
  week: "Последни 7 дни",
  month: "Този месец",
  custom: "По избор"
};

const financeCardDefinitions = {
  income: { label: "Приходи", type: "income", accent: "success" },
  expenses: { label: "Разходи", type: "expense", accent: "warning" },
  bank: { label: "Банка", type: "bank", accent: "primary" },
  net: { label: "Печалба", type: null, accent: "secondary" }
};

const financeTextLabels = {
  "Retail sales": "Продажби на дребно",
  "Daily sales batch": "Дневни продажби",
  "B2B project order": "B2B проектна поръчка",
  "Interior Concept invoicing": "Фактуриране към Interior Concept",
  "Supplier payment": "Плащане към доставчик",
  "Restock luminaires": "Зареждане на осветителни тела",
  "Rent and utilities": "Наем и консумативи",
  "Monthly operating costs": "Месечни оперативни разходи",
  "Bank balance": "Банкова наличност",
  "Current bank liquidity": "Текуща банкова ликвидност"
};

function translateFinanceText(value) {
  return financeTextLabels[value] || value || "-";
}

function translateFinanceType(value) {
  return financeTypeLabels[value] || value || "-";
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function parseDateOnly(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPeriodRange(period, fromDate, toDate) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  if (period === "today") {
    return { start: startOfToday, end: endOfToday };
  }

  if (period === "week") {
    return { start: new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000), end: endOfToday };
  }

  if (period === "month") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfToday };
  }

  if (period === "custom") {
    const start = parseDateOnly(fromDate);
    const endDate = parseDateOnly(toDate);
    if (!start || !endDate) return null;
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
    return { start, end };
  }

  return null;
}

function isEntryInRange(entry, range) {
  if (!range) return true;
  const date = new Date(entry?.entryDate || entry?.createdAt || entry?.updatedAt || 0);
  if (Number.isNaN(date.getTime())) return false;
  return date >= range.start && date < range.end;
}

function getFinanceEntries(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.entries)) return value.entries;
  return [];
}

function getSourceOrderId(entry) {
  if (!entry?.sourceOrder) return "";
  if (typeof entry.sourceOrder === "string") return entry.sourceOrder;
  if (typeof entry.sourceOrder === "object" && entry.sourceOrder._id) return String(entry.sourceOrder._id);
  return "";
}

function buildFinanceState(value) {
  const entries = getFinanceEntries(value);
  const income = entries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const expenses = entries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const bank = entries.filter((entry) => entry.type === "bank").reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  return {
    summary: {
      income,
      expenses,
      bank,
      net: income - expenses
    },
    entries
  };
}

function buildFinanceRows(entries) {
  const orderExpenseById = new Map();

  entries.forEach((entry) => {
    if (entry?.source !== "order" || entry?.type !== "expense") return;
    const sourceOrderId = getSourceOrderId(entry);
    if (!sourceOrderId) return;
    const current = Number(orderExpenseById.get(sourceOrderId) || 0);
    orderExpenseById.set(sourceOrderId, current + Number(entry.amount || 0));
  });

  return entries.map((entry) => {
  const amount = Number(entry.amount || 0);
    const sourceOrderId = getSourceOrderId(entry);

    let profitValue = entry.type === "income" ? amount : entry.type === "expense" ? -amount : 0;

    if (entry?.source === "order" && entry?.type === "income" && sourceOrderId) {
      const orderExpense = Number(orderExpenseById.get(sourceOrderId) || 0);
      profitValue = amount - orderExpense;
    }

    if (entry?.source === "order" && entry?.type === "expense" && sourceOrderId) {
      profitValue = 0;
    }

    return {
      ...entry,
      typeLabel: translateFinanceType(entry.type),
      categoryLabel: translateFinanceText(entry.category),
      descriptionLabel: translateFinanceText(entry.description),
      storeLabel: entry.store?.name || "Централа",
      amountLabel: formatCurrencyEUR(entry.amount),
      profitLabel: `${profitValue > 0 ? "+" : ""}${formatCurrencyEUR(profitValue)}`
    };
  });
}

function validateEntry(entry) {
  if (!entry?.category?.trim()) return "Категорията е задължителна.";
  if (!entry?.amount || Number(entry.amount) <= 0) return "Сумата трябва да е по-голяма от 0.";
  return "";
}

export default function FinancePageStable() {
  const { data, loading, setData } = useFetch("/finance");
  const { data: stores } = useFetch("/stores");
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("all");
  const [fromDate, setFromDate] = useState(toDateInputValue(new Date()));
  const [toDate, setToDate] = useState(toDateInputValue(new Date()));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialEntry);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingEntry, setDeletingEntry] = useState(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [activeCard, setActiveCard] = useState(null);
  const isMobile = useMobileDetection();
  const entries = getFinanceEntries(data);
  const periodRange = useMemo(() => getPeriodRange(period, fromDate, toDate), [period, fromDate, toDate]);
  const periodEntries = useMemo(() => entries.filter((entry) => isEntryInRange(entry, periodRange)), [entries, periodRange]);
  const summary = useMemo(() => buildFinanceState(periodEntries).summary, [periodEntries]);
  const displayEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const rows = buildFinanceRows(periodEntries);
    if (!normalized) return rows;

    return rows.filter((entry) =>
      [entry.typeLabel, entry.categoryLabel, entry.descriptionLabel, entry.storeLabel, entry.amountLabel]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [periodEntries, query]);
  const activeCardDefinition = activeCard ? financeCardDefinitions[activeCard] : null;
  const activeCardEntries = activeCardDefinition?.type
    ? displayEntries.filter((entry) => entry.type === activeCardDefinition.type)
    : displayEntries.filter((entry) => entry.type === "income" || entry.type === "expense");
  const financeColumns = [
    {
      field: "typeLabel",
      headerName: "Тип",
      flex: 0.8,
      renderCell: (params) => (
        <Chip label={params?.value || "-"} size="small" color={financeTypeChipColors[params.row.type] || "default"} variant="filled" />
      )
    },
    { field: "categoryLabel", headerName: "Категория", flex: 1.1 },
    { field: "descriptionLabel", headerName: "Описание", flex: 1.4 },
    { field: "storeLabel", headerName: "Магазин", flex: 1 },
    { field: "amountLabel", headerName: "Сума", flex: 0.8 },
    {
      field: "profitLabel",
      headerName: "Печалба",
      flex: 0.9,
      renderCell: (params) => (
        <Chip
          label={params?.value || formatCurrencyEUR(0)}
          size="small"
          color={params.row.type === "income" ? "success" : params.row.type === "expense" ? "error" : "default"}
          variant="outlined"
        />
      )
    },
    { field: "actions", headerName: "", sortable: false, filterable: false, width: 110, align: "center", renderCell: (params) => <GridRowActions onEdit={() => openEditDialog(params.row)} onDelete={() => setDeletingEntry(params.row)} /> }
  ];

  useEffect(() => {
    setSelectedEntryIds((current) => current.filter((id) => displayEntries.some((entry) => entry._id === id)));
  }, [displayEntries]);

  useBarcodeKeyboardScan((code) => setQuery(code));

  async function handleCreate() {
    const validationMessage = validateEntry(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.post("/finance", {
        ...form,
        category: form.category.trim(),
        description: form.description.trim() || undefined,
        amount: Number(form.amount),
        store: form.store || undefined
      });
      setData((current) => buildFinanceState([response.data, ...getFinanceEntries(current)]));
      setForm(initialEntry);
      setOpen(false);
      toast.success("Финансовият запис е добавен.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно добавяне на финансов запис.");
    }
  }

  function openEditDialog(entry) {
    setEditingEntry({
      _id: entry._id,
      type: entry.type || "income",
      category: entry.category || "",
      description: entry.description || "",
      amount: String(entry.amount ?? ""),
      store: entry.store?._id || ""
    });
  }

  async function handleUpdate() {
    if (!editingEntry?._id) return;

    const validationMessage = validateEntry(editingEntry);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.put(`/finance/${editingEntry._id}`, {
        type: editingEntry.type,
        category: editingEntry.category.trim(),
        description: editingEntry.description.trim() || undefined,
        amount: Number(editingEntry.amount),
        store: editingEntry.store || undefined
      });
      setData((current) => buildFinanceState(getFinanceEntries(current).map((item) => (item._id === editingEntry._id ? response.data : item))));
      setEditingEntry(null);
      toast.success("Финансовият запис е обновен.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешна редакция на запис.");
    }
  }

  async function handleDelete() {
    if (!deletingEntry?._id) return;

    try {
      await api.delete(`/finance/${deletingEntry._id}`);
      setData((current) => buildFinanceState(getFinanceEntries(current).filter((item) => item._id !== deletingEntry._id)));
      setDeletingEntry(null);
      toast.success("Финансовият запис е изтрит.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно изтриване на запис.");
    }
  }

  async function handleBulkDelete() {
    if (!selectedEntryIds.length) return;

    const idsToDelete = [...selectedEntryIds];

    try {
      const results = await Promise.allSettled(idsToDelete.map((id) => api.delete(`/finance/${id}`)));
      const deletedCount = results.filter((result) => result.status === "fulfilled").length;

      if (!deletedCount) {
        throw new Error("Неуспешно изтриване на избраните записи.");
      }

      setData((current) => buildFinanceState(getFinanceEntries(current).filter((item) => !idsToDelete.includes(item._id))));
      setSelectedEntryIds([]);
      setBulkDeleteOpen(false);
      toast.success(`Изтрити записи: ${deletedCount}`);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Неуспешно изтриване на избраните записи.");
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader eyebrow="Финанси" title="Финансов дневник" subtitle="Приходи, разходи и банка с редакция и изтриване на всеки запис." icon={<AccountBalanceWalletRoundedIcon />} />

      {loading && !entries.length ? <PageLoadingNotice subject="финансовите записи" /> : null}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
        <TextField
          placeholder="Търси по тип, категория, описание, магазин или сума"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ maxWidth: { xs: "100%", sm: 420 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
        />
        <Chip label={`Показани: ${displayEntries.length}`} variant="outlined" />
        {selectedEntryIds.length ? <Chip label={`Избрани: ${selectedEntryIds.length}`} color="warning" /> : null}
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} useFlexGap flexWrap="wrap" alignItems={{ xs: "stretch", md: "center" }}>
        <TextField select label="Период" value={period} onChange={(e) => setPeriod(e.target.value)} sx={{ minWidth: 180 }} size="small">
          {Object.entries(financePeriodLabels).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        {period === "custom" ? (
          <>
            <TextField
              label="От дата"
              type="date"
              size="small"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />
            <TextField
              label="До дата"
              type="date"
              size="small"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />
          </>
        ) : null}
        <Chip label={`Период: ${financePeriodLabels[period] || "Всички"}`} variant="outlined" />
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Приходи" value={formatCurrencyEUR(summary.income)} accent="success" icon={<TrendingUpRoundedIcon />} onClick={() => setActiveCard("income")} /></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Разходи" value={formatCurrencyEUR(summary.expenses)} accent="warning" icon={<TrendingDownRoundedIcon />} onClick={() => setActiveCard("expenses")} /></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Банка" value={formatCurrencyEUR(summary.bank)} accent="primary" icon={<AccountBalanceRoundedIcon />} onClick={() => setActiveCard("bank")} /></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Печалба" value={formatCurrencyEUR(summary.net)} accent="secondary" icon={<SavingsRoundedIcon />} onClick={() => setActiveCard("net")} /></Grid>
      </Grid>

      <DataSection
        title="Финансов дневник"
        subtitle="Редакция и триене на записи"
        icon={<AccountBalanceWalletRoundedIcon />}
        actions={
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="contained" startIcon={<AddCardRoundedIcon />} onClick={() => setOpen(true)}>
              Добави запис
            </Button>
            <Button
              color="error"
              variant="outlined"
              startIcon={<DeleteRoundedIcon />}
              disabled={!selectedEntryIds.length}
              onClick={() => setBulkDeleteOpen(true)}
            >
              Изтрий избраните
            </Button>
          </Stack>
        }
      >
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={displayEntries}
            getRowId={(row) => row._id}
            columns={financeColumns}
            checkboxSelection
            rowSelectionModel={selectedEntryIds}
            onRowSelectionModelChange={(nextSelection) => setSelectedEntryIds(nextSelection)}
            getRowClassName={(params) => `finance-row finance-row--${params.row.type}`}
            disableRowSelectionOnClick
            sx={{
              "& .MuiDataGrid-row.finance-row--income .MuiDataGrid-cell": {
                bgcolor: "rgba(76, 175, 80, 0.06)",
                borderLeft: "4px solid rgba(76, 175, 80, 0.55)"
              },
              "& .MuiDataGrid-row.finance-row--expense .MuiDataGrid-cell": {
                bgcolor: "rgba(244, 67, 54, 0.06)",
                borderLeft: "4px solid rgba(244, 67, 54, 0.55)"
              },
              "& .MuiDataGrid-row.finance-row--bank .MuiDataGrid-cell": {
                bgcolor: "rgba(33, 150, 243, 0.06)",
                borderLeft: "4px solid rgba(33, 150, 243, 0.55)"
              }
            }}
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={Boolean(activeCardDefinition)} onClose={() => setActiveCard(null)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>{activeCardDefinition?.label || "Финансови записи"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <StatCard
              label={activeCardDefinition?.label || "Общо"}
              value={formatCurrencyEUR(activeCard ? summary[activeCard] : 0)}
              accent={activeCardDefinition?.accent || "primary"}
            />
            <ResponsiveTable>
              <DataGrid
                autoHeight
                rows={activeCardEntries}
                getRowId={(row) => row._id}
                columns={financeColumns}
                disableRowSelectionOnClick
                getRowClassName={(params) => `finance-row finance-row--${params.row.type}`}
                sx={{
                  "& .MuiDataGrid-row.finance-row--income .MuiDataGrid-cell": {
                    bgcolor: "rgba(76, 175, 80, 0.06)",
                    borderLeft: "4px solid rgba(76, 175, 80, 0.55)"
                  },
                  "& .MuiDataGrid-row.finance-row--expense .MuiDataGrid-cell": {
                    bgcolor: "rgba(244, 67, 54, 0.06)",
                    borderLeft: "4px solid rgba(244, 67, 54, 0.55)"
                  },
                  "& .MuiDataGrid-row.finance-row--bank .MuiDataGrid-cell": {
                    bgcolor: "rgba(33, 150, 243, 0.06)",
                    borderLeft: "4px solid rgba(33, 150, 243, 0.55)"
                  }
                }}
              />
            </ResponsiveTable>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button fullWidth={isMobile} variant="contained" startIcon={<CloseRoundedIcon />} onClick={() => setActiveCard(null)}>
            Затвори
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>Нов финансов запис</DialogTitle>
        <DialogContent dividers>
          <FormGrid min={240}>
            <TextField select fullWidth label="Тип" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <MenuItem value="income">Приход</MenuItem>
              <MenuItem value="expense">Разход</MenuItem>
              <MenuItem value="bank">Банка</MenuItem>
            </TextField>
            <TextField fullWidth label="Категория" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <TextField fullWidth label="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <TextField fullWidth label="Сума" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <TextField select fullWidth label="Магазин" value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })}>
              <MenuItem value="">Централа</MenuItem>
              {stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}
            </TextField>
          </FormGrid>
        </DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setOpen(false)} onConfirm={handleCreate} />
      </Dialog>

      <Dialog open={Boolean(editingEntry)} onClose={() => setEditingEntry(null)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>Редактиране на финансов запис</DialogTitle>
        <DialogContent dividers>
          <FormGrid min={240}>
            <TextField select fullWidth label="Тип" value={editingEntry?.type || "income"} onChange={(e) => setEditingEntry((current) => ({ ...current, type: e.target.value }))}>
              <MenuItem value="income">Приход</MenuItem>
              <MenuItem value="expense">Разход</MenuItem>
              <MenuItem value="bank">Банка</MenuItem>
            </TextField>
            <TextField fullWidth label="Категория" value={editingEntry?.category || ""} onChange={(e) => setEditingEntry((current) => ({ ...current, category: e.target.value }))} />
            <TextField fullWidth label="Описание" value={editingEntry?.description || ""} onChange={(e) => setEditingEntry((current) => ({ ...current, description: e.target.value }))} />
            <TextField fullWidth label="Сума" type="number" value={editingEntry?.amount || ""} onChange={(e) => setEditingEntry((current) => ({ ...current, amount: e.target.value }))} />
            <TextField select fullWidth label="Магазин" value={editingEntry?.store || ""} onChange={(e) => setEditingEntry((current) => ({ ...current, store: e.target.value }))}>
              <MenuItem value="">Централа</MenuItem>
              {stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}
            </TextField>
          </FormGrid>
        </DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setEditingEntry(null)} onConfirm={handleUpdate} />
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deletingEntry)}
        title="Изтриване на финансов запис"
        description={`Сигурен ли си, че искаш да изтриеш "${translateFinanceText(deletingEntry?.category) || "този запис"}"?`}
        onClose={() => setDeletingEntry(null)}
        onConfirm={handleDelete}
      />

      <ConfirmDeleteDialog
        open={bulkDeleteOpen}
        title="Масово изтриване на финансови записи"
        description={`Сигурен ли си, че искаш да изтриеш ${selectedEntryIds.length} избрани записа?`}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
      />
    </Stack>
  );
}
