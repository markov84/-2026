import { Button, Grid2 as Grid, Stack } from "@mui/material";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import EuroRoundedIcon from "@mui/icons-material/EuroRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import { DataGrid } from "@mui/x-data-grid";
import DataSection from "../components/DataSection";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import StatCard from "../components/StatCard";
import { formatCurrencyEUR } from "../lib/currency";
import { printVatReport } from "../lib/printDocuments";
import { useFetch } from "../hooks/useFetch";

export default function VatReportsPageClean() {
  const { data, loading } = useFetch("/invoices/vat-report");
  const summary = data?.summary || {};

  return (
    <Stack spacing={3}>
      <PageHeader eyebrow="ДДС отчетност" title="Справка за ДДС и фактури" subtitle="Преглеждай данъчната основа, ДДС сумите и издадените фактури по период." icon={<AssessmentRoundedIcon />} />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Данъчна основа" value={formatCurrencyEUR(summary.subtotal)} accent="primary" icon={<EuroRoundedIcon />} /></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="ДДС за внасяне" value={formatCurrencyEUR(summary.vatAmount)} accent="warning" icon={<AssessmentRoundedIcon />} /></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Обща стойност" value={formatCurrencyEUR(summary.totalAmount)} accent="success" icon={<ReceiptLongRoundedIcon />} /></Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}><StatCard label="Фактури" value={summary.invoiceCount || 0} accent="secondary" icon={<DescriptionRoundedIcon />} /></Grid>
      </Grid>
      <DataSection
        title="Месечна ДДС справка"
        subtitle="Месечен отчет за фактурите и данъците"
        icon={<AssessmentRoundedIcon />}
        actions={<Button variant="outlined" startIcon={<PrintRoundedIcon />} onClick={() => printVatReport(data)}>Печат</Button>}
      >
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={data?.monthlyBreakdown || []}
            getRowId={(row) => row.month}
            columns={[
              { field: "month", headerName: "Месец", flex: 1, minWidth: 120 },
              { field: "count", headerName: "Фактури", flex: 0.7, minWidth: 100 },
              { field: "subtotal", headerName: "Данъчна основа", flex: 1, minWidth: 120, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) },
              { field: "vatAmount", headerName: "ДДС", flex: 1, minWidth: 120, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) },
              { field: "totalAmount", headerName: "Обща стойност", flex: 1, minWidth: 140, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>
    </Stack>
  );
}
