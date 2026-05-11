import { useState, useEffect } from 'react';
import { getAllOrders, updateOrderStatus } from '../services/orderService';
import { formatCurrency } from '../utils/formatCurrency';
import { timeAgo } from '../utils/formatDate';
import { calculateOrderProfit } from '../utils/calculateProfit';
import AdminNav from '../components/AdminNav';
import {
  IoReceipt, IoClose, IoSearch, IoCall, IoLocation,
  IoPerson, IoCar, IoCheckmarkCircle, IoTime, IoFlash
} from 'react-icons/io5';
import toast from 'react-hot-toast';

const statusConfig = {
  all: { label: 'الكل', color: 'bg-white/5 text-omega-text border-white/10' },
  pending: { label: 'معلقة', color: 'bg-yellow-500/12 text-yellow-400 border-yellow-500/25', dot: 'bg-yellow-400' },
  accepted_by_driver: { label: 'مقبولة', color: 'bg-blue-500/12 text-blue-400 border-blue-500/25', dot: 'bg-blue-400' },
  preparing: { label: 'تحضير', color: 'bg-orange-500/12 text-orange-400 border-orange-500/25', dot: 'bg-orange-400' },
  on_the_way: { label: 'في الطريق', color: 'bg-purple-500/12 text-purple-400 border-purple-500/25', dot: 'bg-purple-400' },
  delivered: { label: 'مكتملة', color: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-400' },
  cancelled: { label: 'ملغية', color: 'bg-red-500/12 text-red-400 border-red-500/25', dot: 'bg-red-400' },
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    try { setOrders(await getAllOrders()); } catch (err) { console.error(err); }
    setLoading(false);
  };

  const filteredOrders = orders.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.customerName?.toLowerCase().includes(q) ||
             o.id?.toLowerCase().includes(q) ||
             o.customerPhone?.includes(q);
    }
    return true;
  });

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success('تم تحديث الحالة');
      loadOrders();
      if (selected?.id === orderId) setSelected({ ...selected, status: newStatus });
    } catch (err) { toast.error('خطأ'); }
  };

  // Counts per status
  const counts = Object.keys(statusConfig).reduce((acc, k) => {
    acc[k] = k === 'all' ? orders.length : orders.filter(o => o.status === k).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-omega-dark lg:flex">
      <AdminNav />
      <main className="flex-1 pb-safe">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-16 lg:pt-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="page-header-icon">
                <IoReceipt size={22} />
              </div>
              <div>
                <h1 className="page-title">إدارة الطلبات</h1>
                <p className="page-subtitle">{filteredOrders.length} طلب من أصل {orders.length}</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4 animate-fade-in">
            <IoSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-omega-text-dim" size={18} />
            <input
              type="text"
              placeholder="ابحث برقم الطلب أو اسم الزبون أو الهاتف..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-modern pr-11"
            />
          </div>

          {/* فلاتر */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-1 -mx-1 px-1">
            {Object.entries(statusConfig).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`chip ${filter === key ? 'chip-active' : ''}`}
              >
                <span>{val.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === key ? 'bg-white/25' : 'bg-white/10'}`}>
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-28" />)}</div>
          ) : filteredOrders.length === 0 ? (
            <div className="card-premium p-10 text-center">
              <IoReceipt className="text-omega-text-dim mx-auto mb-3" size={48} />
              <p className="text-omega-text-muted">لا توجد طلبات تطابق البحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 stagger">
              {filteredOrders.map((order) => {
                const status = statusConfig[order.status] || statusConfig.pending;
                const { profit } = calculateOrderProfit(order);
                return (
                  <div
                    key={order.id}
                    className="card-premium p-4 cursor-pointer"
                    onClick={() => setSelected(order)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-omega-orange/10 border border-omega-orange/20 flex items-center justify-center text-omega-orange font-black text-xs">
                          #{order.id?.slice(-4)}
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm leading-tight">{order.customerName}</p>
                          <p className="text-omega-text-dim text-[10px]">{timeAgo(order.createdAt)}</p>
                        </div>
                      </div>
                      <span className={`badge badge-dot ${status.color}`} style={{ borderWidth: '1px' }}>
                        {status.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex items-center gap-3 text-xs text-omega-text-muted">
                        <span className="flex items-center gap-1"><IoReceipt size={12} /> {order.items?.length || 0}</span>
                        {order.driverName && <span className="flex items-center gap-1"><IoCar size={12} /> سائق</span>}
                      </div>
                      <div className="text-left">
                        <p className="text-omega-orange font-black text-sm">{formatCurrency(order.totalPrice)}</p>
                        <p className="text-emerald-400 text-[10px]">+{formatCurrency(profit)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Order Details Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setSelected(null)} />
          <div className="relative card-premium rounded-t-3xl lg:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar p-6 animate-slide-up border border-white/10">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-white font-black text-lg">طلب #{selected.id?.slice(-6)}</h3>
                <p className="text-omega-text-muted text-xs mt-1">{timeAgo(selected.createdAt)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-omega-text-muted hover:text-white flex items-center justify-center transition-colors">
                <IoClose size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {/* العميل */}
              <div className="bg-white/3 border border-white/5 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <IoPerson className="text-omega-orange" size={16} />
                  <p className="text-white text-sm font-bold">معلومات الزبون</p>
                </div>
                <p className="text-white text-sm mb-1">{selected.customerName}</p>
                <div className="flex items-center gap-2 text-omega-text-muted text-xs mb-1">
                  <IoCall size={12} /> <span dir="ltr">{selected.customerPhone}</span>
                </div>
                <div className="flex items-start gap-2 text-omega-text-muted text-xs">
                  <IoLocation size={12} className="mt-0.5 flex-shrink-0" />
                  <span>{selected.customerAddress}</span>
                </div>
                {selected.customerNote && (
                  <div className="mt-2 pt-2 border-t border-white/5 text-omega-text-muted text-xs">
                    📝 {selected.customerNote}
                  </div>
                )}
              </div>

              {/* السائق */}
              {selected.driverName && (
                <div className="bg-white/3 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <IoCar className="text-omega-info" size={16} />
                    <p className="text-white text-sm font-bold">السائق</p>
                  </div>
                  <p className="text-white text-sm">{selected.driverName}</p>
                  <p className="text-omega-text-muted text-xs" dir="ltr">{selected.driverPhone}</p>
                </div>
              )}

              {/* المنتجات */}
              <div className="bg-white/3 border border-white/5 rounded-2xl p-4">
                <p className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                  <IoReceipt className="text-omega-orange" size={16} /> المنتجات
                </p>
                <div className="space-y-2 mb-3">
                  {selected.items?.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm py-1">
                      <span className="text-omega-text">
                        <span className="text-omega-orange font-bold ml-1">×{item.quantity}</span>
                        {item.name}
                      </span>
                      <span className="text-white font-medium">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/10 pt-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-omega-text-muted">التكلفة</span>
                    <span className="text-omega-text-muted">{formatCurrency(selected.totalCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-400 font-bold">الربح</span>
                    <span className="text-emerald-400 font-bold">{formatCurrency(calculateOrderProfit(selected).profit)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/5">
                    <span className="text-white font-black">الإجمالي</span>
                    <span className="gradient-text font-black text-base">{formatCurrency(selected.totalPrice)}</span>
                  </div>
                </div>
              </div>

              {/* تغيير الحالة */}
              <div className="bg-white/3 border border-white/5 rounded-2xl p-4">
                <p className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                  <IoFlash className="text-omega-warning" size={16} /> تغيير الحالة
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {['pending', 'preparing', 'on_the_way', 'delivered', 'cancelled'].map(s => {
                    const cfg = statusConfig[s];
                    const isActive = selected.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(selected.id, s)}
                        className={`py-2.5 rounded-xl text-xs font-bold border transition-all
                          ${isActive
                            ? cfg.color + ' border-2'
                            : 'bg-white/3 border-white/8 text-omega-text-muted hover:bg-white/5 hover:text-white'}`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
