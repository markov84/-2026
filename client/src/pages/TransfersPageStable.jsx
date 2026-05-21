import { useMemo, useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  DialogContent,
  DialogTitle,
  Divider,
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
import { printTransfer } from "../lib/printDocuments";

let transferItemKey = 0;
const defaultTransferItemRows = 1;

function createTransferItemKey() {
  transferItemKey += 1;
  return globalThis.crypto?.randomUUID?.() || `transfer-item-${Date.now()}-${transferItemKey}`;
}

function createTransferItem(overrides = {}) {
  return {
    key: createTransferItemKey(),
    product: "",
    quantity: "",
    ...overrides
  };
}

function createTransferItems(count = defaultTransferItemRows) {
  return Array.from({ length: count }, () => createTransferItem());
}

function createInitialTransfer() {
  return {
    transferNumber: "Генерира се автоматично",
    fromStore: "",
    toStore: "",
    requestedBy: "",
    notes: "",
    status: "pending",
    items: createTransferItems()
  };
}

function normalizeTransferItems(items = []) {
  const normalizedItems = items.map((item) =>
    createTransferItem({
      product: item.product?._id || item.product || "",
      quantity: String(item.quantity ?? 1)
    })
  );

  return [...normalizedItems, ...createTransferItems(Math.max(0, defaultTransferItemRows - normalizedItems.length))];
}

function getCleanItems(transfer) {
  return (transfer?.items || [])
    .map((item) => ({
      product: item.product,
      quantity: Number(item.quantity || 0)
    }))
    .filter((item) => item.product && item.quantity > 0);
}

function validateTransfer(transfer) {
  if (!transfer?.requestedBy?.trim()) return "Полето „Заявил“ е задължително.";
  if (!transfer?.fromStore) return "Избери изходен магазин.";
  if (!transfer?.toStore) return "Избери целеви магазин.";
  if (transfer.fromStore === transfer.toStore) return "Изходният и целевият магазин трябва да са различни.";

  const items = transfer?.items || [];
  const filledItems = items.filter((item) => item.product || Number(item.quantity || 0) > 0);
  if (!filledItems.length) return "Добави поне един продукт за трансфер.";

  const selectedProducts = new Set();
  for (const [index, item] of items.entries()) {
    if (!item.product && Number(item.quantity || 0) <= 0) continue;

    const rowNumber = index + 1;
    if (!item.product) return `Избери продукт на ред ${rowNumber}.`;
    if (Number(item.quantity || 0) <= 0) return `Количеството на ред ${rowNumber} трябва да е по-голямо от 0.`;
    if (selectedProducts.has(item.product)) return "Един и същ продукт е добавен повече от веднъж. Обедини количествата в един ред.";
    selectedProducts.add(item.product);
  }

  return "";
}

function getProductOptionLabel(product) {
  if (!product) return "";
  return [product.name, product.sku, product.category, product.brand].filter(Boolean).join(" | ");
}

function getTransferItems(transfer) {
  return transfer?.items || [];
}

function getTransferUnitPrice(product) {
  return Number(product?.price || 0);
}

function getProductById(products, productId) {
  return products.find((product) => product._id === productId) || null;
}

function getTransferQuantity(transfer) {
  return getTransferItems(transfer)
    .filter((item) => item.product)
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function getTransferTotal(transfer) {
  return getTransferItems(transfer)
    .filter((item) => item.product)
    .reduce((sum, item) => sum + Number(item.quantity || 0) * getTransferUnitPrice(item.product), 0);
}

function getStoreName(stores, storeId) {
  const store = stores.find((item) => item._id === storeId);
  return store ? `${store.name} | ${store.city}` : "-";
}

function getInventoryForItem(inventory, productId, storeId) {
  return inventory.find((item) => item.product?._id === productId && item.store?._id === storeId);
}

function isTransferItemFilled(item) {
  return Boolean(item?.product || Number(item?.quantity || 0) > 0);
}

function withTrailingTransferRow(items) {
  const nextItems = items.length ? items : createTransferItems();
  const lastItem = nextItems[nextItems.length - 1];
  return isTransferItemFilled(lastItem) ? [...nextItems, createTransferItem()] : nextItems;
}

function buildTransferPayload(transfer) {
  return {
    fromStore: transfer.fromStore,
    toStore: transfer.toStore,
    requestedBy: transfer.requestedBy.trim(),
    notes: transfer.notes.trim() || undefined,
    status: transfer.status,
    items: getCleanItems(transfer)
  };
}

function renderProductInput(params, { label, placeholder = "Пиши име, SKU, категория или марка", product, onClear }) {
  return (
    <TextField
      {...params}
      size="small"
      label={label}
      placeholder={placeholder}
      InputProps={{
        ...params.InputProps,
        endAdornment: (
          <>
            {product ? (
              <IconButton
                aria-label="Премахни избрания продукт"
                size="small"
                edge="end"
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onClear();
                }}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            ) : null}
            {params.InputProps.endAdornment}
          </>
        )
      }}
    />
  );
}

