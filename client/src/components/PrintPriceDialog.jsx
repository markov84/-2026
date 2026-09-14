import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";

export default function PrintPriceDialog({
  open,
  value,
  onChange,
  onClose,
  onConfirm,
  items = [],
  getItemName = (item) => item?.product?.name || item?.name || "-",
  getQuantity = (item) => item?.quantity ?? 0,
  getRetailPrice = (item) => item?.unitPrice ?? item?.unitCost ?? item?.product?.price ?? 0,
  getWholesalePrice = (item) => item?.wholesalePrice ?? item?.product?.wholesalePrice ?? getRetailPrice(item)
}) {
  const previewItems = Array.isArray(items) ? items : [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Избери цена за печат</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Изборът важи само за отпечатания документ и няма да промени продажбата.
        </Typography>
        <FormControl>
          <RadioGroup value={value} onChange={(event) => onChange(event.target.value)}>
            <FormControlLabel value="retail" control={<Radio />} label="Продажна цена" />
            <FormControlLabel value="wholesale" control={<Radio />} label="Цена на едро" />
          </RadioGroup>
        </FormControl>
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
          Преглед на цените преди печат
        </Typography>
        <Paper variant="outlined" sx={{ overflowX: "auto" }}>
          <Table size="small" aria-label="Преглед на цените за печат">
            <TableHead>
              <TableRow>
                <TableCell>Продукт</TableCell>
                <TableCell align="right">Кол.</TableCell>
                <TableCell align="right">{value === "wholesale" ? "Цена на едро" : "Продажна цена"}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {previewItems.length ? previewItems.map((item, index) => {
                const price = value === "wholesale" ? getWholesalePrice(item) : getRetailPrice(item);
                return (
                  <TableRow key={item?._id || item?.product?._id || index}>
                    <TableCell>{getItemName(item)}</TableCell>
                    <TableCell align="right">{getQuantity(item)}</TableCell>
                    <TableCell align="right">{Number(price || 0).toFixed(2)} EUR</TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={3}>Няма редове за преглед.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отказ</Button>
        <Button variant="contained" onClick={onConfirm}>Печат</Button>
      </DialogActions>
    </Dialog>
  );
}
