import { useAuth } from './useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

// Hook للتحقق من صلاحية المستخدم
export function useRole(requiredRole) {
  const { userData, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && userData) {
      if (userData.role !== requiredRole) {
        // إعادة توجيه حسب الدور
        if (userData.role === 'admin') navigate('/admin');
        else if (userData.role === 'driver') navigate('/driver');
        else navigate('/');
      }
    }
  }, [userData, loading, requiredRole, navigate]);

  return {
    hasAccess: userData?.role === requiredRole,
    loading,
  };
}
