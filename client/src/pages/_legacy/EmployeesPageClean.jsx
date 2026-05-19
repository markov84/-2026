import { useState } from "react";
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid2 as Grid, MenuItem, Stack, TextField } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import api from "../lib/api";
import DataSection from "../components/DataSection";
import { FormGrid } from "../components/FormGrid";
import FormPanel from "../components/FormPanel";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";

const initialEmployee = { username: "", fullName: "", password: "", role: "sales" };

export default function EmployeesPageClean() {
  const { data, loading, setData } = useFetch("/employees");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialEmployee);
  const isMobile = useMobileDetection();

  async function handleCreate() {
    try {
      const response = await api.post("/employees", form);
      setData((current) => [response.data, ...current]);
      setForm(initialEmployee);
      setOpen(false);
      toast.success("Служителят е създаден.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно създаване на служител.");
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader eyebrow="Екип" title="Служители и роли за достъп" subtitle="Управлявай профили на служители, роли и оперативни права в системата." />
      <FormPanel title="Създаване на служител" subtitle="Добави нов служител с данни за вход и роля." actions={<Button variant="contained" onClick={() => setOpen(true)}>Нов служител</Button>} />
      <DataSection title="Служители" subtitle="Потребители, роли и статус">
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={data}
            getRowId={(row) => row._id || row.id}
            columns={[
              { field: "fullName", headerName: "Име", flex: 1.2, minWidth: 170 },
              { field: "username", headerName: "Потребител", flex: 0.9, minWidth: 140 },
              { field: "role", headerName: "Роля", flex: 0.8, minWidth: 120, renderCell: (params) => <Chip label={params?.value || "-"} size="small" /> },
              { field: "active", headerName: "Статус", flex: 0.8, minWidth: 120, renderCell: (params) => <Chip label={params?.value ? "Активен" : "Изключен"} color={params?.value ? "success" : "default"} size="small" /> }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>Нов служител</DialogTitle>
        <DialogContent dividers>
          <FormGrid min={240}>
            <TextField fullWidth label="Име и фамилия" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <TextField fullWidth label="Потребителско име" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <TextField fullWidth type="password" label="Парола" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <TextField select fullWidth label="Роля" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <MenuItem value="admin">Админ</MenuItem>
              <MenuItem value="manager">Мениджър</MenuItem>
              <MenuItem value="sales">Продажби</MenuItem>
              <MenuItem value="warehouse">Склад</MenuItem>
            </TextField>
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
