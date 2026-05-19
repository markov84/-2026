import { lazy, Suspense } from "react";
import { CircularProgress, Stack } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./providers/AuthProviderStable";
import CommandCenterShell from "./components/CommandCenterShellClean";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const ExecutiveDashboardPage = lazy(() => import("./pages/ExecutiveDashboardPagePolished"));
const ProductsPage = lazy(() => import("./pages/ProductsPagePolished"));
const CustomersPage = lazy(() => import("./pages/CustomersPageStable"));
const StoresPage = lazy(() => import("./pages/StoresPageStable"));
const InventoryPage = lazy(() => import("./pages/InventoryPageReady"));
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
    <CommandCenterShell>
      <Suspense fallback={<AppLoader />}>
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
          <Route path="/employees" element={["admin", "manager"].includes(user?.role) ? <EmployeesPage /> : <Navigate to="/" replace />} />
          <Route path="/transfers" element={<TransfersPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
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
        <Route
          path="*"
          element={
            <Suspense fallback={<AppLoader />}>
              <LoginPage />
            </Suspense>
          }
        />
      )}
    </Routes>
  );
}