function TransferProductsCell({ items }) {
  return (
    <Box
      sx={{
        width: "100%",
        py: 0.75,
        display: "grid",
        gridTemplateColumns: "minmax(220px, 1fr) 74px 108px 112px",
        gap: 0.75,
        alignItems: "center"
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={900}>Продукт</Typography>
      <Typography variant="caption" color="text.secondary" fontWeight={900} textAlign="right">Бр.</Typography>
      <Typography variant="caption" color="text.secondary" fontWeight={900} textAlign="right">Ед. цена</Typography>
      <Typography variant="caption" color="text.secondary" fontWeight={900} textAlign="right">Сума</Typography>
      {getTransferItems({ items }).map((item, index) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = getTransferUnitPrice(item.product);

        return (
          <Box key={`${item.product?._id || index}-${index}`} sx={{ display: "contents" }}>
            <Box sx={{ minWidth: 0 }}>
              <ProductIdentity compact product={item.product} />
            </Box>
            <Typography variant="body2" textAlign="right" fontWeight={800}>{quantity}</Typography>
            <Typography variant="body2" textAlign="right">{formatCurrencyEUR(unitPrice)}</Typography>
            <Typography variant="body2" textAlign="right" fontWeight={900}>{formatCurrencyEUR(quantity * unitPrice)}</Typography>
          </Box>
        );
      })}
    </Box>
  );
}

function TransferItemsEditor({ value, products, inventory, fromStore, onChange }) {
  const items = value?.length ? value : createTransferItems();

  function updateItem(key, patch) {
    onChange(withTrailingTransferRow(items.map((item) => (item.key === key ? { ...item, ...patch } : item))));
  }

  function removeItem(key) {
    const nextItems = items.filter((item) => item.key !== key);
    onChange(nextItems.length ? nextItems : createTransferItems());
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Typography variant="subtitle2" fontWeight={900}>
          Продукти за трансфер
        </Typography>
      </Stack>

      <TableContainer
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1.25,
          overflowX: "auto",
          bgcolor: "background.paper",
          "& .MuiTableCell-root": {
            px: 0.6,
            py: 0.35,
            borderColor: "rgba(39,86,107,0.10)"
          },
          "& .MuiTableCell-head": {
            py: 0.45,
            bgcolor: "rgba(39,86,107,0.04)",
            color: "text.secondary",
            fontSize: 12,
            lineHeight: 1.2
          },
          "& .MuiInputBase-root": {
            minHeight: 30
          },
          "& .MuiInputBase-input": {
            py: 0.35,
            px: 0.7,
            fontSize: 13
          }
        }}
      >
        <Table size="small" sx={{ minWidth: 700, tableLayout: "fixed" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 300, fontWeight: 900 }}>Продукт</TableCell>
              <TableCell align="right" sx={{ width: 76, fontWeight: 900 }}>Бройки</TableCell>
              <TableCell align="right" sx={{ width: 96, fontWeight: 900 }}>Ед. цена</TableCell>
              <TableCell align="right" sx={{ width: 96, fontWeight: 900 }}>Сума</TableCell>
              <TableCell align="right" sx={{ width: 86, fontWeight: 900 }}>Наличност</TableCell>
              <TableCell align="center" sx={{ width: 34, fontWeight: 900 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => {
              const selectedProduct = getProductById(products, item.product);
              const sourceInventory = getInventoryForItem(inventory, item.product, fromStore);
              const quantity = Number(item.quantity || 0);
              const unitPrice = getTransferUnitPrice(selectedProduct);
              const hasLowStockRisk = sourceInventory && quantity > Number(sourceInventory.quantity || 0);

              return (
                <TableRow key={item.key} sx={{ bgcolor: hasLowStockRisk ? "rgba(183,138,77,0.08)" : "inherit" }}>
                  <TableCell>
                    <Autocomplete
                      options={products}
                      value={selectedProduct}
                      onChange={(_, product) =>
                        updateItem(item.key, {
                          product: product?._id || "",
                          quantity: product ? item.quantity || "1" : ""
                        })
                      }
                      clearOnEscape
                      openOnFocus
                      autoHighlight
                      selectOnFocus
                      handleHomeEndKeys
                      getOptionLabel={getProductOptionLabel}
                      isOptionEqualToValue={(option, selectedValue) => option?._id === selectedValue?._id}
                      renderInput={(params) =>
                        renderProductInput(params, {
                          label: "",
                          placeholder: `Продукт ${index + 1}`,
                          product: selectedProduct,
                          onClear: () => updateItem(item.key, { product: "", quantity: "" })
                        })
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={item.quantity}
                      onChange={(event) => updateItem(item.key, { quantity: event.target.value })}
                      inputProps={{ min: 1 }}
                      sx={{ width: 62 }}
                      aria-label="Бройки"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={800} noWrap>
                      {selectedProduct ? formatCurrencyEUR(unitPrice) : "-"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={900} color="primary.main" noWrap>
                      {selectedProduct ? formatCurrencyEUR(quantity * unitPrice) : "-"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color={hasLowStockRisk || !sourceInventory ? "warning.main" : "text.primary"} fontWeight={800} noWrap>
                      {sourceInventory ? `${sourceInventory.quantity} бр.` : "-"}
                    </Typography>
                    {hasLowStockRisk ? (
                      <Typography variant="caption" color="warning.main" fontWeight={800} sx={{ display: "block", lineHeight: 1.1 }}>
                        над наличното
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Премахни ред">
                      <span>
                        <IconButton size="small" color="error" onClick={() => removeItem(item.key)} disabled={items.length === 1} aria-label="Премахни продукт">
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

function TransferTotals({ transfer, products, inventory, stores }) {
  const enrichedItems = getTransferItems(transfer)
    .filter((item) => item.product)
    .map((item) => ({
      ...item,
      productData: products.find((product) => product._id === item.product)
    }));
  const totalQuantity = enrichedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalAmount = enrichedItems.reduce((sum, item) => sum + Number(item.quantity || 0) * getTransferUnitPrice(item.productData), 0);
  const lowStockRows = enrichedItems.filter((item) => {
    const sourceInventory = getInventoryForItem(inventory, item.product, transfer.fromStore);
    return sourceInventory && Number(item.quantity || 0) > Number(sourceInventory.quantity || 0);
  }).length;

  return (
    <Stack
      spacing={1.5}
      sx={{
        p: 2,
        border: "1px solid",
        borderColor: lowStockRows ? "warning.main" : "divider",
        borderRadius: 2,
        bgcolor: lowStockRows ? "rgba(183,138,77,0.08)" : "background.paper"
      }}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={800}>Редове</Typography>
          <Typography variant="h6">{enrichedItems.length}</Typography>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={800}>Общо бройки</Typography>
          <Typography variant="h6">{totalQuantity || 0} бр.</Typography>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={800}>Обща стойност</Typography>
          <Typography variant="h6" color="primary.main">{formatCurrencyEUR(totalAmount)}</Typography>
        </Box>
      </Stack>

      <Divider />

      <Stack spacing={0.5}>
        {lowStockRows ? (
          <Typography variant="body2" color="warning.main" fontWeight={800}>
            {lowStockRows} реда са с количество над наличното в изходния магазин.
          </Typography>
        ) : null}
        <Typography variant="caption" color="text.secondary">
          {getStoreName(stores, transfer.fromStore)} {"->"} {getStoreName(stores, transfer.toStore)}
        </Typography>
      </Stack>
    </Stack>
  );
}

export default function TransfersPageStable() {
  const { data: transfers, loading, setData } = useFetch("/transfers");
  const { data: stores } = useFetch("/stores");
  const { data: products } = useFetch("/products");
  const { data: inventory } = useFetch("/inventory/summary");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => createInitialTransfer());
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [deletingTransfer, setDeletingTransfer] = useState(null);
  const isMobile = useMobileDetection();

  const rows = useMemo(() => transfers.map((transfer) => ({ ...transfer, totalQuantity: getTransferQuantity(transfer), totalAmount: getTransferTotal(transfer) })), [transfers]);

  async function handleCreate() {
    const validationMessage = validateTransfer(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.post("/transfers", buildTransferPayload(form));
      setData((current) => [response.data, ...current]);
      setForm(createInitialTransfer());
      setOpen(false);
      toast.success("Трансферът е създаден.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно създаване на трансфер.");
    }
  }

  function openEditDialog(transfer) {
    setEditingTransfer({
      _id: transfer._id,
      transferNumber: transfer.transferNumber || "",
      fromStore: transfer.fromStore?._id || "",
      toStore: transfer.toStore?._id || "",
      requestedBy: transfer.requestedBy || "",
      notes: transfer.notes || "",
      status: transfer.status || "pending",
      items: withTrailingTransferRow(normalizeTransferItems(transfer.items))
    });
  }

  async function handleUpdate() {
    if (!editingTransfer?._id) return;

    const validationMessage = validateTransfer(editingTransfer);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.put(`/transfers/${editingTransfer._id}`, {
        transferNumber: editingTransfer.transferNumber.trim(),
        ...buildTransferPayload(editingTransfer)
      });
      setData((current) => current.map((item) => (item._id === editingTransfer._id ? response.data : item)));
      setEditingTransfer(null);
      toast.success("Трансферът е обновен.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешна редакция на трансфер.");
    }
  }

  async function handleDelete() {
    if (!deletingTransfer?._id) return;

    try {
      await api.delete(`/transfers/${deletingTransfer._id}`);
      setData((current) => current.filter((item) => item._id !== deletingTransfer._id));
      setDeletingTransfer(null);
      toast.success("Трансферът е изтрит.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно изтриване на трансфер.");
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader eyebrow="Логистика" title="Трансфери между магазини" subtitle="Създавай, редактирай и изтривай трансфери с един или повече продукта." icon={<CompareArrowsRoundedIcon />} />

      <DataSection title="Регистър на трансферите" subtitle="Заявки за движение на стока между обекти" icon={<CompareArrowsRoundedIcon />} actions={<Button variant="contained" startIcon={<CompareArrowsRoundedIcon />} onClick={() => setOpen(true)}>Нов трансфер</Button>}>
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            getRowHeight={() => "auto"}
            columnHeaderHeight={44}
            rows={rows}
            getRowId={(row) => row._id}
            columns={[
              { field: "transferNumber", headerName: "Трансфер", flex: 0.75, minWidth: 120 },
              { field: "fromStore", headerName: "От", flex: 0.75, minWidth: 120, valueGetter: (_, row) => row.fromStore?.name || "-" },
              { field: "toStore", headerName: "Към", flex: 0.75, minWidth: 120, valueGetter: (_, row) => row.toStore?.name || "-" },
              { field: "products", headerName: "Продукти", flex: 2.8, minWidth: 560, sortable: false, renderCell: (params) => <TransferProductsCell items={params?.row?.items || []} /> },
              { field: "totalQuantity", headerName: "Бройки", flex: 0.5, minWidth: 90 },
              { field: "totalAmount", headerName: "Общо", flex: 0.7, minWidth: 125, valueFormatter: (params) => formatCurrencyEUR(params?.value ?? params ?? 0) },
              { field: "status", headerName: "Статус", flex: 0.65, minWidth: 105, renderCell: (params) => <Chip label={params?.value || "-"} size="small" color={params?.value === "completed" ? "success" : "warning"} /> },
              { field: "requestedBy", headerName: "Заявил", flex: 0.75, minWidth: 120 },
              { field: "actions", headerName: "", sortable: false, filterable: false, width: 150, align: "center", renderCell: (params) => <GridRowActions onPrint={() => printTransfer(params.row)} onEdit={() => openEditDialog(params.row)} onDelete={() => setDeletingTransfer(params.row)} /> }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>Нов трансфер</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <FormGrid min={230}>
              <TextField label="Номер на трансфер" value={form.transferNumber} disabled />
              <TextField label="Заявил" value={form.requestedBy} onChange={(e) => setForm({ ...form, requestedBy: e.target.value })} />
              <TextField select label="От магазин" value={form.fromStore} onChange={(e) => setForm({ ...form, fromStore: e.target.value })}>{stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}</TextField>
              <TextField select label="Към магазин" value={form.toStore} onChange={(e) => setForm({ ...form, toStore: e.target.value })}>{stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}</TextField>
            </FormGrid>
            <FormGridFull>
              <TransferItemsEditor value={form.items} products={products} inventory={inventory} fromStore={form.fromStore} onChange={(items) => setForm((current) => ({ ...current, items }))} />
            </FormGridFull>
            <FormGridFull>
              <TransferTotals transfer={form} products={products} inventory={inventory} stores={stores} />
            </FormGridFull>
            <FormGridFull>
              <TextField fullWidth multiline minRows={3} label="Бележки към трансфера" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </FormGridFull>
          </Stack>
        </DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setOpen(false)} onConfirm={handleCreate} />
      </Dialog>

      <Dialog open={Boolean(editingTransfer)} onClose={() => setEditingTransfer(null)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>Редактиране на трансфер</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <FormGrid min={230}>
              <TextField label="Номер на трансфер" value={editingTransfer?.transferNumber || ""} onChange={(e) => setEditingTransfer((current) => ({ ...current, transferNumber: e.target.value }))} />
              <TextField label="Заявил" value={editingTransfer?.requestedBy || ""} onChange={(e) => setEditingTransfer((current) => ({ ...current, requestedBy: e.target.value }))} />
              <TextField select label="От магазин" value={editingTransfer?.fromStore || ""} onChange={(e) => setEditingTransfer((current) => ({ ...current, fromStore: e.target.value }))}>{stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}</TextField>
              <TextField select label="Към магазин" value={editingTransfer?.toStore || ""} onChange={(e) => setEditingTransfer((current) => ({ ...current, toStore: e.target.value }))}>{stores.map((store) => <MenuItem key={store._id} value={store._id}>{store.name} | {store.city}</MenuItem>)}</TextField>
              <TextField select label="Статус" value={editingTransfer?.status || "pending"} onChange={(e) => setEditingTransfer((current) => ({ ...current, status: e.target.value }))}>
                <MenuItem value="draft">Чернова</MenuItem>
                <MenuItem value="pending">Чакащ</MenuItem>
                <MenuItem value="in_transit">В транспорт</MenuItem>
                <MenuItem value="completed">Завършен</MenuItem>
                <MenuItem value="cancelled">Отказан</MenuItem>
              </TextField>
            </FormGrid>
            <FormGridFull>
              <TransferItemsEditor
                value={editingTransfer?.items || []}
                products={products}
                inventory={inventory}
                fromStore={editingTransfer?.fromStore || ""}
                onChange={(items) => setEditingTransfer((current) => ({ ...current, items }))}
              />
            </FormGridFull>
            <FormGridFull>
              <TransferTotals transfer={editingTransfer || { items: [] }} products={products} inventory={inventory} stores={stores} />
            </FormGridFull>
            <FormGridFull>
              <TextField fullWidth multiline minRows={3} label="Бележки към трансфера" value={editingTransfer?.notes || ""} onChange={(e) => setEditingTransfer((current) => ({ ...current, notes: e.target.value }))} />
            </FormGridFull>
          </Stack>
        </DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setEditingTransfer(null)} onConfirm={handleUpdate} />
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deletingTransfer)}
        title="Изтриване на трансфер"
        description={`Сигурен ли си, че искаш да изтриеш ${deletingTransfer?.transferNumber || "този трансфер"}?`}
        onClose={() => setDeletingTransfer(null)}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}
