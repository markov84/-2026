import { useEffect, useMemo, useState } from "react";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import PlaylistAddCheckRoundedIcon from "@mui/icons-material/PlaylistAddCheckRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import { Alert, Autocomplete, Button, Chip, DialogContent, DialogTitle, Grid2 as Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import BarcodeScannerDialog from "../components/BarcodeScannerDialog";
import DataSection from "../components/DataSection";
import Dialog from "../components/DraggableDialog";
import DialogFooterActions from "../components/DialogFooterActions";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import StatCard from "../components/StatCard";
import { useFetch } from "../hooks/useFetch";
import { useBarcodeKeyboardScan } from "../hooks/useBarcodeKeyboardScan";
import { useMobileDetection } from "../hooks/useMobileDetection";
import { useAuth } from "../providers/AuthProviderStable";
import api from "../lib/api";

const statusLabelMap = {
  draft: "Чернова",
  counting: "Броене",
  review: "Преглед",
  completed: "Приключена",
  cancelled: "Отказана"
};

const statusColorMap = {
  draft: "default",
  counting: "warning",
  review: "info",
  completed: "success",
  cancelled: "default"
};

const reasonCodeOptions = [
  { value: "missing", label: "Липса" },
  { value: "damage", label: "Повреда" },
  { value: "wrong-transfer", label: "Грешен трансфер" },
  { value: "counting-error", label: "Грешка при броене" },
  { value: "other", label: "Друго" }
];

const reasonLabelMap = Object.fromEntries(reasonCodeOptions.map((item) => [item.value, item.label]));

