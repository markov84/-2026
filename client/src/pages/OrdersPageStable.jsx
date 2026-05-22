import { useMemo, useState } from "react";
import AddShoppingCartRoundedIcon from "@mui/icons-material/AddShoppingCartRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Autocomplete, Box, Button, DialogContent, DialogTitle, IconButton, InputAdornment, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
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
import { printOrder } from "../lib/printDocuments";
import { useAuth } from "../providers/AuthProviderStable";

const initialOrder = {
  orderNumber: "Генерира се автоматично",
  store: "",
  customer: "",
  items: [],
  status: "pending",
  paymentStatus: "unpaid"
};

const paymentStatusLabels = {
  unpaid: "Неплатена",
  partial: "Частично",
  paid: "Платена"
};

const orderStatusLabels = {
  pending: "Чакаща",
  confirmed: "Потвърдена",
  fulfilled: "Изпълнена",
  cancelled: "Отказана"
};

function createOrderItem(product = null, overrides = {}) {
  return {
    key: globalThis.crypto?.randomUUID?.() || `order-item-${Date.now()}-${Math.random()}`,
    product: product?._id || "",
    quantity: product ? "1" : "",
    unitPrice: product ? String(product.price ?? "") : "",
    ...overrides
  };
}

function normalizeOrderItems(items = []) {
  return items.map((item) =>
    createOrderItem(null, {
      product: item.product?._id || item.product || "",
      quantity: String(item.quantity ?? 1),
      unitPrice: String(item.unitPrice ?? item.product?.price ?? "")
    })
  );
}

function getCleanOrderItems(order) {
  return (order?.items || [])
    .map((item) => ({
      product: item.product,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0)
    }))
    .filter((item) => item.product && item.quantity > 0);
}

function getOrderTotal(order) {
  return getCleanOrderItems(order).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

function getCustomerDisplayName(customer) {
  if (!customer) return "На място";
  return customer.customerType === "company" ? customer.company || customer.fullName || "На място" : customer.fullName || customer.company || "На място";
}

function validateOrder(order) {
  if (!order?.store) return "Избери магазин.";
  const items = getCleanOrderItems(order);
  if (!items.length) return "Добави поне един продукт.";

  for (const [index, item] of items.entries()) {
    const row = index + 1;
    if (!item.product) return `Избери продукт на ред ${row}.`;
    if (Number(item.quantity || 0) <= 0) return `Количеството на ред ${row} трябва да е по-голямо от 0.`;
    if (Number(item.unitPrice || 0) < 0) return `Единичната цена на ред ${row} не може да е отрицателна.`;
  }

  if (getOrderTotal(order) <= 0) return "Крайната сума трябва да е по-голяма от 0.";
  return "";
}

function normalizeScanCode(value) {
  return String(value || "").replace(/[\r\n\t]/g, "").trim();
}

function findProductByScanCode(products, code) {
  const normalized = normalizeScanCode(code).toLowerCase();
  if (!normalized) return null;

  return products.find((product) =>
    [product.productNumber, product.barcode, product.sku]
      .filter(Boolean)
      .some((value) => String(value).trim().toLowerCase() === normalized)
  );
}

function getProductById(products, productId) {
  return products.find((product) => product._id === productId) || null;
}

function getInventoryForItem(inventory, productId, storeId) {
  return inventory.find((item) => item.product?._id === productId && item.store?._id === storeId);
}

function getProductOptionLabel(product) {
  if (!product) return "";
  return [product.name, product.sku, product.barcode].filter(Boolean).join(" | ");
}

function isOrderItemFilled(item) {
  return Boolean(item?.product || Number(item?.quantity || 0) > 0 || Number(item?.unitPrice || 0) > 0);
}

function withTrailingOrderRow(items) {
  const nextItems = items.length ? items : [createOrderItem()];
  const lastItem = nextItems[nextItems.length - 1];
  return isOrderItemFilled(lastItem) ? [...nextItems, createOrderItem()] : nextItems;
}

function OrderProductsCell({ items }) {
  const visibleItems = items || [];
  if (!visibleItems.length) return <Typography variant="body2" color="text.secondary">-</Typography>;

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
      {visibleItems.length > 3 ? (
        <Typography variant="caption" color="text.secondary" fontWeight={800}>
          + още {visibleItems.length - 3} продукта
        </Typography>
      ) : null}
    </Stack>
  );
}

