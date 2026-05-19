import { useMemo, useState } from "react";
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import DataSection from "../components/DataSection";
import { FormGrid, FormGridFull } from "../components/FormGrid";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";
import api from "../lib/api";

const initialTransfer = {
  transferNumber: "",
  fromStore: "",
  toStore: "",
  product: "",
  quantity: "1",
  requestedBy: "",
  notes: ""
};

export default function TransfersPagePolished() {
  const { data: transfers, loading, setData } = useFetch("/transfers");
  const { data: stores } = useFetch("/stores");
  const { data: products } = useFetch("/products");
  const { data: inventory } = useFetch("/inventory/summary");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialTransfer);
  const isMobile = useMobileDetection();
  const sourceInventory = useMemo(
    () => inventory.find((item) => item.product?._id === form.product && item.store?._id === form.fromStore),
    [inventory, form.product, form.fromStore]
  );

  async function handleCreate() {
    try {
      const response = await api.post("/transfers", {
        transferNumber: form.transferNumber,
        fromStore: form.fromStore,
        toStore: form.toStore,
        requestedBy: form.requestedBy,
        notes: form.notes,
        items: [{ product: form.product, quantity: Number(form.quantity) }]
      });

      setData((current) => [response.data, ...current]);
      setForm(initialTransfer);
      setOpen(false);
      toast.success("Трансферът е създаден.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно създаване на трансфер.");
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Магазинова логистика"
        title="Трансфери между магазини"
        subtitle="Координирай движенията на стока между обектите с по-ясна проследимост и без ръчно прехвърляне на информация."
      />

      <DataSection
        title="Регистър на трансферите"
        subtitle="Заявки за движение на стока между обекти"
        actions={<Button variant="contained" onClick={() => setOpen(true)}>Нов трансфер</Button>}
      >
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={transfers}
            getRowId={(row) => row._id}
            columns={[
              { field: "transferNumber", headerName: "Трансфер", flex: 1, minWidth: 140 },
              { field: "fromStore", headerName: "От", flex: 1, minWidth: 140, valueGetter: (_, row) => row.fromStore?.name || "-" },
              { field: "toStore", headerName: "Към", flex: 1, minWidth: 140, valueGetter: (_, row) => row.toStore?.name || "-" },
              {
                field: "status",
                headerName: "Статус",
                flex: 0.9,
                minWidth: 120,
                renderCell: (params) => (
                  <Chip label={params?.value || "-"} size="small" color={params?.value === "completed" ? "success" : "warning"} />
                )
              },
              { field: "requestedBy", headerName: "Заявил", flex: 1, minWidth: 140 }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>Нов трансфер</DialogTitle>
        <DialogContent dividers>
          <FormGrid min={230} gap={2}>
            <div>
              <TextField
                label="Номер на трансфер"
                value={form.transferNumber}
                onChange={(event) => setForm({ ...form, transferNumber: event.target.value })}
              />
            </div>
            <div>
              <TextField
                label="Заявил"
                value={form.requestedBy}
                onChange={(event) => setForm({ ...form, requestedBy: event.target.value })}
              />
            </div>
            <div>
              <TextField
                select
                label="От магазин"
                value={form.fromStore}
                onChange={(event) => setForm({ ...form, fromStore: event.target.value })}
              >
                {stores.map((store) => (
                  <MenuItem key={store._id} value={store._id}>
                    {store.name} | {store.city}
                  </MenuItem>
                ))}
              </TextField>
            </div>
            <div>
              <TextField
                select
                label="Към магазин"
                value={form.toStore}
                onChange={(event) => setForm({ ...form, toStore: event.target.value })}
              >
                {stores.map((store) => (
                  <MenuItem key={store._id} value={store._id}>
                    {store.name} | {store.city}
                  </MenuItem>
                ))}
              </TextField>
            </div>
            <div>
              <TextField
                select
                label="Продукт"
                value={form.product}
                onChange={(event) => setForm({ ...form, product: event.target.value })}
              >
                {products.map((product) => (
                  <MenuItem key={product._id} value={product._id}>
                    {product.name} | {product.sku}
                  </MenuItem>
                ))}
              </TextField>
            </div>
            <div>
              <TextField
                label="Количество"
                type="number"
                value={form.quantity}
                onChange={(event) => setForm({ ...form, quantity: event.target.value })}
              />
            </div>
            <FormGridFull>
              <TextField
                multiline
                minRows={3}
                label="Бележки"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </FormGridFull>
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
