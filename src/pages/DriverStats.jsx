import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getDriverOrders } from '../services/orderService';
import { formatCurrency } from '../utils/formatCurrency';
import DriverNav from '../components/DriverNav';
import { IoStatsChart, IoCheckmarkCircle, IoTrendingUp } from 'react-icons/io5';

export default function DriverStats() {
  const { userData } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData?.uid) loadStats();
  }, [userData]);

  const loadStats = async () => {
    try {
      const data = await getDriverOrders(userData.uid);
      setOrders(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const delivered = orders.filter(o => o.status === 'delivered');
  const totalValue = delivered.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const todayDelivered = delivered.filter(o => {
    if (!o.deliveredAt) return false;
    const d = o.deliveredAt.toDate ? o.deliveredAt.toDate() : new Date(o.deliveredAt);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  });

  const stats = [
    { label: 'إجمالي التوصيلات', value: delivered.length, icon: IoCheckmarkCircle, color: 'text-omega-success' },
    { label: 'توصيلات اليوم', value: todayDelivered.length, icon: IoTrendingUp, color: 'text-omega-orange' },
    { label: 'إجمالي القيمة', value: formatCurrency(totalValue), icon: IoStatsChart, color: 'text-omega-info' },
    { label: 'طلبات نشطة', value: orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length, icon: IoStatsChart, color: 'text-yellow-500' },
  ];

  return (
    <div className="min-h-screen bg-omega-dark pb-safe">
      <div className="sticky top-0 z-30 glass">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <IoStatsChart className="text-omega-orange" /> إحصائياتي
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 animate-slide-up">
            {stats.map((stat, i) => (
              <div key={i} className="glass rounded-xl p-4 text-center">
                <stat.icon className={`${stat.color} mx-auto mb-2`} size={24} />
                <p className="text-white font-black text-xl">{stat.value}</p>
                <p className="text-omega-text-muted text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* آخر التوصيلات */}
        {delivered.length > 0 && (
          <div className="mt-6">
            <h3 className="text-white font-bold mb-3">آخر التوصيلات</h3>
            <div className="space-y-2">
              {delivered.slice(0, 10).map(order => (
                <div key={order.id} className="glass rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <p className="text-white text-sm">#{order.id?.slice(-6)} • {order.customerName}</p>
                    <p className="text-omega-text-muted text-xs">{order.items?.length} منتجات</p>
                  </div>
                  <span className="text-omega-orange font-bold text-sm">{formatCurrency(order.totalPrice)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <DriverNav />
    </div>
  );
}
