import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';

// Auth
import Login from './pages/Login';

// Customer Pages (لا تتطلب تسجيل دخول)
import CustomerHome from './pages/CustomerHome';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import TrackOrder from './pages/TrackOrder';
import MyOrders from './pages/MyOrders';
import Favorites from './pages/Favorites';
import MyInfo from './pages/MyInfo';

// Worker
import WorkerOrders from './pages/WorkerOrders';

// Admin
import AdminDashboard from './pages/AdminDashboard';
import AdminOrders from './pages/AdminOrders';
import AdminProducts from './pages/AdminProducts';
import AdminInventory from './pages/AdminInventory';
import AdminAI from './pages/AdminAI';
import AdminReports from './pages/AdminReports';

export default function App() {
  const { userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-omega-dark flex items-center justify-center">
        <img src="/logo.png" alt="OMEGA" className="w-32 h-32 rounded-full object-cover" />
      </div>
    );
  }

  return (
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
      <Route path="/product/:id" element={<ProductDetails />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/track/:id" element={<TrackOrder />} />
      <Route path="/favorites" element={<Favorites />} />
      <Route path="/my-orders" element={<MyOrders />} />
      <Route path="/my-info" element={<MyInfo />} />

      {/* Worker Routes */}
      <Route path="/worker" element={<ProtectedRoute allowedRoles={['worker']}><WorkerOrders /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><AdminOrders /></ProtectedRoute>} />
      <Route path="/admin/products" element={<ProtectedRoute allowedRoles={['admin']}><AdminProducts /></ProtectedRoute>} />
      <Route path="/admin/inventory" element={<ProtectedRoute allowedRoles={['admin']}><AdminInventory /></ProtectedRoute>} />
      <Route path="/admin/ai" element={<ProtectedRoute allowedRoles={['admin']}><AdminAI /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
