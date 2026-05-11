import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getDriverOrders, updateOrderStatus } from '../services/orderService';
import { formatCurrency } from '../utils/formatCurrency';
import { timeAgo } from '../utils/formatDate';
import DriverNav from '../components/DriverNav';
import { IoCheckmarkDone, IoLocation, IoCall } from 'react-icons/io5';
import toast from 'react-hot-toast';

const statusLabels = {
  accepted_by_driver: { label: 'مقبول', color: 'bg-blue-500/15 text-blue-500', next: 'on_the_way', nextLabel: 'بدء التوصيل 🚗' },
  preparing: { label: 'يتم التحضير', color: 'bg-orange-500/15 text-orange-500', next: 'on_the_way', nextLabel: 'بدء التوصيل 🚗' },
  on_the_way: { label: 'في الطريق', color: 'bg-purple-500/15 text-purple-500', next: 'delivered', nextLabel: 'تم التوصيل ✅' },
  delivered: { label: 'تم التوصيل', color: 'bg-green-500/15 text-green-500', next: null, nextLabel: null },
};

export default function DriverMyOrders() {
  const { userData } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    if (userData?.uid) loadOrders();
  }, [userData]);

  const loadOrders = async () => {
    try {
      const data = await getDriverOrders(userData.uid);
      setOrders(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success(newStatus === 'delivered' ? 'تم التوصيل بنجاح! 🎉' : 'تم تحديث الحالة');
      loadOrders();
    } catch (err) {
      toast.error('خطأ في تحديث الحالة');
    }
    setUpdating(null);
  };

  return (
    <div className="min-h-screen bg-omega-dark pb-safe">
      <div className="sticky top-0 z-30 glass">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <IoCheckmarkDone className="text-omega-orange" /> طلباتي
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4">
        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-white font-bold mb-2">لا توجد طلبات</h3>
            <p className="text-omega-text-muted text-sm">اقبل طلبات من صفحة المتاحة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order, idx) => {
              const status = statusLabels[order.status] || {};
              return (
                <div key={order.id} className="glass rounded-2xl p-4 animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-bold">#{order.id?.slice(-6)}</span>
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-lg ${status.color || 'bg-omega-gray text-omega-text-muted'}`}>
                      {status.label || order.status}
                    </span>
                  </div>

                  <div className="space-y-1 mb-3 text-sm">
                    <p className="text-white">👤 {order.customerName}</p>
                    <p className="text-omega-text-muted flex items-center gap-1"><IoCall size={12} /> {order.customerPhone}</p>
                    <p className="text-omega-text-muted flex items-center gap-1"><IoLocation size={12} /> {order.customerAddress}</p>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-omega-text-muted text-xs">{order.items?.length} منتجات • {timeAgo(order.createdAt)}</span>
                    <span className="text-omega-orange font-bold">{formatCurrency(order.totalPrice)}</span>
                  </div>

                  {status.next && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, status.next)}
                      disabled={updating === order.id}
                      className="w-full py-3 rounded-xl bg-gradient-to-l from-omega-orange to-omega-orange-dark text-white font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {updating === order.id ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>{status.nextLabel}</span>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <DriverNav />
    </div>
  );
}
