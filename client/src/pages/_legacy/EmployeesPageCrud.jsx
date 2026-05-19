import { useState } from "react";
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import DataSection from "../components/DataSection";
import { FormGrid } from "../components/FormGrid";
import FormPanel from "../components/FormPanel";
import GridRowActions from "../components/GridRowActions";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useMobileDetection } from "../hooks/useMobileDetection";
import api from "../lib/api";

const initialEmployee = { username: "", fullName: "", password: "", role: "sales", active: true };

export default function EmployeesPageCrud() {
  const { data, loading, setData } = useFetch("/employees");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialEmployee);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deletingEmployee, setDeletingEmployee] = useState(null);
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

  function openEditDialog(employee) {
    setEditingEmployee({
      id: employee._id || employee.id,
      username: employee.username || "",
      fullName: employee.fullName || "",
      password: "",
      role: employee.role || "sales",
      active: Boolean(employee.active)
    });
  }

  async function handleUpdate() {
    if (!editingEmployee?.id) return;

    try {
      const payload = {
        username: editingEmployee.username,
        fullName: editingEmployee.fullName,
        role: editingEmployee.role,
        active: editingEmployee.active
      };
      if (editingEmployee.password.trim()) payload.password = editingEmployee.password.trim();

      const response = await api.put(`/employees/${editingEmployee.id}`, payload);
      setData((current) => current.map((item) => ((item._id || item.id) === editingEmployee.id ? response.data : item)));
      setEditingEmployee(null);
      toast.success("Служителят е обновен.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешна редакция на служител.");
    }
  }

  async function handleDelete() {
    if (!deletingEmployee) return;
    const employeeId = deletingEmployee._id || deletingEmployee.id;

    try {
      await api.delete(`/employees/${employeeId}`);
      setData((current) => current.filter((item) => (item._id || item.id) !== employeeId));
      setDeletingEmployee(null);
      toast.success("Служителят е изтрит.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно изтриване на служител.");
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader eyebrow="Екип" title="Служители и роли" subtitle="Управлявай служители, роли и статус с редакция и триене от таблицата." />

      <FormPanel title="Създаване на служител" subtitle="Добави нов потребител в системата." actions={<Button variant="contained" onClick={() => setOpen(true)}>Нов служител</Button>} />

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
              { field: "active", headerName: "Статус", flex: 0.8, minWidth: 120, renderCell: (params) => <Chip label={params?.value ? "Активен" : "Изключен"} color={params?.value ? "success" : "default"} size="small" /> },
              {
                field: "actions",
                headerName: "",
                sortable: false,
                filterable: false,
                width: 110,
                align: "center",
                renderCell: (params) => (
                  <GridRowActions onEdit={() => openEditDialog(params.row)} onDelete={() => setDeletingEmployee(params.row)} />
                )
              }
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

      <Dialog open={Boolean(editingEmployee)} onClose={() => setEditingEmployee(null)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>Редактиране на служител</DialogTitle>
        <DialogContent dividers>
          <FormGrid min={240}>
            <TextField fullWidth label="Име и фамилия" value={editingEmployee?.fullName || ""} onChange={(e) => setEditingEmployee((current) => ({ ...current, fullName: e.target.value }))} />
            <TextField fullWidth label="Потребителско име" value={editingEmployee?.username || ""} onChange={(e) => setEditingEmployee((current) => ({ ...current, username: e.target.value }))} />
            <TextField fullWidth type="password" label="Нова парола" placeholder="Остави празно, ако няма промяна" value={editingEmployee?.password || ""} onChange={(e) => setEditingEmployee((current) => ({ ...current, password: e.target.value }))} />
            <TextField select fullWidth label="Роля" value={editingEmployee?.role || "sales"} onChange={(e) => setEditingEmployee((current) => ({ ...current, role: e.target.value }))}>
              <MenuItem value="admin">Админ</MenuItem>
              <MenuItem value="manager">Мениджър</MenuItem>
              <MenuItem value="sales">Продажби</MenuItem>
              <MenuItem value="warehouse">Склад</MenuItem>
            </TextField>
            <TextField select fullWidth label="Статус" value={editingEmployee?.active ? "true" : "false"} onChange={(e) => setEditingEmployee((current) => ({ ...current, active: e.target.value === "true" }))}>
              <MenuItem value="true">Активен</MenuItem>
              <MenuItem value="false">Изключен</MenuItem>
            </TextField>
          </FormGrid>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: "column", sm: "row" }, p: 2, gap: 1 }}>
          <Button fullWidth={isMobile} onClick={() => setEditingEmployee(null)}>Отказ</Button>
          <Button fullWidth={isMobile} variant="contained" onClick={handleUpdate}>Запази</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deletingEmployee)}
        title="Изтриване на служител"
        description={`Сигурен ли си, че искаш да изтриеш ${deletingEmployee?.fullName || "този служител"}?`}
        onClose={() => setDeletingEmployee(null)}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}
