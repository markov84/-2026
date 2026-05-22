 import { CircularProgress, Stack } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./providers/AuthProviderStable";
import CommandCenterShell from "./components/CommandCenterShellClean";

import LoginPage from "./pages/LoginPage";
import ExecutiveDashboardPage from "./pages/ExecutiveDashboardPagePolished";
import ProductsPage from "./pages/ProductsPagePolished";
import CustomersPage from "./pages/CustomersPageStable";
import StoresPage from "./pages/StoresPageStable";
import InventoryPage from "./pages/InventoryPageReady";
import OrdersPage from "./pages/OrdersPageStable";
import FinancePage from "./pages/FinancePageStable";
import EmployeesPage from "./pages/EmployeesPageStable";
import TransfersPage from "./pages/TransfersPageStable";
import InvoicesPage from "./pages/InvoicesPageStable";
import VatReportsPage from "./pages/VatReportsPageClean";

function AppLoader() {
  return (
    <Stack alignItems="center" justifyContent="center" minHeight="60vh">
      <CircularProgress />
    </Stack>
  );
}

function PrivateRoutes({ user }) {
  return (
    <CommandCenterShell>
      <Routes>
        <Route path="/" element={<ExecutiveDashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/stores" element={<StoresPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/vat-reports" element={<VatReportsPage />} />
        <Route
          path="/employees"
          element={["admin", "manager"].includes(user?.role) ? <EmployeesPage /> : <Navigate to="/" replace />}
        />
        <Route path="/transfers" element={<TransfersPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CommandCenterShell>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" minHeight="100vh">
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Routes>
      {user ? (
        <Route path="/*" element={<PrivateRoutes user={user} />} />
      ) : (
        <Route path="*" element={<LoginPage />} />
      )}
    </Routes>
  );
}