import { CircularProgress, Stack } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./providers/AuthProviderStable";
import CommandCenterShell from "./components/CommandCenterShellClean";
import LoginPage from "./pages/LoginPage";
import ExecutiveDashboardPage from "./pages/ExecutiveDashboardPagePolished";
import ProductsPage from "./pages/ProductsPagePolished";
import SuppliersPage from "./pages/SuppliersPage";
import CustomersPage from "./pages/CustomersPageStable";
import StoresPage from "./pages/StoresPageStable";
import SupplierOrdersPage from "./pages/SupplierOrdersPage";
import InventoryPage from "./pages/InventoryPageReady";
import InventoryAuditsPage from "./pages/InventoryAuditsPage";
import InventoryMovementsPage from "./pages/InventoryMovementsPage";
import FinancePage from "./pages/FinancePageStable";
import EmployeesPage from "./pages/EmployeesPageStable";
import TransfersPage from "./pages/TransfersPageStable";
import OrdersPageStable from "./pages/OrdersPageStable";
import InvoicesPage from "./pages/InvoicesPageStable";
import VatReportsPage from "./pages/VatReportsPageClean";

function PrivateRoutes({ user }) {
  return (
    <CommandCenterShell>
      <Routes>
        <Route path="/" element={<ExecutiveDashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/suppliers" element={["admin", "manager", "warehouse"].includes(user?.role) ? <SuppliersPage /> : <Navigate to="/" replace />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/stores" element={<StoresPage />} />
        <Route path="/supplier-orders" element={["admin", "manager", "warehouse"].includes(user?.role) ? <SupplierOrdersPage /> : <Navigate to="/" replace />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route
          path="/inventory-movements"
          element={[
            "admin",
            "manager"
          ].includes(user?.role) ? <InventoryMovementsPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/inventory-audits"
          element={[
            "admin",
            "manager"
          ].includes(user?.role) ? <InventoryAuditsPage /> : <Navigate to="/" replace />}
        />
        <Route path="/finance" element={user?.role === "admin" ? <FinancePage /> : <Navigate to="/" replace />} />
        <Route path="/orders" element={<OrdersPageStable />} />
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