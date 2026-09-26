import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Topnav from './components/Topnav';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// App pages
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import StockPage from './pages/StockPage';
import ReceiptsPage from './pages/ReceiptsPage';
import DeliveriesPage from './pages/DeliveriesPage';
import TransfersPage from './pages/TransfersPage';
import AdjustmentsPage from './pages/AdjustmentsPage';
import OperationDetailPage from './pages/OperationDetailPage';
import MoveHistoryPage from './pages/MoveHistoryPage';
import WarehousesPage from './pages/settings/WarehousesPage';
import LocationsPage from './pages/settings/LocationsPage';
import ProfilePage from './pages/ProfilePage';

function AppLayout() {
  return (
    <div className="app-layout">
      <Topnav />
      <div className="main-content">
        <div className="page-container">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.875rem',
            },
            success: { iconTheme: { primary: 'var(--color-success)', secondary: 'transparent' } },
            error: { iconTheme: { primary: 'var(--color-error)', secondary: 'transparent' } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="receipts" element={<ReceiptsPage />} />
            <Route path="deliveries" element={<DeliveriesPage />} />
            <Route path="transfers" element={<TransfersPage />} />
            <Route path="adjustments" element={<AdjustmentsPage />} />
            <Route path="operations/new" element={<OperationDetailPage />} />
            <Route path="operations/:id" element={<OperationDetailPage />} />
            <Route path="move-history" element={<MoveHistoryPage />} />
            <Route path="settings/warehouses" element={<WarehousesPage />} />
            <Route path="settings/locations" element={<LocationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
