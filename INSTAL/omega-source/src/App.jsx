import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import {
  getLaunchTargetFromSearch,
  getSavedLaunchPath,
  isStandaloneApp,
  saveInstallTarget,
} from './utils/installTarget';

// Auth
import Login from './pages/Login';

// Customer Pages (لا تتطلب تسجيل دخول)
import CustomerHome from './pages/CustomerHome';
import ProductDetails from './pages/ProductDetails';
import OfferDetails from './pages/OfferDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import TrackOrder from './pages/TrackOrder';
import MyOrders from './pages/MyOrders';
import Favorites from './pages/Favorites';
import MyInfo from './pages/MyInfo';
import PublicAttendance from './pages/PublicAttendance';

// Worker
import WorkerOrders from './pages/WorkerOrders';

// Admin
import AdminDashboard from './pages/AdminDashboard';
import AdminOrders from './pages/AdminOrders';
import AdminProducts from './pages/AdminProducts';
import AdminInventory from './pages/AdminInventory';
import AdminAI from './pages/AdminAI';
import AdminReports from './pages/AdminReports';
import AdminSpecialOffers from './pages/AdminSpecialOffers';
import AdminAttendance from './pages/AdminAttendance';

import AppKeyboard from './components/AppKeyboard';
import IntroSplash, { shouldShowIntro } from './components/IntroSplash';

// تحديد نوع الواجهة من المسار الحالي
function getScopeFromPath(pathname) {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/worker') || pathname === '/staff') return 'worker';
  if (pathname === '/login') return null; // لا سبلاش في تسجيل الدخول
  return 'customer';
}

function RouteIntro() {
  const location = useLocation();
  const [active, setActive] = useState(null);

  useEffect(() => {
    const scope = getScopeFromPath(location.pathname);
    if (scope && shouldShowIntro(scope)) {
      setActive(scope);
    }
  }, [location.pathname]);

  if (!active) return null;
  return <IntroSplash scope={active} onDone={() => setActive(null)} />;
}

export default function App() {
  const { userData, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const launchTarget = getLaunchTargetFromSearch(location.search);
    if (launchTarget) {
      saveInstallTarget(launchTarget);
    }

    if (!isStandaloneApp()) return;

    const targetPath = launchTarget ? getSavedLaunchPath() : getSavedLaunchPath();
    const isLaunchRoot = location.pathname === '/' || location.pathname === '/customer';
    if (isLaunchRoot && targetPath !== location.pathname) {
      navigate(targetPath, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-omega-dark flex items-center justify-center">
        <img src="/logo.png?v=2" alt="OMEGA" className="w-32 h-32 rounded-full object-cover" />
      </div>
    );
  }

  return (
    <>
      <Routes>
      {/* Login (للإدارة والمطبخ فقط) */}
      <Route
        path="/login"
        element={
          userData?.role === 'admin' ? <Navigate to="/admin" /> :
          userData?.role === 'worker' ? <Navigate to="/worker" /> :
          <Login />
        }
      />

      {/* Customer Routes — متاحة للجميع */}
      <Route path="/" element={<CustomerHome />} />
      <Route path="/customer" element={<Navigate to="/" replace />} />
      <Route path="/product/:id" element={<ProductDetails />} />
      <Route path="/offer/:id" element={<OfferDetails />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/track/:id" element={<TrackOrder />} />
      <Route path="/favorites" element={<Favorites />} />
      <Route path="/my-orders" element={<MyOrders />} />
      <Route path="/my-info" element={<MyInfo />} />
      <Route path="/attendance" element={<PublicAttendance />} />

      {/* Worker Routes */}
      <Route path="/staff" element={<Navigate to="/worker" replace />} />
      <Route path="/worker" element={<ProtectedRoute allowedRoles={['worker']}><WorkerOrders /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><AdminOrders /></ProtectedRoute>} />
      <Route path="/admin/products" element={<ProtectedRoute allowedRoles={['admin']}><AdminProducts /></ProtectedRoute>} />
      <Route path="/admin/offers" element={<ProtectedRoute allowedRoles={['admin']}><AdminSpecialOffers /></ProtectedRoute>} />
      <Route path="/admin/inventory" element={<ProtectedRoute allowedRoles={['admin']}><AdminInventory /></ProtectedRoute>} />
      <Route path="/admin/ai" element={<ProtectedRoute allowedRoles={['admin']}><AdminAI /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/attendance" element={<ProtectedRoute allowedRoles={['admin']}><AdminAttendance /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <AppKeyboard />
      <RouteIntro />
    </>
  );
}
