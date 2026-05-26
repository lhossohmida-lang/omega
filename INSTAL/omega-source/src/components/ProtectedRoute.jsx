import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

// حماية مسارات الإدارة والمطبخ فقط — الزبائن لا يحتاجون تسجيل دخول.
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, userData, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-omega-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-omega-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-omega-text-muted font-cairo">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-omega-dark flex items-center justify-center">
        <div className="text-center glass p-8 rounded-2xl max-w-sm mx-4">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-white font-bold mb-2">خطأ في تحميل البيانات</h3>
          <p className="text-omega-text-muted text-sm mb-6">
            لم نتمكن من جلب بيانات حسابك. تحقّق من إعدادات Firestore Rules أو تفعيل المصادقة في Firebase.
          </p>
          <button
            onClick={async () => {
              try {
                await logout();
                window.location.href = '/login';
              } catch (e) {
                console.error(e);
                window.location.href = '/login';
              }
            }}
            className="w-full py-3 rounded-xl bg-omega-orange text-white font-bold hover:bg-omega-orange-light transition-colors"
          >
            تسجيل الخروج والعودة
          </button>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(userData.role)) {
    if (userData.role === 'admin') return <Navigate to="/admin" replace />;
    if (userData.role === 'worker') return <Navigate to="/worker" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}
