import { useMemo, useState } from "react";
import AddBusinessRoundedIcon from "@mui/icons-material/AddBusinessRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import ShoppingCartCheckoutRoundedIcon from "@mui/icons-material/ShoppingCartCheckoutRounded";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import DataSection from "../components/DataSection";
import Dialog from "../components/DraggableDialog";
import DialogFooterActions from "../components/DialogFooterActions";
import { FormGrid, FormGridFull } from "../components/FormGrid";
import GridRowActions from "../components/GridRowActions";
import PageHeader from "../components/PageHeader";
import { ProductIdentity } from "../components/ProductPresentation";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";
import api from "../lib/api";
import { formatCurrencyEUR } from "../lib/currency";
import { exportSupplierOrderPdf, printSupplierOrder } from "../lib/printDocuments";
import { useAuth } from "../providers/AuthProviderStable";

let supplierOrderItemKey = 0;

function createItemKey() {
  supplierOrderItemKey += 1;
  return globalThis.crypto?.randomUUID?.() || `supplier-order-item-${Date.now()}-${supplierOrderItemKey}`;
}

function createSupplierOrderItem(overrides = {}) {
  return {
    key: createItemKey(),
    product: "",
    quantity: "",
    unitCost: "",
    ...overrides
  };
}

function createInitialOrder(requestedBy = "") {
  return {
    orderNumber: "Генерира се автоматично",
    supplierRef: "",
    supplier: {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      vatNumber: ""
    },
    store: "",
    requestedBy,
    expectedDate: "",
    status: "draft",
    notes: "",
    items: [createSupplierOrderItem()]
  };
}

function normalizeItems(items = []) {
  const normalized = items.map((item) =>
    createSupplierOrderItem({
      product: item.product?._id || item.product || "",
      quantity: String(item.quantity ?? 1),
      unitCost: String(item.unitCost ?? item.product?.cost ?? item.product?.price ?? 0)
    })
  );
  return normalized.length ? normalized : [createSupplierOrderItem()];
}

function getCleanItems(order) {
  return (order?.items || [])
    .map((item) => ({
      product: item.product,
      quantity: Number(item.quantity || 0),
      unitCost: Number(item.unitCost || 0)
    }))
    .filter((item) => item.product && item.quantity > 0);
}

function validateSupplierOrder(order) {
  if (!order?.supplier?.name?.trim()) return "Попълни име на доставчик.";
  if (!order?.store) return "Избери обект за получаване.";
  if (!order?.requestedBy?.trim()) return "Попълни кой заявява поръчката.";
  const items = getCleanItems(order);
  if (!items.length) return "Добави поне един продукт.";

  for (const [index, item] of items.entries()) {
    if (Number(item.quantity || 0) <= 0) return `Количеството на ред ${index + 1} трябва да е по-голямо от 0.`;
    if (Number(item.unitCost || 0) < 0) return `Доставната цена на ред ${index + 1} не може да е отрицателна.`;
  }

  return "";
}

function getProductOptionLabel(product) {
  if (!product) return "";
  return [product.name, product.productNumber ? `№ ${product.productNumber}` : "", product.sku || product.barcode || ""].filter(Boolean).join(" | ");
}

function getProductById(products, productId) {
  return (products || []).find((product) => String(product._id) === String(productId)) || null;
}

function getTotals(order) {
  return getCleanItems(order).reduce(
    (acc, item) => ({
      quantity: acc.quantity + Number(item.quantity || 0),
      total: acc.total + Number(item.quantity || 0) * Number(item.unitCost || 0)
    }),
    { quantity: 0, total: 0 }
  );
}

function statusLabel(status) {
  return {
    draft: "Чернова",
    sent: "Изпратена",
    received: "Получена",
    cancelled: "Отказана"
  }[status] || status || "-";
}

function statusColor(status) {
  return {
    draft: "default",
    sent: "info",
    received: "success",
    cancelled: "error"
  }[status] || "default";
}

