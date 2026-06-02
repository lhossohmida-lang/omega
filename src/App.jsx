import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import IntroSplash from './components/IntroSplash';
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
import Kiosk from './pages/Kiosk';

// Worker
import WorkerOrders from './pages/WorkerOrders';

// Admin
import AdminDashboard from './pages/AdminDashboard';
import AdminOrders from './pages/AdminOrders';
import AdminProducts from './pages/AdminProducts';
import AdminInventory from './pages/AdminInventory';
import AdminAI from './pages/AdminAI';
import AdminReports from './pages/AdminReports';
import AdminAttendance from './pages/AdminAttendance';
import AdminHistory from './pages/AdminHistory';

import AppKeyboard from './components/AppKeyboard';
import { TapTransitionProvider } from './components/TapTransition';

// تحديد نوع الواجهة من المسار الحالي
function getScopeFromPath(pathname) {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/worker') || pathname === '/staff') return 'worker';
  if (pathname === '/login') return null; // لا سبلاش في تسجيل الدخول
  return 'customer';
}

// TapTransition يتولى الانتقال (1-2 ثانية) عند كل ضغطة nav
// IntroSplash يعرض الفيديو الافتتاحي (4 ثواني) عند أول فتح للتطبيق

export default function App() {
  const { userData, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [introDone, setIntroDone] = useState(false);

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

  // عرض الإنترو (4 ثواني) عند كل فتح للتطبيق قبل أي شيء
  if (!introDone) {
    return <IntroSplash onDone={() => setIntroDone(true)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-omega-dark flex items-center justify-center">
        <img src="/logo.png?v=2" alt="OMEGA" className="w-32 h-32 rounded-full object-cover" />
      </div>
    );
  }

  return (
    <TapTransitionProvider>
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
      <Route path="/kiosk" element={<Kiosk />} />

      {/* Worker Routes */}
      <Route path="/staff" element={<Navigate to="/worker" replace />} />
      <Route path="/worker" element={<ProtectedRoute allowedRoles={['worker']}><WorkerOrders /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><AdminOrders /></ProtectedRoute>} />
      <Route path="/admin/products" element={<ProtectedRoute allowedRoles={['admin']}><AdminProducts /></ProtectedRoute>} />
      <Route path="/admin/offers" element={<Navigate to="/admin/products" replace />} />
      <Route path="/admin/inventory" element={<ProtectedRoute allowedRoles={['admin']}><AdminInventory /></ProtectedRoute>} />
      <Route path="/admin/ai" element={<ProtectedRoute allowedRoles={['admin']}><AdminAI /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/attendance" element={<ProtectedRoute allowedRoles={['admin']}><AdminAttendance /></ProtectedRoute>} />
      <Route path="/admin/history" element={<ProtectedRoute allowedRoles={['admin']}><AdminHistory /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <AppKeyboard />
    </TapTransitionProvider>
  );
}
