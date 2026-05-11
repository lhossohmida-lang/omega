import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { subscribeToPendingOrders, acceptOrder } from '../services/orderService';
import { formatCurrency } from '../utils/formatCurrency';
import { timeAgo } from '../utils/formatDate';
import DriverNav from '../components/DriverNav';
import { IoLocation, IoCall, IoCheckmark, IoTime } from 'react-icons/io5';
import toast from 'react-hot-toast';

export default function DriverAvailableOrders() {
  const { userData } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);

  useEffect(() => {
    const unsub = subscribeToPendingOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAccept = async (orderId) => {
    setAccepting(orderId);
    try {
      await acceptOrder(orderId, {
        uid: userData.uid,
        name: userData.name,
        phone: userData.phone,
      });
      toast.success('تم قبول الطلب بنجاح!');
    } catch (error) {
      toast.error(error.message || 'لم يتم قبول الطلب');
    }
    setAccepting(null);
  };

  return (
    <div className="min-h-screen bg-omega-dark pb-safe">
      <div className="sticky top-0 z-30 glass">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">الطلبات المتاحة 🚗</h1>
          <span className="text-omega-orange text-sm font-bold">{orders.length}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-40 rounded-xl" />)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-white font-bold mb-2">لا توجد طلبات متاحة</h3>
            <p className="text-omega-text-muted text-sm">انتظر طلبات جديدة...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order, idx) => (
              <div key={order.id} className="glass rounded-2xl p-4 animate-slide-up border border-white/5 hover:border-omega-orange/20 transition-all"
                style={{ animationDelay: `${idx * 80}ms` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-bold">#{order.id?.slice(-6)}</span>
                  <span className="text-omega-text-muted text-xs flex items-center gap-1">
                    <IoTime size={12} /> {timeAgo(order.createdAt)}
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-omega-text-muted">👤</span>
                    <span className="text-white">{order.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <IoCall className="text-omega-text-muted" size={14} />
                    <span className="text-omega-text" dir="ltr">{order.customerPhone}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <IoLocation className="text-omega-text-muted mt-0.5" size={14} />
                    <span className="text-omega-text">{order.customerAddress}</span>
                  </div>
                </div>

                {/* المنتجات */}
                <div className="bg-omega-dark/30 rounded-xl p-3 mb-3">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs py-1">
                      <span className="text-omega-text-muted">×{item.quantity} {item.name}</span>
                      <span className="text-omega-text">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="border-t border-white/10 mt-2 pt-2 flex justify-between">
                    <span className="text-white font-bold text-sm">الإجمالي</span>
                    <span className="text-omega-orange font-bold text-sm">{formatCurrency(order.totalPrice)}</span>
                  </div>
                </div>

                {order.customerNote && (
                  <p className="text-omega-text-muted text-xs mb-3 bg-omega-dark/20 rounded-lg p-2">📝 {order.customerNote}</p>
                )}

                <button
                  onClick={() => handleAccept(order.id)}
                  disabled={accepting === order.id}
                  className="w-full py-3 rounded-xl bg-gradient-to-l from-omega-orange to-omega-orange-dark text-white font-bold hover:shadow-lg hover:shadow-omega-orange/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {accepting === order.id ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><IoCheckmark size={20} /> <span>قبول الطلب</span></>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <DriverNav />
    </div>
  );
}
