import { useState, useEffect } from 'react';
import { getAllOrders, updateOrderStatus } from '../services/orderService';
import { formatCurrency } from '../utils/formatCurrency';
import { timeAgo } from '../utils/formatDate';
import { calculateOrderProfit } from '../utils/calculateProfit';
import AdminNav from '../components/AdminNav';
import { IoFilter, IoEye, IoClose } from 'react-icons/io5';
import toast from 'react-hot-toast';

const statusConfig = {
  all: { label: 'الكل', color: 'bg-omega-gray' },
  pending: { label: 'معلقة', color: 'bg-yellow-500/15 text-yellow-500' },
  accepted_by_driver: { label: 'مقبولة', color: 'bg-blue-500/15 text-blue-500' },
  preparing: { label: 'تحضير', color: 'bg-orange-500/15 text-orange-500' },
  on_the_way: { label: 'في الطريق', color: 'bg-purple-500/15 text-purple-500' },
  delivered: { label: 'مكتملة', color: 'bg-green-500/15 text-green-500' },
  cancelled: { label: 'ملغية', color: 'bg-red-500/15 text-red-500' },
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    try { setOrders(await getAllOrders()); } catch (err) { console.error(err); }
    setLoading(false);
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success('تم تحديث الحالة');
      loadOrders();
      if (selected?.id === orderId) setSelected({ ...selected, status: newStatus });
    } catch (err) { toast.error('خطأ'); }
  };

  return (
    <div className="min-h-screen bg-omega-dark lg:flex">
      <AdminNav />
      <main className="flex-1 pb-safe">
        <div className="max-w-4xl mx-auto px-4 pt-16 lg:pt-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-black text-white">إدارة الطلبات</h1>
            <span className="text-omega-text-muted text-sm">{filteredOrders.length} طلب</span>
          </div>

          {/* الفلاتر */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
            {Object.entries(statusConfig).map(([key, val]) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  filter === key ? 'bg-omega-orange text-white' : 'bg-omega-gray/50 text-omega-text-muted hover:bg-omega-gray'
                }`}>{val.label}</button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order, idx) => {
                const status = statusConfig[order.status] || statusConfig.pending;
                const { profit } = calculateOrderProfit(order);
                return (
                  <div key={order.id} className="glass rounded-xl p-4 animate-fade-in cursor-pointer hover:border-omega-orange/20 border border-transparent transition-all"
                    style={{ animationDelay: `${idx * 30}ms` }}
                    onClick={() => setSelected(order)}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-bold text-sm">#{order.id?.slice(-6)}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg ${status.color}`}>{status.label}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-omega-text text-sm">{order.customerName}</p>
                        <p className="text-omega-text-muted text-xs">{timeAgo(order.createdAt)} • {order.items?.length} منتجات</p>
                      </div>
                      <div className="text-left">
                        <p className="text-omega-orange font-bold text-sm">{formatCurrency(order.totalPrice)}</p>
                        <p className="text-omega-success text-xs">ربح: {formatCurrency(profit)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* نافذة تفاصيل الطلب */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative glass rounded-t-2xl lg:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">تفاصيل الطلب #{selected.id?.slice(-6)}</h3>
              <button onClick={() => setSelected(null)} className="text-omega-text-muted hover:text-white"><IoClose size={22} /></button>
            </div>

            <div className="space-y-3">
              <div className="bg-omega-dark/30 rounded-xl p-3">
                <p className="text-omega-text-muted text-xs mb-1">الزبون</p>
                <p className="text-white text-sm">{selected.customerName}</p>
                <p className="text-omega-text-muted text-xs mt-1">{selected.customerPhone} • {selected.customerAddress}</p>
                {selected.customerNote && <p className="text-omega-text-muted text-xs mt-1">📝 {selected.customerNote}</p>}
              </div>

              {selected.driverName && (
                <div className="bg-omega-dark/30 rounded-xl p-3">
                  <p className="text-omega-text-muted text-xs mb-1">السائق</p>
                  <p className="text-white text-sm">🚗 {selected.driverName} • {selected.driverPhone}</p>
                </div>
              )}

              <div className="bg-omega-dark/30 rounded-xl p-3">
                <p className="text-omega-text-muted text-xs mb-2">المنتجات</p>
                {selected.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
                    <span className="text-white">×{item.quantity} {item.name}</span>
                    <span className="text-omega-orange">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t border-white/10 mt-2 pt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-white font-bold">الإجمالي</span>
                    <span className="text-omega-orange font-bold">{formatCurrency(selected.totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-omega-text-muted">التكلفة</span>
                    <span className="text-omega-text-muted">{formatCurrency(selected.totalCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-omega-success font-bold">الربح</span>
                    <span className="text-omega-success font-bold">{formatCurrency(calculateOrderProfit(selected).profit)}</span>
                  </div>
                </div>
              </div>

              {/* تغيير الحالة */}
              <div className="bg-omega-dark/30 rounded-xl p-3">
                <p className="text-omega-text-muted text-xs mb-2">تغيير الحالة</p>
                <div className="grid grid-cols-2 gap-2">
                  {['pending', 'preparing', 'on_the_way', 'delivered', 'cancelled'].map(s => (
                    <button key={s} onClick={() => handleStatusChange(selected.id, s)}
                      className={`py-2 rounded-lg text-xs font-medium transition-all ${
                        selected.status === s ? 'bg-omega-orange text-white' : 'bg-omega-gray/50 text-omega-text-muted hover:bg-omega-gray'
                      }`}>{statusConfig[s]?.label || s}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
