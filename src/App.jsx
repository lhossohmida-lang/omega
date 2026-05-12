import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Customer Pages
import CustomerHome from './pages/CustomerHome';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import TrackOrder from './pages/TrackOrder';
import MyOrders from './pages/MyOrders';
import Profile from './pages/Profile';

// Driver Pages
import DriverAvailableOrders from './pages/DriverAvailableOrders';
import DriverMyOrders from './pages/DriverMyOrders';
import DriverStats from './pages/DriverStats';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminOrders from './pages/AdminOrders';
import AdminProducts from './pages/AdminProducts';
import AdminInventory from './pages/AdminInventory';
import AdminDrivers from './pages/AdminDrivers';
import AdminAI from './pages/AdminAI';
import AdminReports from './pages/AdminReports';

export default function App() {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-omega-dark flex items-center justify-center">
        <img src="/logo.png" alt="OMEGA" className="w-32 h-32 rounded-full object-cover" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={user ? <Navigate to={userData?.role === 'admin' ? '/admin' : userData?.role === 'driver' ? '/driver' : '/'} /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />

      {/* Customer Routes */}
      <Route path="/" element={<ProtectedRoute allowedRoles={['customer']}><CustomerHome /></ProtectedRoute>} />
      <Route path="/product/:id" element={<ProtectedRoute allowedRoles={['customer']}><ProductDetails /></ProtectedRoute>} />
      <Route path="/cart" element={<ProtectedRoute allowedRoles={['customer']}><Cart /></ProtectedRoute>} />
      <Route path="/checkout" element={<ProtectedRoute allowedRoles={['customer']}><Checkout /></ProtectedRoute>} />
      <Route path="/track/:id" element={<ProtectedRoute allowedRoles={['customer']}><TrackOrder /></ProtectedRoute>} />
      <Route path="/my-orders" element={<ProtectedRoute allowedRoles={['customer']}><MyOrders /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute allowedRoles={['customer', 'driver', 'admin']}><Profile /></ProtectedRoute>} />

      {/* Driver Routes */}
      <Route path="/driver" element={<ProtectedRoute allowedRoles={['driver']}><DriverAvailableOrders /></ProtectedRoute>} />
      <Route path="/driver/my-orders" element={<ProtectedRoute allowedRoles={['driver']}><DriverMyOrders /></ProtectedRoute>} />
      <Route path="/driver/stats" element={<ProtectedRoute allowedRoles={['driver']}><DriverStats /></ProtectedRoute>} />
      <Route path="/driver/profile" element={<ProtectedRoute allowedRoles={['driver']}><Profile /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><AdminOrders /></ProtectedRoute>} />
      <Route path="/admin/products" element={<ProtectedRoute allowedRoles={['admin']}><AdminProducts /></ProtectedRoute>} />
      <Route path="/admin/inventory" element={<ProtectedRoute allowedRoles={['admin']}><AdminInventory /></ProtectedRoute>} />
      <Route path="/admin/drivers" element={<ProtectedRoute allowedRoles={['admin']}><AdminDrivers /></ProtectedRoute>} />
      <Route path="/admin/ai" element={<ProtectedRoute allowedRoles={['admin']}><AdminAI /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
