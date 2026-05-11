import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getCustomerOrders } from '../services/orderService';
import { formatCurrency } from '../utils/formatCurrency';
import { timeAgo } from '../utils/formatDate';
import CustomerNav from '../components/CustomerNav';
import { IoReceipt, IoEye } from 'react-icons/io5';

const statusLabels = {
  pending: { label: 'قيد الانتظار', color: 'bg-yellow-500/15 text-yellow-500' },
  accepted_by_driver: { label: 'تم القبول', color: 'bg-blue-500/15 text-blue-500' },
  preparing: { label: 'يتم التحضير', color: 'bg-orange-500/15 text-orange-500' },
  on_the_way: { label: 'في الطريق', color: 'bg-purple-500/15 text-purple-500' },
  delivered: { label: 'تم التوصيل', color: 'bg-green-500/15 text-green-500' },
  cancelled: { label: 'ملغي', color: 'bg-red-500/15 text-red-500' },
};

export default function MyOrders() {
  const { userData } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (userData?.uid) loadOrders();
  }, [userData]);

  const loadOrders = async () => {
    try {
      const data = await getCustomerOrders(userData.uid);
      setOrders(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-omega-dark pb-safe">
      <div className="sticky top-0 z-30 glass">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <IoReceipt className="text-omega-orange" /> طلباتي
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-white font-bold mb-2">لا توجد طلبات</h3>
            <p className="text-omega-text-muted text-sm">ابدأ بطلب وجبتك الأولى!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order, idx) => {
              const status = statusLabels[order.status] || statusLabels.pending;
              return (
                <div key={order.id} className="glass rounded-xl p-4 animate-fade-in cursor-pointer hover:border-omega-orange/20 border border-transparent transition-all"
                  style={{ animationDelay: `${idx * 50}ms` }}
                  onClick={() => navigate(`/track/${order.id}`)}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-bold text-sm">#{order.id?.slice(-6)}</span>
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-lg ${status.color}`}>{status.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-omega-text-muted text-xs">{order.items?.length} منتجات • {timeAgo(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-omega-orange font-bold text-sm">{formatCurrency(order.totalPrice)}</span>
                      <IoEye className="text-omega-text-muted" size={16} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <CustomerNav />
    </div>
  );
}
