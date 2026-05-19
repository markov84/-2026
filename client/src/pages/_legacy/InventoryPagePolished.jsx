import { useMemo, useState } from "react";
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import DataSection from "../components/DataSection";
import { FormGrid, FormGridFull } from "../components/FormGrid";
import PageHeader from "../components/PageHeader";
import { ProductIdentity } from "../components/ProductPresentation";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";
import api from "../lib/api";

const initialStockForm = {
  product: "",
  store: "",
  quantity: "1",
  reorderLevel: "5"
};

export default function InventoryPagePolished() {
  const { data, loading, setData } = useFetch("/inventory/summary");
  const { data: products } = useFetch("/products");
  const { data: stores } = useFetch("/stores");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialStockForm);
  const isMobile = useMobileDetection();
  const existingInventory = useMemo(
    () => data.find((item) => item.product?._id === form.product && item.store?._id === form.store),
    [data, form.product, form.store]
  );

  async function handleAddStock() {
    try {
      const response = await api.post("/inventory/summary", {
        product: form.product,
        store: form.store,
        quantity: Number(form.quantity || 0),
        reorderLevel: Number(form.reorderLevel || 0),
        mode: "increment"
      });

      const populatedProduct = products.find((product) => product._id === form.product);
      const populatedStore = stores.find((store) => store._id === form.store);
      const nextRow = {
        ...response.data,
        product: populatedProduct,
        store: populatedStore,
        isLowStock: Number(response.data.quantity || 0) <= Math.max(Number(response.data.reorderLevel || 0), Number(populatedProduct?.lowStockThreshold || 0))
      };

      setData((current) => {
        const hasExisting = current.some((item) => item.product?._id === form.product && item.store?._id === form.store);
        if (!hasExisting) return [nextRow, ...current];
        return current.map((item) => (item.product?._id === form.product && item.store?._id === form.store ? nextRow : item));
      });

      setForm(initialStockForm);
      setOpen(false);
      toast.success("Бройките бяха добавени към наличността.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно добавяне на наличност.");
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader eyebrow="Наличности" title="Складови нива и презареждане" subtitle="Преглед на наличностите по магазини с визуално разпознаване на продукта, текущ брой и бързо добавяне на нови бройки." />
      <DataSection title="Наличности по обекти" subtitle="Добавените нови бройки се натрупват автоматично към текущите наличности." actions={<Button variant="contained" onClick={() => setOpen(true)}>Добави наличност</Button>}>
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={data}
            getRowId={(row) => row._id}
            columns={[
              { field: "product", headerName: "Продукт", flex: 1.4, minWidth: 220, renderCell: (params) => <ProductIdentity product={params?.row?.product} /> },
              { field: "storeName", headerName: "Магазин", flex: 1, minWidth: 140, valueGetter: (_, row) => row.store?.name },
              { field: "quantity", headerName: "Количество", flex: 0.7, minWidth: 100 },
              { field: "reserved", headerName: "Резервирани", flex: 0.7, minWidth: 100 },
              { field: "reorderLevel", headerName: "Праг", flex: 0.7, minWidth: 100 },
              { field: "status", headerName: "Статус", flex: 0.9, minWidth: 130, renderCell: (params) => <Chip label={params?.row?.isLowStock ? "Ниска наличност" : "Нормално"} color={params?.row?.isLowStock ? "warning" : "success"} size="small" /> }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md" fullScreen={isMobile} PaperProps={{ sx: { borderRadius: { xs: 0, sm: 2.5 } } }}>
        <DialogTitle>Добави наличност</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <FormGrid min={230}>
              <TextField select label="Продукт" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
                {products.map((product) => <MenuItem key={product._id} value={product._id}>{product.name} | {product.sku}</MenuItem>)}
              </TextField>
              <TextField select label="Магазин" value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })}>
                {stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}
              </TextField>
              <TextField label="Нови бройки" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              <TextField label="Праг за презареждане" type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
            </FormGrid>
            <FormGridFull>
              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Текуща наличност: {existingInventory ? `${existingInventory.quantity} бр.` : "0 бр."}
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  Нова наличност след добавяне: {(Number(existingInventory?.quantity || 0) + Number(form.quantity || 0)).toFixed(0)} бр.
                </Typography>
              </Stack>
            </FormGridFull>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: "column", sm: "row" }, p: 2, gap: 1 }}>
          <Button fullWidth={isMobile} onClick={() => setOpen(false)}>Отказ</Button>
          <Button fullWidth={isMobile} variant="contained" onClick={handleAddStock}>Добави</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
