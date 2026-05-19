import { useEffect, useMemo, useState } from "react";
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import DataSection from "../components/DataSection";
import { FormGrid, FormGridFull } from "../components/FormGrid";
import PageHeader from "../components/PageHeader";
import { ProductIdentity, ProductPreviewCard } from "../components/ProductPresentation";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";
import { formatCurrencyEUR } from "../lib/currency";
import api from "../lib/api";

const initialOrder = { orderNumber: "", store: "", customer: "", product: "", quantity: "1", unitPrice: "", totalAmount: "" };

export default function OrdersPagePolished() {
  const { data: orders, loading, setData } = useFetch("/orders");
  const { data: stores } = useFetch("/stores");
  const { data: customers } = useFetch("/customers");
  const { data: products } = useFetch("/products");
  const { data: inventory } = useFetch("/inventory/summary");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialOrder);
  const isMobile = useMobileDetection();

  const selectedProduct = useMemo(() => products.find((product) => product._id === form.product), [products, form.product]);
  const selectedInventory = useMemo(
    () => inventory.find((item) => item.product?._id === form.product && item.store?._id === form.store),
    [inventory, form.product, form.store]
  );

  useEffect(() => {
    if (!selectedProduct) return;
    setForm((current) => {
      const quantity = Number(current.quantity || 1);
      const unitPrice = current.unitPrice || String(selectedProduct.price ?? "");
      const totalAmount = Number(unitPrice || 0) * quantity;
      return { ...current, unitPrice, totalAmount: totalAmount ? totalAmount.toFixed(2) : current.totalAmount };
    });
  }, [selectedProduct]);

  async function handleCreate() {
    try {
      const response = await api.post("/orders", {
        orderNumber: form.orderNumber,
        store: form.store,
        customer: form.customer || undefined,
        totalAmount: Number(form.totalAmount),
        items: [{ product: form.product, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) }]
      });
      setData((current) => [response.data, ...current]);
      setForm(initialOrder);
      setOpen(false);
      toast.success("Продажбата е записана.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно записване на продажбата.");
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader eyebrow="Продажби" title="Продажби и търговски поток" subtitle="Създавай продажби с визуален избор на продукт и автоматично попълване на цената." />
      <DataSection title="Регистър на продажбите" subtitle="Последни търговски операции" actions={<Button variant="contained" onClick={() => setOpen(true)}>Нова продажба</Button>}>
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={orders}
            getRowId={(row) => row._id}
            columns={[
              { field: "orderNumber", headerName: "Продажба", flex: 1, minWidth: 130 },
              { field: "customer", headerName: "Клиент", flex: 1.2, minWidth: 160, valueGetter: (_, row) => row.customer?.fullName || row.customer?.company || "На място" },
              { field: "store", headerName: "Магазин", flex: 1, minWidth: 140, valueGetter: (_, row) => row.store?.name || "-" },
              {
                field: "product",
                headerName: "Продукт",
                flex: 1.2,
                minWidth: 200,
                renderCell: (params) => <ProductIdentity compact product={params?.row?.items?.[0]?.product} />
              },
              { field: "paymentStatus", headerName: "Плащане", flex: 0.9, minWidth: 120 },
              { field: "totalAmount", headerName: "Общо", flex: 1, minWidth: 180, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md" fullScreen={isMobile} PaperProps={{ sx: { borderRadius: { xs: 0, sm: 2.5 } } }}>
        <DialogTitle>Нова продажба</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <FormGrid min={230}>
              <TextField label="Номер на продажба" value={form.orderNumber} onChange={(e) => setForm({ ...form, orderNumber: e.target.value })} />
              <TextField select label="Магазин" value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })}>
                {stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}
              </TextField>
              <TextField select label="Клиент" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })}>
                <MenuItem value="">Клиент на място</MenuItem>
                {customers.map((customer) => <MenuItem key={customer._id} value={customer._id}>{customer.fullName}</MenuItem>)}
              </TextField>
              <TextField select label="Продукт" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
                {products.map((product) => (
                  <MenuItem key={product._id} value={product._id}>
                    {product.name} | {product.sku}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Количество"
                type="number"
                value={form.quantity}
                onChange={(e) => {
                  const quantity = e.target.value;
                  const totalAmount = Number(quantity || 0) * Number(form.unitPrice || 0);
                  setForm({ ...form, quantity, totalAmount: totalAmount ? totalAmount.toFixed(2) : "" });
                }}
              />
              <TextField label="Единична цена" type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
              <TextField label="Крайна сума" type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} />
            </FormGrid>
            <FormGridFull>
              <ProductPreviewCard product={selectedProduct} />
            </FormGridFull>
            <FormGridFull>
              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  При избор на продукт системата взима каталожната цена и позволява ръчна корекция за конкретната продажба.
                </Typography>
                <Typography variant="body2" color={selectedInventory ? "text.primary" : "warning.main"} fontWeight={700}>
                  Наличност в избрания магазин: {selectedInventory ? `${selectedInventory.quantity} бр.` : "няма наличност"}
                </Typography>
              </Stack>
            </FormGridFull>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: "column", sm: "row" }, p: 2, gap: 1 }}>
          <Button fullWidth={isMobile} onClick={() => setOpen(false)}>Отказ</Button>
          <Button fullWidth={isMobile} variant="contained" onClick={handleCreate}>Запази</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}



