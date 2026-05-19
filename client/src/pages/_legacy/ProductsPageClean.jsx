import { useState } from "react";
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid2 as Grid, Stack, TextField } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import api from "../lib/api";
import { formatCurrencyEUR } from "../lib/currency";
import PageHeader from "../components/PageHeader";
import DataSection from "../components/DataSection";
import { FormGrid } from "../components/FormGrid";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";

const initialForm = { name: "", sku: "", category: "", price: "", barcode: "" };

export default function ProductsPageClean() {
  const { data, loading, setData } = useFetch("/products");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const isMobile = useMobileDetection();

  async function handleCreate() {
    try {
      const response = await api.post("/products", { ...form, price: Number(form.price) });
      setData((current) => [response.data, ...current]);
      setForm(initialForm);
      setOpen(false);
      toast.success("Продуктът е създаден.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно създаване на продукт.");
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Каталог"
        title="Управление на продукти"
        subtitle="Поддържай артикули, SKU кодове, категории, цени и баркод информация в ясен продуктов екран."
      />
      <DataSection
        title="Продуктов каталог"
        subtitle="Централен продуктов регистър с по-ясни действия и по-добра четимост."
        toolbar={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={`Продукти: ${data.length}`} color="secondary" variant="outlined" />
            <Chip label="Подредени форми" color="primary" variant="outlined" />
            <Chip label="Мобилна версия" color="success" variant="outlined" />
          </Stack>
        }
        actions={<Button variant="contained" onClick={() => setOpen(true)}>Нов продукт</Button>}
      >
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={data}
            getRowId={(row) => row._id}
            columns={[
              { field: "name", headerName: "Име", flex: 1.4, minWidth: 180 },
              { field: "sku", headerName: "SKU", flex: 1, minWidth: 120 },
              { field: "category", headerName: "Категория", flex: 1, minWidth: 140 },
              { field: "barcode", headerName: "Баркод", flex: 1, minWidth: 140 },
              { field: "price", headerName: "Цена", flex: 0.8, minWidth: 110, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) }
            ]}
            pageSizeOptions={[5, 10, 20]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile} PaperProps={{ sx: { borderRadius: { xs: 0, sm: 5 } } }}>
        <DialogTitle>Нов продукт</DialogTitle>
        <DialogContent dividers>
          <FormGrid min={240}>
            <TextField fullWidth label="Име на продукт" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField fullWidth label="SKU код" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <TextField fullWidth label="Категория" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <TextField fullWidth label="Цена" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <TextField fullWidth label="Баркод" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          </FormGrid>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: "column", sm: "row" }, p: 2, gap: 1 }}>
          <Button fullWidth={isMobile} onClick={() => setOpen(false)}>Отказ</Button>
          <Button fullWidth={isMobile} variant="contained" onClick={handleCreate}>Запази</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
