 import { lazy, Suspense } from "react";
import { CircularProgress, Stack } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./providers/AuthProviderStable";

const CommandCenterShell = lazy(() => import("./components/CommandCenterShellClean"));

const LoginPage = lazy(() => import("./pages/LoginPage"));
const ExecutiveDashboardPage = lazy(() => import("./pages/ExecutiveDashboardPagePolished"));
const ProductsPage = lazy(() => import("./pages/ProductsPagePolished"));
const SuppliersPage = lazy(() => import("./pages/SuppliersPage"));
const CustomersPage = lazy(() => import("./pages/CustomersPageStable"));
const StoresPage = lazy(() => import("./pages/StoresPageStable"));
const SupplierOrdersPage = lazy(() => import("./pages/SupplierOrdersPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPageReady"));
const InventoryAuditsPage = lazy(() => import("./pages/InventoryAuditsPage"));
const InventoryMovementsPage = lazy(() => import("./pages/InventoryMovementsPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPageStable"));
const FinancePage = lazy(() => import("./pages/FinancePageStable"));
const EmployeesPage = lazy(() => import("./pages/EmployeesPageStable"));
const TransfersPage = lazy(() => import("./pages/TransfersPageStable"));
const InvoicesPage = lazy(() => import("./pages/InvoicesPageStable"));
const VatReportsPage = lazy(() => import("./pages/VatReportsPageClean"));

function AppLoader() {
  return (
    <Stack alignItems="center" justifyContent="center" minHeight="60vh">
      <CircularProgress />
    </Stack>
  );
}

function PrivateRoutes({ user }) {
  return (
    <Suspense fallback={<AppLoader />}>
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
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/finance" element={user?.role === "admin" ? <FinancePage /> : <Navigate to="/" replace />} />
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
    </Suspense>
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
    <Suspense fallback={<AppLoader />}>
      <Routes>
        {user ? (
          <Route path="/*" element={<PrivateRoutes user={user} />} />
        ) : (
          <Route path="*" element={<LoginPage />} />
        )}
      </Routes>
    </Suspense>
  );
}