import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ShoppingCartCheckoutRoundedIcon from "@mui/icons-material/ShoppingCartCheckoutRounded";
import { Box, Button, Chip, DialogContent, DialogTitle, InputAdornment, Stack, Switch, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import DataSection from "../components/DataSection";
import Dialog from "../components/DraggableDialog";
import DialogFooterActions from "../components/DialogFooterActions";
import { FormGrid, FormGridFull } from "../components/FormGrid";
import GridRowActions from "../components/GridRowActions";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";
import api from "../lib/api";
import { formatDate } from "../lib/currency";

const initialForm = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  vatNumber: "",
  notes: "",
  active: true
};

function validateSupplier(supplier) {
  if (!supplier?.name?.trim()) return "Името на доставчика е задължително.";
  return "";
}

export default function SuppliersPage() {
  const { data = [], loading, setData } = useFetch("/suppliers");
  const { data: supplierOrders = [] } = useFetch("/supplier-orders");
  const isMobile = useMobileDetection();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deletingSupplier, setDeletingSupplier] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");

  const filteredSuppliers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return data;
    return data.filter((supplier) =>
      [supplier.name, supplier.contactPerson, supplier.phone, supplier.email, supplier.address, supplier.vatNumber, supplier.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [data, query]);

  const selectedSupplier = useMemo(
    () => filteredSuppliers.find((item) => String(item._id) === String(selectedSupplierId)) || data.find((item) => String(item._id) === String(selectedSupplierId)) || null,
    [data, filteredSuppliers, selectedSupplierId]
  );

  const supplierHistory = useMemo(() => {
    if (!selectedSupplier) return null;

    const orders = (supplierOrders || []).filter((order) => {
      if (order.supplierRef && String(order.supplierRef) === String(selectedSupplier._id)) return true;
      return String(order.supplier?.name || "").trim().toLowerCase() === String(selectedSupplier.name || "").trim().toLowerCase();
    });

    const totalOrders = orders.length;
    const totalValue = orders.reduce((sum, order) => {
      return sum + (order.items || []).reduce((itemsSum, item) => itemsSum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0);
    }, 0);
    const receivedOrders = orders.filter((order) => order.status === "received").length;
    const lastDelivery = orders
      .filter((order) => order.receivedAt || order.updatedAt || order.createdAt)
      .sort((a, b) => new Date(b.receivedAt || b.updatedAt || b.createdAt).getTime() - new Date(a.receivedAt || a.updatedAt || a.createdAt).getTime())[0] || null;

    const productMap = new Map();
    orders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const product = item.product || {};
        const key = String(product._id || product.productNumber || product.name || "");
        if (!key) return;
        const current = productMap.get(key) || {
          name: product.name || "-",
          productNumber: product.productNumber || "-",
          quantity: 0,
          total: 0
        };
        current.quantity += Number(item.quantity || 0);
        current.total += Number(item.quantity || 0) * Number(item.unitCost || 0);
        productMap.set(key, current);
      });
    });

    const topProducts = [...productMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5);

    return {
      totalOrders,
      totalValue,
      receivedOrders,
      lastDelivery,
      topProducts,
      recentOrders
    };
  }, [selectedSupplier, supplierOrders]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingSupplier(null);
  }

  function openCreateDialog() {
    resetForm();
    setOpen(true);
  }

  function openEditDialog(supplier) {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name || "",
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      vatNumber: supplier.vatNumber || "",
      notes: supplier.notes || "",
      active: supplier.active ?? true
    });
    setOpen(true);
  }

  async function handleSave() {
    const validationMessage = validateSupplier(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      if (editingSupplier?._id) {
        const response = await api.put(`/suppliers/${editingSupplier._id}`, form);
        setData((current) => current.map((item) => (item._id === editingSupplier._id ? response.data : item)));
        toast.success("Доставчикът е обновен.");
      } else {
        const response = await api.post("/suppliers", form);
        setData((current) => [response.data, ...current]);
        toast.success("Доставчикът е добавен.");
      }
      resetForm();
      setOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно записване на доставчик.");
    }
  }

  async function handleDelete() {
    if (!deletingSupplier?._id) return;
    try {
      await api.delete(`/suppliers/${deletingSupplier._id}`);
      setData((current) => current.filter((item) => item._id !== deletingSupplier._id));
      setDeletingSupplier(null);
      toast.success("Доставчикът е изтрит.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно изтриване на доставчик.");
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Партньори"
        title="Регистър на доставчици"
        subtitle="Поддържай фирми, контакти и данни за поръчки към доставчици."
        icon={<LocalShippingRoundedIcon />}
      />

      <DataSection
        title="Доставчици"
        subtitle="Списък с фирми и контакти за зареждане"
        icon={<LocalShippingRoundedIcon />}
        toolbar={
          <TextField
            placeholder="Търси по име, лице, телефон, имейл или ЕИК"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              )
            }}
            sx={{ maxWidth: 420 }}
          />
        }
        actions={<Button variant="contained" startIcon={<PersonAddRoundedIcon />} onClick={openCreateDialog}>Нов доставчик</Button>}
      >
        {selectedSupplier && supplierHistory ? (
          <Stack spacing={1.25} sx={{ mb: 1.5, p: 1.5, borderRadius: 2, border: "1px solid rgba(39,86,107,0.14)", bgcolor: "rgba(39,86,107,0.04)" }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} justifyContent="space-between" alignItems={{ md: "center" }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={900}>{selectedSupplier.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedSupplier.contactPerson || "-"} | {selectedSupplier.phone || "-"} | {selectedSupplier.email || "-"}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Button variant="outlined" startIcon={<ShoppingCartCheckoutRoundedIcon />} onClick={() => navigate("/supplier-orders")}>Поръчки към доставчика</Button>
              </Stack>
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label={`Поръчки: ${supplierHistory.totalOrders}`} size="small" />
              <Chip label={`Получени: ${supplierHistory.receivedOrders}`} size="small" color={supplierHistory.receivedOrders ? "success" : "default"} />
              <Chip label={`Обща стойност: ${new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR" }).format(supplierHistory.totalValue || 0)}`} size="small" color="info" variant="outlined" />
              <Chip label={`Последна доставка: ${supplierHistory.lastDelivery ? new Date(supplierHistory.lastDelivery.receivedAt || supplierHistory.lastDelivery.updatedAt || supplierHistory.lastDelivery.createdAt).toLocaleDateString("bg-BG") : "-"}`} size="small" variant="outlined" />
            </Stack>
            {supplierHistory.topProducts.length ? (
              <Box>
                <Typography variant="body2" fontWeight={800} sx={{ mb: 0.5 }}>Най-поръчвани артикули</Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {supplierHistory.topProducts.map((product) => (
                    <Chip key={`${product.name}-${product.productNumber}`} label={`${product.name} | № ${product.productNumber} | ${product.quantity} бр.`} />
                  ))}
                </Stack>
              </Box>
            ) : null}
            {supplierHistory.recentOrders.length ? (
              <Box>
                <Typography variant="body2" fontWeight={800} sx={{ mb: 0.5 }}>Последни поръчки</Typography>
                <Stack spacing={0.5}>
                  {supplierHistory.recentOrders.map((order) => (
                    <Typography key={order._id} variant="body2" color="text.secondary">
                      {order.orderNumber} | {new Date(order.createdAt).toLocaleDateString("bg-BG")} | {order.status}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            ) : null}
          </Stack>
        ) : null}
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={filteredSuppliers}
            getRowId={(row) => row._id}
            rowSelectionModel={selectedSupplierId ? [selectedSupplierId] : []}
            onRowSelectionModelChange={(nextSelection) => setSelectedSupplierId(String(nextSelection?.[0] || ""))}
            onRowClick={(params) => setSelectedSupplierId(String(params.row._id))}
            columns={[
              { field: "name", headerName: "Доставчик", flex: 1.1, minWidth: 180 },
              { field: "createdAt", headerName: "Дата създаване", flex: 0.85, minWidth: 130, valueFormatter: (params) => formatDate(params?.value ?? params) },
              { field: "contactPerson", headerName: "Лице за контакт", flex: 0.9, minWidth: 150 },
              { field: "phone", headerName: "Телефон", flex: 0.8, minWidth: 130 },
              { field: "email", headerName: "Email", flex: 1, minWidth: 180 },
              { field: "vatNumber", headerName: "ЕИК", flex: 0.8, minWidth: 130 },
              { field: "address", headerName: "Адрес", flex: 1.1, minWidth: 190 },
              { field: "actions", headerName: "", sortable: false, filterable: false, width: 110, align: "center", renderCell: (params) => <GridRowActions onEdit={() => openEditDialog(params.row)} onDelete={() => setDeletingSupplier(params.row)} /> }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>{editingSupplier ? "Редактиране на доставчик" : "Нов доставчик"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.25}>
            <FormGrid min={240}>
              <TextField label="Име на фирма" value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
              <TextField label="Лице за контакт" value={form.contactPerson} onChange={(event) => updateField("contactPerson", event.target.value)} />
              <TextField label="Телефон" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
              <TextField label="Email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
              <TextField label="ЕИК" value={form.vatNumber} onChange={(event) => updateField("vatNumber", event.target.value)} />
              <TextField label="Адрес" value={form.address} onChange={(event) => updateField("address", event.target.value)} />
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minHeight: 56 }}>
                <Typography variant="body2" fontWeight={700}>Активен доставчик</Typography>
                <Switch checked={form.active} onChange={(event) => updateField("active", event.target.checked)} />
              </Stack>
              <FormGridFull>
                <TextField label="Бележки" multiline minRows={3} value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
              </FormGridFull>
            </FormGrid>
          </Stack>
        </DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setOpen(false)} onConfirm={handleSave} />
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deletingSupplier)}
        title="Изтриване на доставчик"
        description={`Сигурен ли си, че искаш да изтриеш ${deletingSupplier?.name || "този доставчик"}?`}
        onClose={() => setDeletingSupplier(null)}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}