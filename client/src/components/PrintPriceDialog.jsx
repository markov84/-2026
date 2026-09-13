import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography
} from "@mui/material";

export default function PrintPriceDialog({ open, value, onChange, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отказ</Button>
        <Button variant="contained" onClick={onConfirm}>Печат</Button>
      </DialogActions>
    </Dialog>
  );
}
