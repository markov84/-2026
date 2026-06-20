import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Paper,
  Tab,
  Tabs,
} from "@mui/material";
import toast from "react-hot-toast";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";
import BarcodeScannerDialog from "./BarcodeScannerDialog";
import { ProductIdentity } from "./ProductPresentation";
import { findProductByScanCode } from "../lib/scanCode";
import { formatCurrencyEUR } from "../lib/currency";
import { useMobileDetection } from "../hooks/useMobileDetection";
import { useNavigate } from "react-router-dom";

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`action-tabpanel-${index}`}
      aria-labelledby={`action-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

export default function ScanAndActionDialog({
  open,
  onClose,
  initialScannedCode = "",
  products = [],
  stores = [],
  inventory = [],
  customers = [],
  onAddToInventory,
  onAddToOrder,
  onRefresh,
  onOpenProductsPage,
}) {
  const navigate = useNavigate();
  const [scanCameraOpen, setScanCameraOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [actionTab, setActionTab] = useState(0);
  const [formData, setFormData] = useState({ store: "", quantity: "1" });
  const [orderFormData, setOrderFormData] = useState({
    store: "",
    customer: "",
    quantity: "1",
  });
  const [loading, setLoading] = useState(false);
  const [searchProductName, setSearchProductName] = useState("");
  const [manuallySelectedProduct, setManuallySelectedProduct] = useState(null);
  const scanInputRef = useRef(null);
  const isMobile = useMobileDetection();

  const scannedProduct = useMemo(
    () => findProductByScanCode(products, scannedCode),
    [products, scannedCode]
  );

  const filteredProducts = useMemo(() => {
    const query = (searchProductName || "").toLowerCase().trim();
    if (!query) return [];
    return products.filter((p) =>
      p.name.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query)
    );
  }, [products, searchProductName]);

  const displayProduct = scannedProduct || manuallySelectedProduct;

  useEffect(() => {
    if (!open) return;
    if (initialScannedCode) {
      setScannedCode(initialScannedCode);
    }
    const timer = window.setTimeout(() => {
      scanInputRef.current?.focus();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [open, initialScannedCode]);

  const productInventory = useMemo(() => {
    if (!displayProduct) return [];
    return inventory.filter((item) => item.product?._id === displayProduct._id);
  }, [displayProduct, inventory]);

  const totalStock = useMemo(
    () =>
      productInventory.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [productInventory]
  );

  const handleProductSelect = (product) => {
    setManuallySelectedProduct(product);
    setSearchProductName("");
  };

  const handleResetSearch = () => {
    setSearchProductName("");
    setManuallySelectedProduct(null);
    setScannedCode("");
  };

  const handleScanDetected = (code) => {
    setScannedCode(code);
    setScanCameraOpen(false);
    setTimeout(() => scanInputRef.current?.focus(), 100);
  };

  const handleAddToInventory = async () => {
    if (!displayProduct) {
      toast.error("Няма избран продукт");
      return;
    }
    if (!formData.store) {
      toast.error("Избери магазин");
      return;
    }
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      toast.error("Количеството трябва да е по-голямо от 0");
      return;
    }

    setLoading(true);
    try {
      await onAddToInventory?.({
        product: displayProduct._id,
        store: formData.store,
        quantity: Number(formData.quantity),
      });
      toast.success(
        `Добавихме ${formData.quantity} бр. ${displayProduct.name}`
      );
      resetForm();
    } catch (error) {
      toast.error(error?.message || "Грешка при добавяне");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToOrder = async () => {
    if (!displayProduct) {
      toast.error("Няма избран продукт");
      return;
    }
    if (!orderFormData.store) {
      toast.error("Избери магазин");
      return;
    }
    if (!orderFormData.quantity || Number(orderFormData.quantity) <= 0) {
      toast.error("Количеството трябва да е по-голямо от 0");
      return;
    }

    setLoading(true);
    try {
      await onAddToOrder?.({
        product: displayProduct._id,
        store: orderFormData.store,
        customer: orderFormData.customer || null,
        quantity: Number(orderFormData.quantity),
        unitPrice: displayProduct.price,
      });
      toast.success(
        `Добавихме ${orderFormData.quantity} бр. ${displayProduct.name} към поръчката`
      );
      resetForm();
    } catch (error) {
      toast.error(error?.message || "Грешка при добавяне към поръчката");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ store: "", quantity: "1" });
    setOrderFormData({ store: "", customer: "", quantity: "1" });
    setScannedCode("");
    setManuallySelectedProduct(null);
    setSearchProductName("");
    setActionTab(0);
    // Focus scanner for next scan
    setTimeout(() => scanInputRef.current?.focus(), 100);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: "600px",
          },
        }}
      >
        <DialogTitle>Сканиране и действие</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {/* Scan Input */}
            <TextField
              ref={scanInputRef}
              autoFocus
              label="Сканирай или въведи баркод"
              placeholder="Насочи камерата или въведи код"
              fullWidth
              value={scannedCode}
              onChange={(e) => setScannedCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (scannedCode.trim()) {
                    // Auto-proceed to add to inventory on enter
                    setActionTab(0);
                  }
                }
              }}
              InputProps={
                isMobile
                  ? {
                      endAdornment: (
                        <Button
                          size="small"
                          onClick={() => setScanCameraOpen(true)}
                          sx={{ textTransform: "none" }}
                        >
                          📷
                        </Button>
                      ),
                    }
                  : undefined
              }
            />

            {/* Product Info */}
            {displayProduct ? (
              <Paper elevation={0} sx={{ p: 2, bgcolor: "action.hover" }}>
                <Stack spacing={2}>
                  <Box>
                    <ProductIdentity product={displayProduct} />
                  </Box>

                  {/* Stock Display */}
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Наличности по магазини
                    </Typography>
                    {productInventory.length > 0 ? (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: "background.default" }}>
                              <TableCell>Магазин</TableCell>
                              <TableCell align="right">Количество</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {productInventory.map((item) => (
                              <TableRow key={item._id}>
                                <TableCell>{item.store?.name}</TableCell>
                                <TableCell align="right">
                                  <Chip
                                    label={item.quantity}
                                    color={
                                      item.isLowStock ? "error" : "success"
                                    }
                                    size="small"
                                    variant="outlined"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow sx={{ fontWeight: "bold" }}>
                              <TableCell>Общо</TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={totalStock}
                                  color="primary"
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Няма наличности
                      </Typography>
                    )}
                  </Box>

                  {/* Price Info */}
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary">
                        Цена
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrencyEUR(displayProduct.price)}
                      </Typography>
                    </Box>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary">
                        Себестойност
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrencyEUR(displayProduct.cost)}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Paper>
            ) : scannedCode ? (
              <Paper elevation={0} sx={{ p: 2, bgcolor: "error.50" }}>
                <Stack spacing={2}>
                  <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
                    ❌ Продукт "<strong>{scannedCode}</strong>" не намерен
                  </Typography>

                  {/* Search by name */}
                  <TextField
                    size="small"
                    label="Потърси по име или SKU"
                    placeholder="Напр. Кола Пепси..."
                    fullWidth
                    value={searchProductName}
                    onChange={(e) => setSearchProductName(e.target.value)}
                    autoFocus
                  />

                  {/* Product list */}
                  {filteredProducts.length > 0 ? (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                        Намерени продукти ({filteredProducts.length}):
                      </Typography>
                      <Stack spacing={1}>
                        {filteredProducts.slice(0, 5).map((p) => (
                          <Button
                            key={p._id}
                            variant="outlined"
                            onClick={() => handleProductSelect(p)}
                            sx={{
                              textAlign: "left",
                              justifyContent: "flex-start",
                              p: 1,
                              border: "1px solid #e0e0e0",
                            }}
                          >
                            <Stack spacing={0.5} alignItems="flex-start" width="100%">
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {p.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                SKU: {p.sku || "N/A"} | Цена: {formatCurrencyEUR(p.price)}
                              </Typography>
                            </Stack>
                          </Button>
                        ))}
                      </Stack>
                    </Box>
                  ) : searchProductName ? (
                    <Typography variant="body2" color="text.secondary">
                      Няма намерени продукти
                    </Typography>
                  ) : null}

                  {/* Action buttons */}
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        onClose();
                        if (onOpenProductsPage) {
                          onOpenProductsPage(scannedCode);
                        } else {
                          navigate("/products?newProductSku=" + encodeURIComponent(scannedCode));
                        }
                      }}
                      fullWidth
                      size="small"
                    >
                      ➕ Добави нов продукт
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleResetSearch}
                      color="inherit"
                      fullWidth
                      size="small"
                    >
                      Нов баркод
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ) : null}

            {/* Action Tabs */}
            {displayProduct && (
              <>
                <Tabs
                  value={actionTab}
                  onChange={(e, newValue) => setActionTab(newValue)}
                >
                  <Tab icon={<WarehouseRoundedIcon />} label="Инвентар" />
                  <Tab icon={<ShoppingCartRoundedIcon />} label="Продажба" />
                </Tabs>

                {/* Inventory Tab */}
                <TabPanel value={actionTab} index={0}>
                  <Stack spacing={2}>
                    <TextField
                      select
                      label="Магазин"
                      fullWidth
                      value={formData.store}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          store: e.target.value,
                        }))
                      }
                    >
                      {stores.map((store) => (
                        <MenuItem key={store._id} value={store._id}>
                          {store.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      type="number"
                      label="Количество"
                      fullWidth
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          quantity: e.target.value,
                        }))
                      }
                      inputProps={{ min: 1 }}
                    />
                  </Stack>
                </TabPanel>

                {/* Order Tab */}
                <TabPanel value={actionTab} index={1}>
                  <Stack spacing={2}>
                    <TextField
                      select
                      label="Магазин"
                      fullWidth
                      value={orderFormData.store}
                      onChange={(e) =>
                        setOrderFormData((prev) => ({
                          ...prev,
                          store: e.target.value,
                        }))
                      }
                    >
                      {stores.map((store) => (
                        <MenuItem key={store._id} value={store._id}>
                          {store.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      label="Клиент (опционално)"
                      fullWidth
                      value={orderFormData.customer}
                      onChange={(e) =>
                        setOrderFormData((prev) => ({
                          ...prev,
                          customer: e.target.value,
                        }))
                      }
                    >
                      <MenuItem value="">На място</MenuItem>
                      {customers.map((customer) => (
                        <MenuItem key={customer._id} value={customer._id}>
                          {customer.fullName || customer.company}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      type="number"
                      label="Количество"
                      fullWidth
                      value={orderFormData.quantity}
                      onChange={(e) =>
                        setOrderFormData((prev) => ({
                          ...prev,
                          quantity: e.target.value,
                        }))
                      }
                      inputProps={{ min: 1 }}
                    />
                  </Stack>
                </TabPanel>
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          {displayProduct && (
            <Button
              variant="contained"
              onClick={actionTab === 0 ? handleAddToInventory : handleAddToOrder}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} /> : null}
            >
              {actionTab === 0 ? "Добави към инвентара" : "Добави към поръчката"}
            </Button>
          )}
          <Button onClick={onClose} color="inherit">
            Затвори
          </Button>
        </DialogActions>
      </Dialog>

      <BarcodeScannerDialog
        open={scanCameraOpen}
        onClose={() => setScanCameraOpen(false)}
        onDetected={handleScanDetected}
        title="Сканирай баркод или QR код"
      />
    </>
  );
}