function OrderItemsEditor({ value, products, inventory, store, onChange }) {
  const items = value?.length ? value : [createOrderItem()];

  function updateItem(key, patch) {
    onChange(withTrailingOrderRow(items.map((item) => (item.key === key ? { ...item, ...patch } : item))));
  }

  function removeItem(key) {
    const nextItems = items.filter((item) => item.key !== key);
    onChange(nextItems.length ? nextItems : [createOrderItem()]);
  }

  return (
    <Stack
      spacing={0.75}
      sx={{
        "& .MuiInputBase-root": { minHeight: 32 },
        "& .MuiInputBase-input": { py: 0.35, px: 0.75, fontSize: 13 },
        "& .MuiSelect-select": { py: 0.35, px: 0.75, fontSize: 13 }
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Typography variant="subtitle1" fontWeight={900}>
          Продукти в продажбата
        </Typography>
      </Stack>

      <Stack spacing={0.75}>
        <Box
          sx={{
            display: { xs: "none", md: "grid" },
            gridTemplateColumns: "28px minmax(150px, 1fr) 56px 82px 132px 96px 30px",
            gap: 0.5,
            px: 0.35,
            color: "text.secondary",
            fontSize: 12,
            fontWeight: 900
          }}
        >
          <Box>№</Box>
          <Box>Наименование</Box>
          <Box textAlign="right">Брой</Box>
          <Box textAlign="right">Ед. цена</Box>
          <Box textAlign="right">Общо</Box>
          <Box textAlign="right">Наличност</Box>
          <Box />
        </Box>
        {items.map((item, index) => {
          const selectedProduct = getProductById(products, item.product);
          const selectedInventory = getInventoryForItem(inventory, item.product, store);
          const quantity = Number(item.quantity || 0);
          const unitPrice = Number(item.unitPrice || 0);
          const hasLowStockRisk = selectedInventory && quantity > Number(selectedInventory.quantity || 0);

          return (
            <Box
              key={item.key}
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "28px minmax(150px, 1fr) 56px 82px 132px 96px 30px" },
                gap: 0.5,
                alignItems: "center",
                p: 0.35,
                border: "1px solid",
                borderColor: hasLowStockRisk ? "warning.main" : "divider",
                borderRadius: 1.25,
                bgcolor: hasLowStockRisk ? "rgba(183,138,77,0.08)" : "background.paper"
              }}
            >
              <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ display: { xs: "none", md: "block" } }}>
                {index + 1}
              </Typography>
              <Autocomplete
                size="small"
                options={products}
                getOptionLabel={getProductOptionLabel}
                value={selectedProduct}
                onChange={(_, product) => {
                  updateItem(item.key, {
                    product: product?._id || "",
                    quantity: item.quantity || "1",
                    unitPrice: String(product?.price ?? item.unitPrice ?? "")
                  });
                }}
                isOptionEqualToValue={(option, value) => option._id === value._id}
                noOptionsText="Няма продукт"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Продукт"
                    placeholder="Търси продукт"
                    size="small"
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      const code = String(e.currentTarget.value || "").trim();
                      if (!code) return;
                      const product = findProductByScanCode(products, code);
                      if (!product) return;
                      e.preventDefault();
                      updateItem(item.key, {
                        product: product._id,
                        quantity: item.quantity || "1",
                        unitPrice: String(product.price ?? item.unitPrice ?? "")
                      });
                    }}
                    onPaste={(e) => {
                      const pasted = (e.clipboardData || window.clipboardData).getData("text")?.trim();
                      const product = pasted && findProductByScanCode(products, pasted);
                      if (!product) return;
                      e.preventDefault();
                      updateItem(item.key, {
                        product: product._id,
                        quantity: item.quantity || "1",
                        unitPrice: String(product.price ?? item.unitPrice ?? "")
                      });
                    }}
                  />
                )}
              />
              <TextField
                size="small"
                aria-label="Брой"
                type="number"
                value={item.quantity}
                onChange={(event) => updateItem(item.key, { quantity: event.target.value })}
                inputProps={{ min: 1 }}
              />
              <TextField
                size="small"
                aria-label="Единична цена"
                type="number"
                value={item.unitPrice}
                onChange={(event) => updateItem(item.key, { unitPrice: event.target.value })}
                inputProps={{ min: 0 }}
              />
              <Box sx={{ minWidth: 0, textAlign: "right" }}>
                <Typography variant="body2" fontWeight={900} color="primary.main" noWrap>
                  {formatCurrencyEUR(quantity * unitPrice)}
                </Typography>
              </Box>
              <Box sx={{ minWidth: 0, textAlign: "right" }}>
                <Typography variant="body2" color={hasLowStockRisk || !selectedInventory ? "warning.main" : "text.primary"} fontWeight={900} noWrap>
                  {selectedInventory ? `${selectedInventory.quantity} бр.` : "-"}
                </Typography>
              </Box>
              <Tooltip title="Премахни продукт">
                <span>
                  <IconButton size="small" color="error" onClick={() => removeItem(item.key)} disabled={items.length === 1} aria-label="Премахни продукт">
                    <DeleteRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}