export default function InventoryAuditsPage() {
  const { user } = useAuth();
  const { data: audits, loading, refresh } = useFetch("/inventory-audits");
  const { data: stores } = useFetch("/stores");
  const { data: products } = useFetch("/products");
  const isMobile = useMobileDetection();

  const [createOpen, setCreateOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [selectedAuditId, setSelectedAuditId] = useState("");
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [manualProduct, setManualProduct] = useState(null);
  const [manualCounted, setManualCounted] = useState("0");
  const [manualReasonCode, setManualReasonCode] = useState("other");
  const [manualNote, setManualNote] = useState("");

  const [createForm, setCreateForm] = useState({
    store: "",
    zone: "Обща зона",
    blindMode: true
  });

  const summary = useMemo(() => {
    const list = Array.isArray(audits) ? audits : [];
    return {
      total: list.length,
      active: list.filter((item) => item.status !== "completed" && item.status !== "cancelled").length,
      completed: list.filter((item) => item.status === "completed").length,
      corrections: list.reduce((sum, item) => sum + Number(item.differencesCount || 0), 0)
    };
  }, [audits]);

  async function loadAudit(id) {
    if (!id) {
      setSelectedAudit(null);
      return;
    }

    try {
      setAuditLoading(true);
      const response = await api.get(`/inventory-audits/${id}`);
      setSelectedAudit(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно зареждане на ревизията.");
    } finally {
      setAuditLoading(false);
    }
  }

  useEffect(() => {
    if (selectedAuditId) {
      void loadAudit(selectedAuditId);
    }
  }, [selectedAuditId]);

  useBarcodeKeyboardScan((code) => {
    if (!selectedAudit?._id || ["completed", "review"].includes(selectedAudit?.status)) return;
    void handleScanDetected(code);
  });

  async function handleCreate() {
    if (!createForm.store) {
      toast.error("Избери магазин за ревизия.");
      return;
    }

    try {
      const response = await api.post("/inventory-audits", createForm);
      setCreateOpen(false);
      setCreateForm({ store: "", zone: "Обща зона", blindMode: true });
      await refresh();
      setSelectedAuditId(response.data._id);
      toast.success("Ревизията е създадена.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно създаване на ревизия.");
    }
  }

  async function handleFinalize() {
    if (!selectedAudit?._id) return;

    try {
      await api.post(`/inventory-audits/${selectedAudit._id}/approve`);
      await Promise.all([refresh(), loadAudit(selectedAudit._id)]);
      toast.success("Ревизията е одобрена и приключена.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно приключване на ревизия.");
    }
  }

  async function handleSubmitReview() {
    if (!selectedAudit?._id) return;

    try {
      await api.post(`/inventory-audits/${selectedAudit._id}/submit-review`);
      await Promise.all([refresh(), loadAudit(selectedAudit._id)]);
      toast.success("Ревизията е подадена за одобрение.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно подаване за преглед.");
    }
  }

  async function handleReopenCounting() {
    if (!selectedAudit?._id) return;

    try {
      await api.post(`/inventory-audits/${selectedAudit._id}/reopen-counting`);
      await Promise.all([refresh(), loadAudit(selectedAudit._id)]);
      toast.success("Ревизията е върната в режим броене.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно връщане в броене.");
    }
  }

  async function handleScanDetected(code) {
    if (!selectedAudit?._id) return;

    try {
      await api.post(`/inventory-audits/${selectedAudit._id}/scan`, { code, quantityDelta: 1 });
      await Promise.all([refresh(), loadAudit(selectedAudit._id)]);
      toast.success(`Сканиран код: ${code}`);
      setScanOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно сканиране.");
    }
  }

  async function handleManualSetLine() {
    if (!selectedAudit?._id || !manualProduct?._id) {
      toast.error("Избери продукт за ръчна корекция.");
      return;
    }

    try {
      await api.put(`/inventory-audits/${selectedAudit._id}/line`, {
        productId: manualProduct._id,
        countedQuantity: Number(manualCounted || 0),
        reasonCode: manualReasonCode,
        note: manualNote
      });
      await Promise.all([refresh(), loadAudit(selectedAudit._id)]);
      setManualProduct(null);
      setManualCounted("0");
      setManualReasonCode("other");
      setManualNote("");
      toast.success("Редът е обновен.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешна ръчна корекция.");
    }
  }

  const canShowExpected = !selectedAudit?.blindMode || selectedAudit?.status === "completed";
  const canEditLines = Boolean(selectedAudit && ["counting", "draft"].includes(selectedAudit.status));
  const canSubmitForReview = Boolean(selectedAudit && ["counting", "draft"].includes(selectedAudit.status));
  const canApprove = Boolean(selectedAudit && selectedAudit.status === "review" && user?.role === "admin");
  const canReopen = Boolean(selectedAudit && selectedAudit.status === "review");

  const auditRows = (Array.isArray(audits) ? audits : []).map((audit) => ({
    ...audit,
    storeLabel: audit.store?.name ? `${audit.store.name} | ${audit.store.city || ""}` : "-",
    statusLabel: statusLabelMap[audit.status] || audit.status || "-"
  }));

  const lineRows = (selectedAudit?.lines || []).map((line, index) => ({
    id: `${line.product?._id || line.product || index}-${index}`,
    ...line,
    productName: line.product?.name || "-",
    sku: line.product?.sku || "-"
  }));

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Ревизии"
        title="Ревизия на склад и магазин"
        subtitle="Сканирай, сравни със системата и приключи с контролирани корекции."
        icon={<FactCheckRoundedIcon />}
      />

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Общо ревизии" value={String(summary.total)} accent="primary" icon={<FactCheckRoundedIcon />} /></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Активни" value={String(summary.active)} accent="warning" icon={<PlaylistAddCheckRoundedIcon />} /></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Приключени" value={String(summary.completed)} accent="success" icon={<AssignmentTurnedInRoundedIcon />} /></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Разлики" value={String(summary.corrections)} accent="danger" icon={<FactCheckRoundedIcon />} /></Grid>
      </Grid>

      <DataSection
        title="Списък с ревизии"
        subtitle="Избери ревизия, за да броиш и засичаш"
        icon={<FactCheckRoundedIcon />}
        actions={<Button variant="contained" onClick={() => setCreateOpen(true)}>Нова ревизия</Button>}
      >
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={auditRows}
            getRowId={(row) => row._id}
            onRowClick={(params) => setSelectedAuditId(params.row._id)}
            columns={[
              { field: "auditNumber", headerName: "Номер", flex: 1 },
              { field: "storeLabel", headerName: "Магазин", flex: 1.2 },
              { field: "zone", headerName: "Зона", flex: 0.9 },
              { field: "linesCount", headerName: "Редове", flex: 0.6 },
              { field: "differencesCount", headerName: "Разлики", flex: 0.7 },
              {
                field: "statusLabel",
                headerName: "Статус",
                flex: 0.8,
                renderCell: (params) => (
                  <Chip
                    size="small"
                    label={params.value || "-"}
                    color={statusColorMap[params.row.status] || "default"}
                  />
                )
              }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <DataSection
        title="Детайл на ревизия"
        subtitle={selectedAudit ? `${selectedAudit.auditNumber} | ${selectedAudit.store?.name || ""}` : "Избери ревизия от списъка"}
        icon={<PlaylistAddCheckRoundedIcon />}
        actions={
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="outlined" startIcon={<QrCodeScannerRoundedIcon />} onClick={() => setScanOpen(true)} disabled={!canEditLines}>
              Сканирай
            </Button>
            <Button variant="outlined" onClick={handleSubmitReview} disabled={!canSubmitForReview}>
              Подай за преглед
            </Button>
            <Button variant="outlined" color="warning" onClick={handleReopenCounting} disabled={!canReopen}>
              Върни в броене
            </Button>
            <Button variant="contained" color="success" onClick={handleFinalize} disabled={!canApprove}>
              Одобри и приключи
            </Button>
          </Stack>
        }
      >
        {!selectedAudit ? (
          <Alert severity="info">Избери ревизия от горната таблица.</Alert>
        ) : (
          <Stack spacing={2}>
            {selectedAudit.blindMode && selectedAudit.status !== "completed" ? (
              <Alert severity="warning">Режим Blind Count е активен. Системните количества са скрити до приключване.</Alert>
            ) : null}
            {selectedAudit.status === "review" ? (
              <Alert severity="info">Ревизията чака одобрение. Редакцията е заключена до връщане в броене.</Alert>
            ) : null}

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
              <Autocomplete
                fullWidth
                options={Array.isArray(products) ? products : []}
                value={manualProduct}
                onChange={(_, value) => setManualProduct(value)}
                getOptionLabel={(item) => [item?.name, item?.sku].filter(Boolean).join(" | ")}
                isOptionEqualToValue={(option, value) => option?._id === value?._id}
                renderInput={(params) => <TextField {...params} label="Ръчна корекция: продукт" size="small" />}
              />
              <TextField
                size="small"
                label="Преброено"
                type="number"
                value={manualCounted}
                onChange={(event) => setManualCounted(event.target.value)}
                sx={{ width: { xs: "100%", md: 150 } }}
                disabled={!canEditLines}
              />
              <TextField
                select
                size="small"
                label="Причина"
                value={manualReasonCode}
                onChange={(event) => setManualReasonCode(event.target.value)}
                sx={{ width: { xs: "100%", md: 210 } }}
                disabled={!canEditLines}
              >
                {reasonCodeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              />
              <TextField
                size="small"
                label="Бележка"
                value={manualNote}
                onChange={(event) => setManualNote(event.target.value)}
                sx={{ width: { xs: "100%", md: 260 } }}
                disabled={!canEditLines}
              />
              <Button variant="outlined" onClick={handleManualSetLine} disabled={!canEditLines}>
                Запиши ред
              </Button>
            </Stack>

            <ResponsiveTable>
              <DataGrid
                autoHeight
                loading={auditLoading}
                rows={lineRows}
                columns={[
                  { field: "productName", headerName: "Продукт", flex: 1.3 },
                  { field: "sku", headerName: "SKU", flex: 0.8 },
                  {
                    field: "expectedQuantity",
                    headerName: "Системно",
                    flex: 0.7,
                    valueGetter: (_, row) => (canShowExpected ? Number(row.expectedQuantity || 0) : "***")
                  },
                  { field: "countedQuantity", headerName: "Преброено", flex: 0.7, valueGetter: (_, row) => Number(row.countedQuantity || 0) },
                  {
                    field: "differenceQuantity",
                    headerName: "Разлика",
                    flex: 0.7,
                    valueGetter: (_, row) => (canShowExpected ? Number(row.differenceQuantity || 0) : "***"),
                    renderCell: (params) => {
                      if (!canShowExpected) return <Typography>***</Typography>;
                      const value = Number(params.value || 0);
                      return <Typography color={value === 0 ? "text.primary" : value > 0 ? "success.main" : "error.main"}>{value}</Typography>;
                    }
                  },
                  {
                    field: "reasonCode",
                    headerName: "Причина",
                    flex: 0.8,
                    valueGetter: (_, row) => reasonLabelMap[row.reasonCode] || "-"
                  },
                  {
                    field: "needsRecount",
                    headerName: "Re-count",
                    flex: 0.6,
                    renderCell: (params) => (
                      params.value ? <Chip size="small" color="warning" label="Да" /> : <Chip size="small" label="Не" />
                    )
                  },
                  { field: "note", headerName: "Бележка", flex: 1 }
                ]}
                disableRowSelectionOnClick
                getRowClassName={(params) => Number(params.row.differenceQuantity || 0) !== 0 ? "audit-row-diff" : ""}
                sx={{
                  "& .audit-row-diff .MuiDataGrid-cell": {
                    bgcolor: "rgba(255, 152, 0, 0.06)",
                    borderLeft: "4px solid rgba(255, 152, 0, 0.5)"
                  }
                }}
              />
            </ResponsiveTable>
          </Stack>
        )}
      </DataSection>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>Нова ревизия</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField select label="Магазин" value={createForm.store} onChange={(event) => setCreateForm((current) => ({ ...current, store: event.target.value }))}>
              {stores.map((store) => (
                <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>
              ))}
            </TextField>
            <TextField label="Зона" value={createForm.zone} onChange={(event) => setCreateForm((current) => ({ ...current, zone: event.target.value }))} />
            <TextField
              select
              label="Режим"
              value={createForm.blindMode ? "blind" : "open"}
              onChange={(event) => setCreateForm((current) => ({ ...current, blindMode: event.target.value === "blind" }))}
            >
              <MenuItem value="blind">Blind count (скрити системни количества)</MenuItem>
              <MenuItem value="open">Open count (видими системни количества)</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setCreateOpen(false)} onConfirm={handleCreate} />
      </Dialog>

      <BarcodeScannerDialog
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDetected={handleScanDetected}
        onError={() => setScanOpen(false)}
        title="Сканирай артикул за ревизия"
        description="Всяко сканиране добавя +1 към преброеното количество."
      />
    </Stack>
  );
}
