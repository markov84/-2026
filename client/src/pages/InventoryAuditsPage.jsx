import { useEffect, useMemo, useState } from "react";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import PlaylistAddCheckRoundedIcon from "@mui/icons-material/PlaylistAddCheckRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Autocomplete, Box, Button, Checkbox, Chip, DialogContent, DialogTitle, FormControlLabel, Grid2 as Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import BarcodeScannerDialog from "../components/BarcodeScannerDialog";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
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
import { findProductByScanCode, parseScannedInput } from "../lib/scanCode";
import { printInventoryAudit } from "../lib/printDocuments";

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

function escapeCsv(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

export default function InventoryAuditsPage() {
  const lineGridApiRef = useGridApiRef();
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
  const [selectedAuditIds, setSelectedAuditIds] = useState([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [manualProduct, setManualProduct] = useState(null);
  const [manualCounted, setManualCounted] = useState("0");
  const [manualReasonCode, setManualReasonCode] = useState("other");
  const [manualNote, setManualNote] = useState("");
  const [productFilterQuery, setProductFilterQuery] = useState("");
  const [productScanInput, setProductScanInput] = useState("");
  const [productSelectionModel, setProductSelectionModel] = useState([]);
  const [showOnlyUncounted, setShowOnlyUncounted] = useState(false);
  const [showOnlyWithDifference, setShowOnlyWithDifference] = useState(false);
  const [selectedLineRowId, setSelectedLineRowId] = useState("");
  const [savingRowIds, setSavingRowIds] = useState({});
  const [savedRowIds, setSavedRowIds] = useState({});

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

  useBarcodeKeyboardScan(
    (code) => {
      if (!selectedAudit?._id) {
        toast.error("Избери ревизия преди сканиране.");
        return;
      }

      if (["completed", "review"].includes(selectedAudit?.status)) {
        toast.error("Ревизията е заключена. Върни я в режим броене.");
        return;
      }

      void handleScanDetected(code);
    },
    {
      captureInInputs: true,
      flushOnIdle: true,
      idleMs: 90,
      minLength: 4
    }
  );

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

  async function handleStatusChange(nextStatus) {
    const currentStatus = selectedAudit?.status;
    if (!selectedAudit?._id || !nextStatus || nextStatus === currentStatus) return;

    if (nextStatus === "review") {
      await handleSubmitReview();
      return;
    }

    if (nextStatus === "counting") {
      await handleReopenCounting();
      return;
    }

    if (nextStatus === "completed") {
      await handleFinalize();
      return;
    }

    toast.error("Невалиден преход на статус.");
  }

  async function handleScanDetected(code) {
    if (!selectedAudit?._id) return;

    const normalizedCode = parseScannedInput(code) || String(code || "").trim();
    if (!normalizedCode) {
      toast.error("Невалиден код за сканиране.");
      return;
    }

    try {
      const matchedProduct = findProductByScanCode(products, normalizedCode);
      const response = await api.post(`/inventory-audits/${selectedAudit._id}/scan`, { code: normalizedCode, quantityDelta: 1 });
      setSelectedAudit(response.data);
      await refresh();

      if (matchedProduct?._id) {
        setManualProduct(matchedProduct);
        setProductSelectionModel([matchedProduct._id]);
        setShowOnlyUncounted(false);
        setShowOnlyWithDifference(false);
        setProductFilterQuery(matchedProduct?.name || normalizedCode);
      }

      toast.success(`Сканиран код: ${normalizedCode}`);
      setScanOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно сканиране.");
    }
  }

  async function handleBulkDelete() {
    if (!selectedAuditIds.length) return;

    try {
      const ids = [...selectedAuditIds];
      const results = await Promise.allSettled(ids.map((id) => api.delete(`/inventory-audits/${id}`)));
      const deleted = results.filter((result) => result.status === "fulfilled").length;

      if (!deleted) {
        throw new Error("Неуспешно изтриване на избраните ревизии.");
      }

      await refresh();

      if (selectedAuditId && ids.includes(selectedAuditId)) {
        setSelectedAuditId("");
        setSelectedAudit(null);
      }

      setSelectedAuditIds([]);
      setBulkDeleteOpen(false);
      toast.success(`Изтрити ревизии: ${deleted}`);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Неуспешно изтриване на ревизии.");
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

  function handleSelectProductFromTable() {
    const selectedId = productSelectionModel?.[0];
    if (!selectedId) {
      toast.error("Избери продукт от таблицата.");
      return;
    }

    const selected = (Array.isArray(products) ? products : []).find((item) => String(item?._id) === String(selectedId));
    if (!selected) {
      toast.error("Избраният продукт не е намерен.");
      return;
    }

    setManualProduct(selected);
    toast.success(`Избран продукт: ${selected.name || selected.sku || selected.barcode || "-"}`);
  }

  function handleScanProductInput() {
    const normalized = parseScannedInput(productScanInput);
    if (!normalized) {
      toast.error("Невалиден код за търсене.");
      return;
    }

    const matched = findProductByScanCode(products, normalized);
    if (!matched?._id) {
      toast.error(`Няма продукт за код: ${normalized}`);
      return;
    }

    setManualProduct(matched);
    setProductSelectionModel([matched._id]);
    setProductFilterQuery(normalized);
    setProductScanInput("");
    toast.success(`Намерен продукт: ${matched.name || matched.sku || matched.barcode || normalized}`);
  }

  function updateSelectedLine(productId, patch) {
    setSelectedAudit((current) => {
      if (!current) return current;
      return {
        ...current,
        lines: (current.lines || []).map((line) => {
          const lineProductId = line?.product?._id || line?.product;
          if (String(lineProductId) !== String(productId)) return line;
          return { ...line, ...patch };
        })
      };
    });
  }

  async function saveInlineRowByData(payload) {
    if (!selectedAudit?._id) return;

    const productId = payload?.product?._id || payload?.product;
    if (!productId) return;
    const rowId = String(payload?.id || productId);

    setSavingRowIds((current) => ({ ...current, [rowId]: true }));

    try {
      const response = await api.put(`/inventory-audits/${selectedAudit._id}/line`, {
        productId,
        countedQuantity: Number(payload.countedQuantity || 0),
        reasonCode: payload.reasonCode || "other",
        note: payload.note || ""
      });
      setSelectedAudit(response.data);
      void refresh();
      setSavedRowIds((current) => ({ ...current, [rowId]: true }));
      setTimeout(() => {
        setSavedRowIds((current) => {
          const next = { ...current };
          delete next[rowId];
          return next;
        });
      }, 1500);
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно записване на реда.");
    } finally {
      setSavingRowIds((current) => {
        const next = { ...current };
        delete next[rowId];
        return next;
      });
    }
  }

  async function handleInlineSave(row) {
    await saveInlineRowByData(row);
    toast.success("Редът е записан.");
  }

  function handlePrintAuditProtocol() {
    if (!selectedAudit) return;
    printInventoryAudit(selectedAudit);
  }

  function handleExportAuditCsv() {
    if (!selectedAudit) return;

    const lines = Array.isArray(selectedAudit.lines) ? selectedAudit.lines : [];
    const header = [
      "Протокол",
      "Статус",
      "Магазин",
      "Зона",
      "Продукт",
      "SKU",
      "Налично (по система)",
      "Преброено",
      "Разлика",
      "Причина",
      "Бележка"
    ];

    const rows = lines.map((line) => {
      const expected = Number(line?.expectedQuantity || 0);
      const counted = Number(line?.countedQuantity || 0);
      return [
        selectedAudit.auditNumber || "",
        selectedAudit.status || "",
        selectedAudit.store?.name || "",
        selectedAudit.zone || "",
        line?.product?.name || "",
        line?.product?.sku || "",
        expected,
        counted,
        counted - expected,
        reasonLabelMap[line?.reasonCode] || line?.reasonCode || "",
        line?.note || ""
      ]
        .map(escapeCsv)
        .join(",");
    });

    const content = [header.map(escapeCsv).join(","), ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-${selectedAudit.auditNumber || selectedAudit._id || "export"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const canShowExpected = !selectedAudit?.blindMode || selectedAudit?.status === "completed";
  const canEditLines = Boolean(selectedAudit && ["counting", "draft"].includes(selectedAudit.status));
  const canSubmitForReview = Boolean(selectedAudit && ["counting", "draft"].includes(selectedAudit.status));
  const canApprove = Boolean(selectedAudit && selectedAudit.status === "review" && user?.role === "admin");
  const canReopen = Boolean(selectedAudit && selectedAudit.status === "review");
  const availableStatusOptions = selectedAudit
    ? [
        { value: "counting", label: statusLabelMap.counting, disabled: !canReopen && selectedAudit.status !== "counting" },
        { value: "review", label: statusLabelMap.review, disabled: !canSubmitForReview && selectedAudit.status !== "review" },
        { value: "completed", label: statusLabelMap.completed, disabled: !canApprove && selectedAudit.status !== "completed" }
      ]
    : [];

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

  const filteredLineRows = useMemo(() => {
    return lineRows.filter((row) => {
      if (showOnlyUncounted && row?.isCounted) {
        return false;
      }

      if (showOnlyWithDifference) {
        if (!row?.isCounted) return false;
        if (Number(row?.differenceQuantity || 0) === 0) return false;
      }

      return true;
    });
  }, [lineRows, showOnlyUncounted, showOnlyWithDifference]);

  const focusedLineRowId = useMemo(() => {
    if (!manualProduct?._id) return selectedLineRowId || null;
    const found = filteredLineRows.find((row) => String(row?.product?._id || row?.product || "") === String(manualProduct._id));
    return found?.id || null;
  }, [filteredLineRows, manualProduct, selectedLineRowId]);

  useEffect(() => {
    if (!focusedLineRowId || !lineGridApiRef?.current?.getRowIndexRelativeToVisibleRows) return;

    const rowIndex = lineGridApiRef.current.getRowIndexRelativeToVisibleRows(focusedLineRowId);
    if (rowIndex == null || rowIndex < 0) return;

    lineGridApiRef.current.scrollToIndexes({ rowIndex });
  }, [focusedLineRowId, lineGridApiRef]);

  const productRows = useMemo(
    () => (Array.isArray(products) ? products : []).map((product) => ({
      id: product._id,
      ...product
    })),
    [products]
  );

  const filteredProductRows = useMemo(() => {
    const query = String(productFilterQuery || "").trim().toLowerCase();
    if (!query) return productRows;

    return productRows.filter((product) => {
      const haystack = [
        product?.name,
        product?.sku,
        product?.barcode,
        product?.productNumber,
        product?.qrCode,
        product?.category,
        product?.brand
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [productFilterQuery, productRows]);

  const auditLineStats = useMemo(() => {
    const lines = Array.isArray(selectedAudit?.lines) ? selectedAudit.lines : [];
    const counted = lines.filter((line) => line?.isCounted).length;
    const withDiff = lines.filter((line) => Number(line?.differenceQuantity || 0) !== 0).length;
    const expectedTotal = lines.reduce((sum, line) => sum + Number(line?.expectedQuantity || 0), 0);
    const countedTotal = lines.reduce((sum, line) => sum + Number(line?.countedQuantity || 0), 0);
    return {
      counted,
      withDiff,
      expectedTotal,
      countedTotal,
      totalDiff: countedTotal - expectedTotal
    };
  }, [selectedAudit]);

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
        actions={
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="contained" onClick={() => setCreateOpen(true)}>Нова ревизия</Button>
            <Button color="error" variant="outlined" disabled={!selectedAuditIds.length} onClick={() => setBulkDeleteOpen(true)}>
              Изтрий избраните
            </Button>
          </Stack>
        }
      >
        <ResponsiveTable>
          <Box sx={{ height: 360 }}>
            <DataGrid
              loading={loading}
              rows={auditRows}
              getRowId={(row) => row._id}
              onRowClick={(params) => setSelectedAuditId(params.row._id)}
              checkboxSelection
              rowSelectionModel={selectedAuditIds}
              onRowSelectionModelChange={(nextSelection) => setSelectedAuditIds(nextSelection)}
              columns={[
                { field: "auditNumber", headerName: "Номер", flex: 1 },
                { field: "storeLabel", headerName: "Магазин", flex: 1.2 },
                { field: "zone", headerName: "Зона", flex: 0.9 },
                { field: "linesCount", headerName: "Редове", flex: 0.6 },
                { field: "countedLinesCount", headerName: "Преброени", flex: 0.7 },
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
              density="compact"
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            />
          </Box>
        </ResponsiveTable>
      </DataSection>

      <DataSection
        title="Детайл на ревизия"
        subtitle={selectedAudit ? `${selectedAudit.auditNumber} | ${selectedAudit.store?.name || ""}` : "Избери ревизия от списъка"}
        icon={<PlaylistAddCheckRoundedIcon />}
        actions={
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {selectedAudit ? (
              <TextField
                select
                size="small"
                label="Статус"
                value={selectedAudit.status}
                onChange={(event) => void handleStatusChange(event.target.value)}
                sx={{ minWidth: 180 }}
              >
                {availableStatusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value} disabled={option.disabled}>{option.label}</MenuItem>
                ))}
              </TextField>
            ) : null}
          </Stack>
        }
      >
        {!selectedAudit ? (
          <Alert severity="info">Избери ревизия от горната таблица.</Alert>
        ) : (
          <Stack spacing={2}>
            <Box
              sx={{
                position: "sticky",
                top: 8,
                zIndex: 4,
                p: 1,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper"
              }}
            >
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                <Typography variant="caption" color="text.secondary">Бързи действия:</Typography>
                <Button variant="outlined" startIcon={<QrCodeScannerRoundedIcon />} onClick={() => setScanOpen(true)} disabled={!canEditLines}>
                  Сканирай
                </Button>
                <Button variant="outlined" onClick={handlePrintAuditProtocol}>
                  Протокол
                </Button>
                <Button variant="outlined" onClick={handleExportAuditCsv}>
                  CSV
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
            </Box>

            {selectedAudit.blindMode && selectedAudit.status !== "completed" ? (
              <Alert severity="warning">Режим Blind Count е активен. Системните количества са скрити до приключване.</Alert>
            ) : null}
            {selectedAudit.status === "review" ? (
              <Alert severity="info">Ревизията чака одобрение. Редакцията е заключена до връщане в броене.</Alert>
            ) : null}
            {selectedAudit.status === "counting" ? (
              <Alert severity="info">За приключване: довърши преброяването, после „Подай за преглед“, след това админ натиска „Одобри и приключи“.</Alert>
            ) : null}
            {selectedAudit.status === "review" && user?.role !== "admin" ? (
              <Alert severity="warning">Ревизията е подадена. Финалното приключване се прави от администратор.</Alert>
            ) : null}

            <Stack direction={{ xs: "column", md: "row" }} spacing={1} useFlexGap flexWrap="wrap">
              <Chip label={`Преброени редове: ${auditLineStats.counted}`} size="small" />
              <Chip label={`Редове с разлика: ${auditLineStats.withDiff}`} size="small" color={auditLineStats.withDiff ? "warning" : "default"} />
              <Chip label={`Общо разлика: ${auditLineStats.totalDiff}`} size="small" color={auditLineStats.totalDiff === 0 ? "success" : "warning"} />
            </Stack>

            <Accordion disableGutters sx={{ borderRadius: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Typography variant="subtitle2">Избор на продукт (таблица + филтър + сканиране)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1.2}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Филтър по име, SKU, баркод, QR"
                      value={productFilterQuery}
                      onChange={(event) => setProductFilterQuery(event.target.value)}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Сканирай/въведи код"
                      value={productScanInput}
                      onChange={(event) => setProductScanInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleScanProductInput();
                        }
                      }}
                    />
                    <Button variant="outlined" onClick={handleScanProductInput} disabled={!productScanInput.trim()}>
                      Намери по код
                    </Button>
                    <Button variant="outlined" onClick={handleSelectProductFromTable} disabled={!productSelectionModel.length}>
                      Избери продукт
                    </Button>
                  </Stack>

                  <ResponsiveTable>
                    <Box sx={{ height: 300 }}>
                      <DataGrid
                        rows={filteredProductRows}
                        loading={loading}
                        checkboxSelection
                        disableMultipleRowSelection
                        rowSelectionModel={productSelectionModel}
                        onRowSelectionModelChange={(nextSelection) => setProductSelectionModel(nextSelection)}
                        columns={[
                          { field: "name", headerName: "Продукт", flex: 1.2 },
                          { field: "sku", headerName: "SKU", flex: 0.8 },
                          { field: "barcode", headerName: "Баркод", flex: 0.9 },
                          { field: "productNumber", headerName: "Номер", flex: 0.8 },
                          { field: "qrCode", headerName: "QR", flex: 0.9 }
                        ]}
                        pageSizeOptions={[5, 10, 20]}
                        initialState={{ pagination: { paginationModel: { pageSize: 5, page: 0 } } }}
                        density="compact"
                        onRowClick={(params) => {
                          setProductSelectionModel([params.row.id]);
                          setManualProduct(params.row);
                        }}
                      />
                    </Box>
                  </ResponsiveTable>
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
              <FormControlLabel
                control={<Checkbox checked={showOnlyUncounted} onChange={(event) => setShowOnlyUncounted(event.target.checked)} />}
                label="Само непреброени"
              />
              <FormControlLabel
                control={<Checkbox checked={showOnlyWithDifference} onChange={(event) => setShowOnlyWithDifference(event.target.checked)} />}
                label="Само с разлика"
              />
            </Stack>

            <Accordion disableGutters defaultExpanded sx={{ borderRadius: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Typography variant="subtitle2">Ръчна корекция</Typography>
              </AccordionSummary>
              <AccordionDetails>
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
                  </TextField>
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
              </AccordionDetails>
            </Accordion>

            <ResponsiveTable>
              <Box sx={{ height: { xs: 420, md: 560 } }}>
                <DataGrid
                  apiRef={lineGridApiRef}
                  loading={auditLoading}
                  rows={filteredLineRows}
                  rowSelectionModel={focusedLineRowId ? [focusedLineRowId] : []}
                  onRowClick={(params) => {
                    setManualProduct(params.row?.product || null);
                    setManualCounted(String(Number(params.row?.countedQuantity || 0)));
                    setManualReasonCode(params.row?.reasonCode || "other");
                    setManualNote(params.row?.note || "");
                    setSelectedLineRowId(String(params.row?.id || ""));
                  }}
                  columns={[
                  { field: "productName", headerName: "Продукт", flex: 1.3 },
                  { field: "sku", headerName: "SKU", flex: 0.8 },
                  {
                    field: "expectedQuantity",
                    headerName: "Налично (по система)",
                    flex: 0.7,
                    valueGetter: (_, row) => (canShowExpected ? Number(row.expectedQuantity || 0) : "***")
                  },
                  {
                    field: "countedQuantity",
                    headerName: "Преброено",
                    flex: 0.9,
                    renderCell: (params) => (
                      <TextField
                        size="small"
                        type="number"
                        value={Number(params.row.countedQuantity || 0)}
                        onChange={(event) => updateSelectedLine(params.row.product?._id || params.row.product, { countedQuantity: event.target.value })}
                        onBlur={() => void saveInlineRowByData(params.row)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void saveInlineRowByData(params.row);
                          }
                        }}
                        disabled={!canEditLines}
                        sx={{ width: 110 }}
                        inputProps={{ min: 0 }}
                      />
                    )
                  },
                  {
                    field: "differenceQuantity",
                    headerName: "Разлика",
                    flex: 0.7,
                    valueGetter: (_, row) => {
                      if (!canShowExpected) return "***";
                      if (row.isCounted === false || row.differenceQuantity == null) return "-";
                      return Number(row.differenceQuantity || 0);
                    },
                    renderCell: (params) => {
                      if (!canShowExpected) return <Typography>***</Typography>;
                      if (params.row?.isCounted === false || params.row?.differenceQuantity == null) return <Typography>-</Typography>;
                      const value = Number(params.value || 0);
                      return <Typography color={value === 0 ? "text.primary" : value > 0 ? "success.main" : "error.main"}>{value}</Typography>;
                    }
                  },
                  {
                    field: "reasonCode",
                    headerName: "Причина",
                    flex: 1,
                    renderCell: (params) => (
                      <TextField
                        select
                        size="small"
                        value={params.row.reasonCode || "other"}
                        onChange={(event) => {
                          const nextRow = { ...params.row, reasonCode: event.target.value };
                          updateSelectedLine(params.row.product?._id || params.row.product, { reasonCode: event.target.value });
                          void saveInlineRowByData(nextRow);
                        }}
                        disabled={!canEditLines}
                        sx={{ minWidth: 170 }}
                      >
                        {reasonCodeOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                        ))}
                      </TextField>
                    )
                  },
                  {
                    field: "needsRecount",
                    headerName: "Повторно броене",
                    flex: 0.6,
                    renderCell: (params) => (
                      params.value ? <Chip size="small" color="warning" label="Да" /> : <Chip size="small" label="Не" />
                    )
                  },
                  {
                    field: "note",
                    headerName: "Бележка",
                    flex: 1.1,
                    renderCell: (params) => (
                      <TextField
                        size="small"
                        value={params.row.note || ""}
                        onChange={(event) => updateSelectedLine(params.row.product?._id || params.row.product, { note: event.target.value })}
                        onBlur={() => void saveInlineRowByData(params.row)}
                        disabled={!canEditLines}
                        sx={{ minWidth: 180 }}
                      />
                    )
                  },
                  {
                    field: "saveInline",
                    headerName: "",
                    sortable: false,
                    filterable: false,
                    align: "center",
                    width: 110,
                    renderCell: (params) => {
                      const rowKey = String(params.row?.id || "");
                      const isSaving = Boolean(savingRowIds[rowKey]);
                      const isSaved = Boolean(savedRowIds[rowKey]);

                      if (isSaving) {
                        return <Typography variant="caption" color="text.secondary">Записва...</Typography>;
                      }

                      if (isSaved) {
                        return (
                          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ color: "success.main" }}>
                            <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
                            <Typography variant="caption">Записано</Typography>
                          </Stack>
                        );
                      }

                      return (
                        <Button size="small" variant="text" onClick={() => void handleInlineSave(params.row)} disabled={!canEditLines}>
                          Запиши
                        </Button>
                      );
                    }
                  }
                  ]}
                  disableRowSelectionOnClick
                  density="compact"
                  pageSizeOptions={[10, 25, 50, 100]}
                  initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
                  getRowClassName={(params) => (params.row?.isCounted && Number(params.row.differenceQuantity || 0) !== 0 ? "audit-row-diff" : "")}
                  sx={{
                    "& .audit-row-diff .MuiDataGrid-cell": {
                      bgcolor: "rgba(255, 152, 0, 0.06)",
                      borderLeft: "4px solid rgba(255, 152, 0, 0.5)"
                    }
                  }}
                />
              </Box>
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

      <ConfirmDeleteDialog
        open={bulkDeleteOpen}
        title="Изтриване на ревизии"
        description={`Сигурен ли си, че искаш да изтриеш ${selectedAuditIds.length} избрани ревизии?`}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
      />
    </Stack>
  );
}