function OrderTotals({ order }) {
  const rows = getCleanOrderItems(order);
  const totalQuantity = rows.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalAmount = getOrderTotal(order);

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ p: 2, borderRadius: 2, bgcolor: "rgba(39,86,107,0.06)", border: "1px solid rgba(39,86,107,0.10)" }}>
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={800}>Редове</Typography>
        <Typography fontWeight={900}>{rows.length}</Typography>
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={800}>Общо бройки</Typography>
        <Typography fontWeight={900}>{totalQuantity} бр.</Typography>
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={800}>Общо</Typography>
        <Typography fontWeight={900} color="primary.main">{formatCurrencyEUR(totalAmount)}</Typography>
      </Box>
    </Stack>
  );
}

export default function OrdersPageStable() {
  const { user } = useAuth();
  const { data: orders, loading, setData } = useFetch("/orders");
  const { data: stores } = useFetch("/stores");
  const { data: customers } = useFetch("/customers");
  const { data: products } = useFetch("/products");
  const { data: inventory } = useFetch("/inventory/summary");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialOrder);
  const [scanCode, setScanCode] = useState("");
  const [editScanCode, setEditScanCode] = useState("");
  const [editingOrder, setEditingOrder] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [orderQuery, setOrderQuery] = useState("");
  const isMobile = useMobileDetection();
  const canSeeOrderAuthor = user?.role === "admin";

  const filteredOrders = useMemo(() => {
    const normalized = orderQuery.trim().toLowerCase();
    if (!normalized) return orders;

    return orders.filter((order) => {
      const productNames = (order.items || [])
        .map((item) => item.product?.name || item.product?.sku || item.product?.barcode || "")
        .join(" ");

      return [
        order.orderNumber,
        order.store?.name,
        order.customer?.fullName,
        order.customer?.company,
        order.customer?.vatNumber,
        order.status,
        order.paymentStatus,
        order.createdBy?.fullName,
        order.createdBy?.username,
        productNames
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [orders, orderQuery]);

  const orderColumns = useMemo(
    () => [
      { field: "orderNumber", headerName: "Продажба", flex: 0.75, minWidth: 115 },
      {
        field: "customer",
        headerName: "Клиент",
        flex: 0.9,
        minWidth: 135,
        valueGetter: (_, row) => getCustomerDisplayName(row.customer)
      },
      { field: "store", headerName: "Магазин", flex: 0.75, minWidth: 120, valueGetter: (_, row) => row.store?.name || "-" },
      ...(canSeeOrderAuthor
        ? [
            {
              field: "createdBy",
              headerName: "Служител",
              flex: 0.85,
              minWidth: 135,
              valueGetter: (_, row) => row.createdBy?.fullName || row.createdBy?.username || "-"
            }
          ]
        : []),
      {
        field: "products",
        headerName: "Продукти",
        flex: 2,
        minWidth: 300,
        sortable: false,
        renderCell: (params) => <OrderProductsCell items={params?.row?.items || []} />
      },
      {
        field: "paymentStatus",
        headerName: "Плащане",
        flex: 0.65,
        minWidth: 105,
        valueFormatter: (params) => paymentStatusLabels[params?.value ?? params] || "-"
      },
      {
        field: "totalAmount",
        headerName: "Общо",
        flex: 0.75,
        minWidth: 140,
        valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0)
      },
      {
        field: "actions",
        headerName: "",
        sortable: false,
        filterable: false,
        width: 150,
        align: "center",
        renderCell: (params) => <GridRowActions onPrint={() => printOrder(params.row)} onEdit={() => openEditDialog(params.row)} onDelete={() => setDeletingOrder(params.row)} />
      }
    ],
    [canSeeOrderAuthor]
  );

  function openCreateDialog() {
    setForm({ ...initialOrder, items: [createOrderItem()] });
    setScanCode("");
    setOpen(true);
  }

  function openEditDialog(order) {
    setEditingOrder({
      _id: order._id,
      orderNumber: order.orderNumber || "",
      store: order.store?._id || "",
      customer: order.customer?._id || "",
      items: withTrailingOrderRow(normalizeOrderItems(order.items)),
      status: order.status || "pending",
      paymentStatus: order.paymentStatus || "unpaid"
    });
    setEditScanCode("");
  }

  function buildOrderPayload(order, { includeOrderNumber = false } = {}) {
    const payload = {
      store: order.store,
      customer: order.customer || undefined,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: getOrderTotal(order),
      items: getCleanOrderItems(order)
    };

    if (includeOrderNumber) payload.orderNumber = order.orderNumber.trim();
    return payload;
  }

  async function handleCreate() {
    const validationMessage = validateOrder(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.post("/orders", buildOrderPayload(form));
      setData((current) => [response.data, ...current]);
      setForm(initialOrder);
      setOpen(false);
      toast.success("Продажбата е записана.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно записване на продажбата.");
    }
  }

  async function handleUpdate() {
    if (!editingOrder?._id) return;

    const validationMessage = validateOrder(editingOrder);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.put(`/orders/${editingOrder._id}`, buildOrderPayload(editingOrder, { includeOrderNumber: true }));
      setData((current) => current.map((item) => (item._id === editingOrder._id ? response.data : item)));
      setEditingOrder(null);
      toast.success("Продажбата е обновена.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешна редакция на продажба.");
    }
  }

  async function handleDelete() {
    if (!deletingOrder?._id) return;

    try {
      await api.delete(`/orders/${deletingOrder._id}`);
      setData((current) => current.filter((item) => item._id !== deletingOrder._id));
      setDeletingOrder(null);
      toast.success("Продажбата е изтрита.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно изтриване на продажба.");
    }
  }

  function applyScannedProduct(rawCode, setter, clearScan, activeDraft) {
    const code = normalizeScanCode(rawCode);
    if (!code) return;

    const product = findProductByScanCode(products, code);
    if (!product) {
      toast.error(`Няма продукт с баркод/SKU ${code}.`);
      return;
    }

    setter((current) => {
      const currentItems = (current.items || []).filter(isOrderItemFilled);
      const existingItem = currentItems.find((item) => item.product === product._id);

      if (existingItem) {
        return {
          ...current,
          items: withTrailingOrderRow(currentItems.map((item) =>
            item.key === existingItem.key ? { ...item, quantity: String(Number(item.quantity || 0) + 1), unitPrice: item.unitPrice || String(product.price ?? "") } : item
          ))
        };
      }

      return {
        ...current,
        items: withTrailingOrderRow([...currentItems, createOrderItem(product)])
      };
    });

    clearScan("");
    const alreadyInCart = activeDraft?.items?.some((item) => item.product === product._id);
    toast.success(alreadyInCart ? "Количество +1." : `Добавен продукт: ${product.name}`);
  }

  function handleScanKeyDown(event, setter, clearScan, activeDraft) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    applyScannedProduct(event.currentTarget.value, setter, clearScan, activeDraft);
  }

  function renderSharedOrderFields(order, setOrder, scanValue, setScanValue) {
    return (
      <Stack spacing={2.5}>
        <TextField
          fullWidth
          label="Сканирай баркод или SKU"
          value={scanValue}
          onChange={(event) => setScanValue(event.target.value)}
          onKeyDown={(event) => handleScanKeyDown(event, setOrder, setScanValue, order)}
          helperText="Сканирай продукт, за да го добавиш в продажбата. Повторно сканиране увеличава количеството."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <QrCodeScannerRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Button size="small" onClick={() => applyScannedProduct(scanValue, setOrder, setScanValue, order)}>
                  Добави
                </Button>
              </InputAdornment>
            )
          }}
        />
        <FormGrid min={230}>
          <TextField
            label="Номер на продажба"
            value={order.orderNumber}
            disabled={order.orderNumber === initialOrder.orderNumber}
            onChange={(event) => setOrder((current) => ({ ...current, orderNumber: event.target.value }))}
          />
          <TextField select label="Магазин" value={order.store} onChange={(event) => setOrder((current) => ({ ...current, store: event.target.value }))}>
            {stores.map((store) => (
              <MenuItem key={store._id} value={store._id}>
                {store.name} | {store.city}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Клиент" value={order.customer} onChange={(event) => setOrder((current) => ({ ...current, customer: event.target.value }))}>
            <MenuItem value="">Клиент на място</MenuItem>
            {customers.map((customer) => (
              <MenuItem key={customer._id} value={customer._id}>
                {getCustomerDisplayName(customer)}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Статус" value={order.status} onChange={(event) => setOrder((current) => ({ ...current, status: event.target.value }))}>
            {Object.entries(orderStatusLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Плащане" value={order.paymentStatus} onChange={(event) => setOrder((current) => ({ ...current, paymentStatus: event.target.value }))}>
            {Object.entries(paymentStatusLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        </FormGrid>
        <FormGridFull>
          <OrderItemsEditor value={order.items} products={products} inventory={inventory} store={order.store} onChange={(items) => setOrder((current) => ({ ...current, items }))} />
        </FormGridFull>
        <FormGridFull>
          <OrderTotals order={order} />
        </FormGridFull>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Продажби"
        title="Продажби и търговски поток"
        subtitle="Създавай продажби с един или повече продукти, сканиране и бързо премахване от кошницата."
        icon={<ReceiptLongRoundedIcon />}
      />

      <DataSection
        title="Регистър на продажбите"
        subtitle="Последни търговски операции"
        icon={<ReceiptLongRoundedIcon />}
        toolbar={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
            <TextField
              placeholder="Търси по номер, клиент, обект, служител или продукт"
              value={orderQuery}
              onChange={(event) => setOrderQuery(event.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
              sx={{ minWidth: 220, maxWidth: 420 }}
            />
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
                Показани: {filteredOrders.length} / {orders.length}
              </Typography>
            </Stack>
          </Stack>
        }
        actions={
          <Button variant="contained" startIcon={<AddShoppingCartRoundedIcon />} onClick={openCreateDialog}>
            Нова продажба
          </Button>
        }
      >
        <ResponsiveTable>
          <DataGrid loading={loading} getRowHeight={() => "auto"} columnHeaderHeight={44} rows={filteredOrders} getRowId={(row) => row._id} columns={orderColumns} disableRowSelectionOnClick />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="lg" fullScreen={isMobile}>
        <DialogTitle>Нова продажба</DialogTitle>
        <DialogContent dividers>{renderSharedOrderFields(form, setForm, scanCode, setScanCode)}</DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setOpen(false)} onConfirm={handleCreate} />
      </Dialog>

      <Dialog open={Boolean(editingOrder)} onClose={() => setEditingOrder(null)} fullWidth maxWidth="lg" fullScreen={isMobile}>
        <DialogTitle>Редактиране на продажба</DialogTitle>
        <DialogContent dividers>{editingOrder ? renderSharedOrderFields(editingOrder, setEditingOrder, editScanCode, setEditScanCode) : null}</DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setEditingOrder(null)} onConfirm={handleUpdate} />
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deletingOrder)}
        title="Изтриване на продажба"
        description={`Сигурен ли си, че искаш да изтриеш ${deletingOrder?.orderNumber || "тази продажба"}?`}
        onClose={() => setDeletingOrder(null)}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}
