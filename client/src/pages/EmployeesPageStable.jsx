import { useMemo, useState } from "react";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Button, Chip, DialogContent, DialogTitle, IconButton, InputAdornment, MenuItem, Stack, TextField } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import DataSection from "../components/DataSection";
import Dialog from "../components/DraggableDialog";
import DialogFooterActions from "../components/DialogFooterActions";
import { FormGrid } from "../components/FormGrid";
import FormPanel from "../components/FormPanel";
import GridRowActions from "../components/GridRowActions";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";
import { useBarcodeKeyboardScan } from "../hooks/useBarcodeKeyboardScan";
import { useMobileDetection } from "../hooks/useMobileDetection";
import { useAuth } from "../providers/AuthProviderStable";
import api from "../lib/api";

const initialEmployee = { username: "", fullName: "", password: "", role: "sales", active: true };

function validateEmployee(employee, isEdit = false) {
  if (!employee?.fullName?.trim()) return "Името на служителя е задължително.";
  if (!employee?.username?.trim()) return "Потребителското име е задължително.";
  if (!isEdit && !employee?.password?.trim()) return "Паролата е задължителна при създаване.";
  return "";
}

export default function EmployeesPageStable() {
  const { user } = useAuth();
  const { data, loading, setData } = useFetch("/employees");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialEmployee);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deletingEmployee, setDeletingEmployee] = useState(null);
  const isMobile = useMobileDetection();
  const canManageEmployees = user?.role === "admin";

  async function handleCreate() {
    const validationMessage = validateEmployee(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const response = await api.post("/employees", {
        ...form,
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        password: form.password.trim()
      });
      setData((current) => [response.data, ...current]);
      setForm(initialEmployee);
      setShowCreatePassword(false);
      setOpen(false);
      toast.success("Служителят е създаден.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Неуспешно създаване на служител.");
    }
  }

  function openEditDialog(employee) {
    setShowEditPassword(false);
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

    const validationMessage = validateEmployee(editingEmployee, true);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const payload = {
        username: editingEmployee.username.trim(),
        fullName: editingEmployee.fullName.trim(),
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

  const filteredEmployees = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return data;
    return data.filter((employee) =>
      [employee.fullName, employee.username]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [data, query]);

  useBarcodeKeyboardScan((code) => setQuery(code));

  const columns = [
    { field: "fullName", headerName: "Име", flex: 1.2, minWidth: 170 },
    { field: "username", headerName: "Потребител", flex: 0.9, minWidth: 140 },
    { field: "createdAt", headerName: "Дата създаване", flex: 0.85, minWidth: 130, valueFormatter: (params) => formatDate(params?.value ?? params) },
    { field: "role", headerName: "Роля", flex: 0.8, minWidth: 120, renderCell: (params) => <Chip label={params?.value || "-"} size="small" /> },
    { field: "active", headerName: "Статус", flex: 0.8, minWidth: 120, renderCell: (params) => <Chip label={params?.value ? "Активен" : "Изключен"} color={params?.value ? "success" : "default"} size="small" /> }
  ];

  if (canManageEmployees) {
    columns.push({
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 110,
      align: "center",
      renderCell: (params) => <GridRowActions onEdit={() => openEditDialog(params.row)} onDelete={() => setDeletingEmployee(params.row)} />
    });
  }

  return (
    <Stack spacing={3}>
      <PageHeader eyebrow="Екип" title="Служители и роли" subtitle="Управлявай служители, роли и статус с подреден работен екран." icon={<BadgeRoundedIcon />} />

      {canManageEmployees ? (
        <FormPanel title="Създаване на служител" subtitle="Добави нов потребител в системата." icon={<PersonAddRoundedIcon />} actions={<Button variant="contained" startIcon={<PersonAddRoundedIcon />} onClick={() => setOpen(true)}>Нов служител</Button>} />
      ) : null}

      <DataSection
        title="Служители"
        subtitle={canManageEmployees ? "Потребители, роли и статус." : "Преглед на потребителите и ролите. Промените са ограничени само за админ."}
        icon={<BadgeRoundedIcon />}
        toolbar={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
            <TextField
              placeholder="Търси по име или потребителско име"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              size="small"
              sx={{ minWidth: 220, maxWidth: 320 }}
            />
            <Chip label={`Показани: ${filteredEmployees.length}`} variant="outlined" />
            <Chip label={`Служители: ${data.length}`} color="secondary" variant="outlined" />
          </Stack>
        }
      >
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={filteredEmployees}
            getRowId={(row) => row._id || row.id}
            columns={columns}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>

      <Dialog open={canManageEmployees && open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>Нов служител</DialogTitle>
        <DialogContent dividers>
          <FormGrid min={240}>
            <TextField fullWidth label="Име и фамилия" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <TextField fullWidth label="Потребителско име" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <TextField
              fullWidth
              type={showCreatePassword ? "text" : "password"}
              label="Парола"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showCreatePassword ? "Скрий паролата" : "Покажи паролата"}
                      edge="end"
                      onClick={() => setShowCreatePassword((current) => !current)}
                      onMouseDown={(event) => event.preventDefault()}
                    >
                      {showCreatePassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField select fullWidth label="Роля" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <MenuItem value="admin">Админ</MenuItem>
              <MenuItem value="manager">Мениджър</MenuItem>
              <MenuItem value="sales">Продажби</MenuItem>
              <MenuItem value="warehouse">Склад</MenuItem>
            </TextField>
          </FormGrid>
        </DialogContent>
        <DialogFooterActions isMobile={isMobile} onCancel={() => setOpen(false)} onConfirm={handleCreate} />
      </Dialog>

      <Dialog open={canManageEmployees && Boolean(editingEmployee)} onClose={() => setEditingEmployee(null)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>Редактиране на служител</DialogTitle>
        <DialogContent dividers>
          <FormGrid min={240}>
            <TextField fullWidth label="Име и фамилия" value={editingEmployee?.fullName || ""} onChange={(e) => setEditingEmployee((current) => ({ ...current, fullName: e.target.value }))} />
            <TextField fullWidth label="Потребителско име" value={editingEmployee?.username || ""} onChange={(e) => setEditingEmployee((current) => ({ ...current, username: e.target.value }))} />
            <TextField
              fullWidth
              type={showEditPassword ? "text" : "password"}
              label="Нова парола"
              placeholder="Остави празно, ако няма промяна"
              value={editingEmployee?.password || ""}
              onChange={(e) => setEditingEmployee((current) => ({ ...current, password: e.target.value }))}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showEditPassword ? "Скрий паролата" : "Покажи паролата"}
                      edge="end"
                      onClick={() => setShowEditPassword((current) => !current)}
                      onMouseDown={(event) => event.preventDefault()}
                    >
                      {showEditPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
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
        <DialogFooterActions isMobile={isMobile} onCancel={() => setEditingEmployee(null)} onConfirm={handleUpdate} />
      </Dialog>

      <ConfirmDeleteDialog
        open={canManageEmployees && Boolean(deletingEmployee)}
        title="Изтриване на служител"
        description={`Сигурен ли си, че искаш да изтриеш ${deletingEmployee?.fullName || "този служител"}?`}
        onClose={() => setDeletingEmployee(null)}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}