function SupplierOrderItemsCell({ items }) {
  const visibleItems = items || [];
  return (
    <Stack spacing={0.5} sx={{ width: "100%", py: 0.75 }}>
      {visibleItems.slice(0, 3).map((item, index) => (
        <Stack key={`${item.product?._id || index}-${index}`} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <ProductIdentity compact product={item.product} />
          </Box>
          <Typography variant="body2" fontWeight={900} whiteSpace="nowrap">
            {Number(item.quantity || 0)} бр.
          </Typography>
        </Stack>
      ))}
      {visibleItems.length > 3 ? <Typography variant="caption" color="text.secondary">+ още {visibleItems.length - 3} продукта</Typography> : null}
    </Stack>
  );
}

function SupplierOrderItemsEditor({ value, products, onChange }) {
  const items = value?.length ? value : [createSupplierOrderItem()];

  function updateItem(key, patch) {
    onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function removeItem(key) {
    const nextItems = items.filter((item) => item.key !== key);
    onChange(nextItems.length ? nextItems : [createSupplierOrderItem()]);
  }

  function addRow() {
    onChange([...items, createSupplierOrderItem()]);
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2" fontWeight={900}>Артикули в поръчката</Typography>
        <Button size="small" onClick={addRow}>Добави ред</Button>
      </Stack>

      <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.25, bgcolor: "background.paper" }}>
        <Table size="small" sx={{ minWidth: 720, tableLayout: "fixed" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 32 }}>№</TableCell>
              <TableCell sx={{ width: 290 }}>Продукт</TableCell>
              <TableCell align="right" sx={{ width: 90 }}>Бройки</TableCell>
              <TableCell align="right" sx={{ width: 120 }}>Дост. цена</TableCell>
              <TableCell align="right" sx={{ width: 120 }}>Сума</TableCell>
              <TableCell align="center" sx={{ width: 40 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => {
              const selectedProduct = getProductById(products, item.product);
              const quantity = Number(item.quantity || 0);
              const unitCost = Number(item.unitCost || 0);
              return (
                <TableRow key={item.key}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <Autocomplete
                      size="small"
                      options={Array.isArray(products) ? products : []}
                      getOptionLabel={getProductOptionLabel}
                      value={selectedProduct}
                      onChange={(_, product) =>
                        updateItem(item.key, {
                          product: product?._id || "",
                          quantity: product ? item.quantity || "1" : "",
                          unitCost: product ? String(product.cost ?? product.price ?? item.unitCost ?? 0) : ""
                        })
                      }
                      isOptionEqualToValue={(option, selectedValue) => option?._id === selectedValue?._id}
                      renderInput={(params) => <TextField {...params} size="small" placeholder={`Продукт ${index + 1}`} />}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField size="small" type="number" value={item.quantity} onChange={(event) => updateItem(item.key, { quantity: event.target.value })} inputProps={{ min: 1 }} sx={{ width: 72 }} />
                  </TableCell>
                  <TableCell align="right">
                    <TextField size="small" type="number" value={item.unitCost} onChange={(event) => updateItem(item.key, { unitCost: event.target.value })} inputProps={{ min: 0 }} sx={{ width: 98 }} />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={900}>{selectedProduct ? formatCurrencyEUR(quantity * unitCost) : "-"}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Премахни ред">
                      <span>
                        <IconButton size="small" color="error" onClick={() => removeItem(item.key)} disabled={items.length === 1}>
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

export default function SupplierOrdersPage() {
  const { user } = useAuth();
  const { data: orders = [], loading, setData } = useFetch("/supplier-orders");
  const { data: suppliers = [] } = useFetch("/suppliers");
  const { data: stores = [] } = useFetch("/stores");
  const { data: products = [] } = useFetch("/products");
  const { data: inventory = [] } = useFetch("/inventory/summary");
  const { data: salesOrders = [] } = useFetch("/orders");
  const isMobile = useMobileDetection();

  const [open, setOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [form, setForm] = useState(() => createInitialOrder(user?.fullName || user?.username || ""));

  const rows = useMemo(
    () =>
      orders.map((order) => {
        const totals = getTotals({ items: order.items });
        return {
          ...order,
          supplierName: order.supplier?.name || "-",
          totalQuantity: totals.quantity,
          totalAmount: totals.total
        };
      }),
    [orders]
  );

  const selectedOrder = useMemo(
    () => rows.find((item) => String(item._id) === String(selectedOrderId)) || null,
    [rows, selectedOrderId]
  );

  function resetForm() {
    setForm(createInitialOrder(user?.fullName || user?.username || ""));
  }

  function openCreateDialog() {
    setEditingOrder(null);
    resetForm();
    setOpen(true);
  }

  function openEditDialog(order) {
    setEditingOrder(order);
    setForm({
      orderNumber: order.orderNumber || "",
      supplierRef: order.supplierRef || "",
      supplier: {
        name: order.supplier?.name || "",
        contactPerson: order.supplier?.contactPerson || "",
        phone: order.supplier?.phone || "",
        email: order.supplier?.email || "",
        address: order.supplier?.address || "",
        vatNumber: order.supplier?.vatNumber || ""
      },
      store: order.store?._id || order.store || "",
      requestedBy: order.requestedBy || user?.fullName || user?.username || "",
      expectedDate: order.expectedDate ? new Date(order.expectedDate).toISOString().slice(0, 10) : "",
      status: order.status || "draft",
      notes: order.notes || "",
      items: normalizeItems(order.items)
    });
    setOpen(true);
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateSupplierField(key, value) {
    setForm((current) => ({ ...current, supplier: { ...current.supplier, [key]: value } }));
  }

  function applySupplierSelection(supplier) {
    if (!supplier) return;
    setForm((current) => ({
      ...current,
      supplierRef: supplier._id || "",
      supplier: {
        name: supplier.name || "",
        contactPerson: supplier.contactPerson || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        vatNumber: supplier.vatNumber || ""
      }
    }));
  }

  function buildPayload(source) {
    return {
      orderNumber: source.orderNumber,
      supplierRef: source.supplierRef || undefined,
      supplier: source.supplier,
      store: source.store,
      requestedBy: source.requestedBy,
      expectedDate: source.expectedDate || undefined,
      status: source.status,
      notes: source.notes || undefined,
      items: getCleanItems(source)
    };
  }

  function addSuggestedProduct(product, quantity) {
    if (!product?._id || Number(quantity || 0) <= 0) return;

    setForm((current) => {
      const existingItem = (current.items || []).find((item) => String(item.product) === String(product._id));
      if (existingItem) {
        return {
          ...current,
          items: current.items.map((item) =>
            item.key === existingItem.key
              ? { ...item, quantity: String(Number(item.quantity || 0) + Number(quantity || 0)) }
              : item
          )
        };
      }

      return {
        ...current,
        items: [
          ...(current.items || []),
          createSupplierOrderItem({
            product: product._id,
            quantity: String(quantity),
            unitCost: String(product.cost ?? product.price ?? 0)
          })
        ]
      };
    });
  }

  async function handleCreate() {
    const validationMessage = validateSupplierOrder(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.post("/supplier-orders", buildPayload(form));
      setData((current) => [response.data, ...current]);
      setOpen(false);
      resetForm();
      setSelectedOrderId(response.data._id);
      toast.success("Поръчката към доставчик е създадена.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно създаване на поръчка към доставчик.");
    }
  }

  async function handleUpdate() {
    if (!editingOrder?._id) return;
    const validationMessage = validateSupplierOrder(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.put(`/supplier-orders/${editingOrder._id}`, buildPayload(form));
      setData((current) => current.map((item) => (item._id === editingOrder._id ? response.data : item)));
      setEditingOrder(null);
      setOpen(false);
      setSelectedOrderId(response.data._id);
      toast.success("Поръчката към доставчик е обновена.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешна редакция на поръчка към доставчик.");
    }
  }

  async function handleDelete() {
    if (!deletingOrder?._id) return;
    try {
      await api.delete(`/supplier-orders/${deletingOrder._id}`);
      setData((current) => current.filter((item) => item._id !== deletingOrder._id));
      if (String(selectedOrderId) === String(deletingOrder._id)) setSelectedOrderId("");
      setDeletingOrder(null);
      toast.success("Поръчката към доставчик е изтрита.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно изтриване на поръчка към доставчик.");
    }
  }

  async function handleReceive(order = selectedOrder) {
    if (!order?._id) return;
    try {
      const response = await api.post(`/supplier-orders/${order._id}/receive`);
      setData((current) => current.map((item) => (item._id === order._id ? response.data : item)));
      setSelectedOrderId(order._id);
      toast.success("Доставката е приета и наличността е обновена.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно приемане на доставката.");
    }
  }

  const purchaseSuggestions = useMemo(() => {
    if (!form.store) return [];

    const recentThreshold = new Date();
    recentThreshold.setDate(recentThreshold.getDate() - 30);

    const soldByProduct = new Map();
    (salesOrders || []).forEach((order) => {
      const orderStoreId = order?.store?._id || order?.store;
      const orderDate = new Date(order?.createdAt || order?.updatedAt || 0);
      if (String(orderStoreId) !== String(form.store) || Number.isNaN(orderDate.getTime()) || orderDate < recentThreshold) {
        return;
      }

      (order.items || []).forEach((item) => {
        const productId = item?.product?._id || item?.product;
        if (!productId) return;
        soldByProduct.set(String(productId), (soldByProduct.get(String(productId)) || 0) + Number(item.quantity || 0));
      });
    });

    return (inventory || [])
      .filter((row) => String(row?.store?._id || row?.store) === String(form.store))
      .map((row) => {
        const product = row.product;
        if (!product?._id) return null;
        const currentQty = Number(row.quantity || 0);
        const reorderLevel = Number(row.reorderLevel || 0);
        const soldLast30 = Number(soldByProduct.get(String(product._id)) || 0);
        const suggestedQty = Math.max(
          0,
          Math.max(
            reorderLevel > currentQty ? reorderLevel - currentQty : 0,
            soldLast30 > currentQty ? soldLast30 - currentQty : 0,
            row.isLowStock ? Math.max(reorderLevel, 1) : 0
          )
        );

        if (!suggestedQty && !row.isLowStock && soldLast30 <= 0) return null;

        return {
          product,
          currentQty,
          reorderLevel,
          soldLast30,
          suggestedQty
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.suggestedQty - a.suggestedQty || b.soldLast30 - a.soldLast30)
      .slice(0, 8);
  }, [form.store, inventory, salesOrders]);

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Доставки"
        title="Поръчки към доставчици"
        subtitle="Създавай поръчки към доставчици, печатай документ и приемай доставка директно в наличността."
        icon={<LocalShippingRoundedIcon />}
      />

      <DataSection
        title="Регистър на поръчките към доставчици"
        subtitle="Входящи доставки и поръчки за зареждане"
        icon={<ShoppingCartCheckoutRoundedIcon />}
        actions={<Button variant="contained" startIcon={<AddBusinessRoundedIcon />} onClick={openCreateDialog}>Нова поръчка към доставчик</Button>}
      >
        {selectedOrder ? (
          <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 2, border: "1px solid rgba(39,86,107,0.14)", bgcolor: "rgba(39,86,107,0.04)" }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} justifyContent="space-between" alignItems={{ md: "center" }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={900}>{selectedOrder.orderNumber} | {selectedOrder.supplier?.name || "-"}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedOrder.store?.name || "-"} | {selectedOrder.totalQuantity || 0} бр. | {formatCurrencyEUR(selectedOrder.totalAmount || 0)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Button variant="outlined" color="secondary" onClick={() => printSupplierOrder(selectedOrder)}>Документ</Button>
                <Button variant="outlined" onClick={() => void exportSupplierOrderPdf(selectedOrder)}>PDF</Button>
                <Button variant="outlined" onClick={() => openEditDialog(selectedOrder)} disabled={selectedOrder.status === "received"}>Редактирай</Button>
                <Button variant="contained" color="success" onClick={() => void handleReceive(selectedOrder)} disabled={selectedOrder.status === "received" || selectedOrder.status === "cancelled"}>Приеми доставка</Button>
                <Button variant="outlined" color="error" onClick={() => setDeletingOrder(selectedOrder)} disabled={selectedOrder.status === "received"}>Изтрий</Button>
              </Stack>
            </Stack>
          </Box>
        ) : null}

        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={rows}
            getRowId={(row) => row._id}
            rowSelectionModel={selectedOrderId ? [selectedOrderId] : []}
            onRowSelectionModelChange={(nextSelection) => setSelectedOrderId(String(nextSelection?.[0] || ""))}
            onRowClick={(params) => setSelectedOrderId(String(params.row._id))}
            columns={[
              { field: "orderNumber", headerName: "Поръчка", flex: 0.8, minWidth: 130 },
              { field: "supplierName", headerName: "Доставчик", flex: 0.95, minWidth: 170 },
              { field: "store", headerName: "Получаване", flex: 0.85, minWidth: 150, valueGetter: (_, row) => row.store?.name || "-" },
              { field: "items", headerName: "Продукти", flex: 2, minWidth: 360, sortable: false, renderCell: (params) => <SupplierOrderItemsCell items={params.row?.items || []} /> },
              { field: "expectedDate", headerName: "Очаквана дата", flex: 0.75, minWidth: 120, valueGetter: (_, row) => (row.expectedDate ? new Date(row.expectedDate).toLocaleDateString("bg-BG") : "-") },
              { field: "totalAmount", headerName: "Стойност", flex: 0.7, minWidth: 120, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) },
              { field: "status", headerName: "Статус", flex: 0.65, minWidth: 110, renderCell: (params) => <Chip size="small" label={statusLabel(params.value)} color={statusColor(params.value)} /> },
              { field: "requestedBy", headerName: "Заявил", flex: 0.75, minWidth: 120 },
              { field: "actions", headerName: "", sortable: false, filterable: false, width: 150, align: "center", renderCell: (params) => <GridRowActions onPrint={() => printSupplierOrder(params.row)} printLabel="Документ" onEdit={() => openEditDialog(params.row)} onDelete={params.row.status === "received" ? undefined : () => setDeletingOrder(params.row)} /> }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="lg" fullScreen={isMobile}>
        <DialogTitle>{editingOrder ? "Редактиране на поръчка към доставчик" : "Нова поръчка към доставчик"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight={800}>Доставчик</Typography>
              <Autocomplete
                options={Array.isArray(suppliers) ? suppliers : []}
                getOptionLabel={(item) => [item?.name, item?.contactPerson, item?.phone].filter(Boolean).join(" | ")}
                value={suppliers.find((item) => item.name === form.supplier.name) || null}
                onChange={(_, supplier) => applySupplierSelection(supplier)}
                isOptionEqualToValue={(option, value) => option?._id === value?._id}
                renderInput={(params) => <TextField {...params} label="Избери от регистъра" />}
              />
              <FormGrid min={220}>
                <TextField label="Име на доставчик" value={form.supplier.name} onChange={(event) => updateSupplierField("name", event.target.value)} />
                <TextField label="Лице за контакт" value={form.supplier.contactPerson} onChange={(event) => updateSupplierField("contactPerson", event.target.value)} />
                <TextField label="Телефон" value={form.supplier.phone} onChange={(event) => updateSupplierField("phone", event.target.value)} />
                <TextField label="Email" value={form.supplier.email} onChange={(event) => updateSupplierField("email", event.target.value)} />
                <TextField label="ЕИК" value={form.supplier.vatNumber} onChange={(event) => updateSupplierField("vatNumber", event.target.value)} />
                <TextField label="Адрес" value={form.supplier.address} onChange={(event) => updateSupplierField("address", event.target.value)} />
              </FormGrid>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight={800}>Детайли на поръчката</Typography>
              <FormGrid min={220}>
                <TextField label="Номер" value={form.orderNumber} disabled />
                <TextField select label="Получаване в обект" value={form.store} onChange={(event) => updateField("store", event.target.value)}>
                  {stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}
                </TextField>
                <TextField label="Заявил" value={form.requestedBy} onChange={(event) => updateField("requestedBy", event.target.value)} />
                <TextField type="date" label="Очаквана дата" value={form.expectedDate} onChange={(event) => updateField("expectedDate", event.target.value)} InputLabelProps={{ shrink: true }} />
                <TextField select label="Статус" value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                  <MenuItem value="draft">Чернова</MenuItem>
                  <MenuItem value="sent">Изпратена</MenuItem>
                  <MenuItem value="cancelled">Отказана</MenuItem>
                  {editingOrder ? <MenuItem value="received">Получена</MenuItem> : null}
                </TextField>
              </FormGrid>
            </Stack>

            <FormGridFull>
              <Box sx={{ p: 1.5, borderRadius: 2, border: "1px solid rgba(39,86,107,0.10)", bgcolor: "rgba(39,86,107,0.05)" }}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" fontWeight={900}>Предложения за поръчка</Typography>
                  {!form.store ? (
                    <Typography variant="body2" color="text.secondary">Избери обект за получаване, за да видиш кои артикули са за дозареждане.</Typography>
                  ) : purchaseSuggestions.length ? (
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      {purchaseSuggestions.map((suggestion) => (
                        <Chip
                          key={suggestion.product._id}
                          color={suggestion.currentQty <= suggestion.reorderLevel ? "warning" : "default"}
                          variant="outlined"
                          label={`${suggestion.product.name} | № ${suggestion.product.productNumber || "-"} | Нал.: ${suggestion.currentQty} | Прод.30д: ${suggestion.soldLast30} | Поръчай: ${suggestion.suggestedQty}`}
                          onClick={() => addSuggestedProduct(suggestion.product, suggestion.suggestedQty)}
                          onDelete={() => addSuggestedProduct(suggestion.product, suggestion.suggestedQty)}
                          deleteIcon={<AddBusinessRoundedIcon />}
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">Няма критични предложения за дозареждане по текущите наличности и продажби.</Typography>
                  )}
                </Stack>
              </Box>
            </FormGridFull>

            <FormGridFull>
              <SupplierOrderItemsEditor value={form.items} products={products} onChange={(items) => updateField("items", items)} />
            </FormGridFull>

            <FormGridFull>
              <Box sx={{ p: 1.5, borderRadius: 2, border: "1px solid rgba(39,86,107,0.10)", bgcolor: "rgba(39,86,107,0.05)" }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <Typography variant="body2">Общо бройки: <strong>{getTotals(form).quantity}</strong></Typography>
                  <Typography variant="body2">Обща стойност: <strong>{formatCurrencyEUR(getTotals(form).total)}</strong></Typography>
                </Stack>
              </Box>
            </FormGridFull>

            <FormGridFull>
              <TextField fullWidth multiline minRows={3} label="Бележки" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
            </FormGridFull>
          </Stack>
        </DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setOpen(false)} onConfirm={editingOrder ? handleUpdate : handleCreate} />
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deletingOrder)}
        title="Изтриване на поръчка към доставчик"
        description={`Сигурен ли си, че искаш да изтриеш ${deletingOrder?.orderNumber || "тази поръчка"}?`}
        onClose={() => setDeletingOrder(null)}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}