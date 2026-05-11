import { useState, useEffect } from 'react';
import { getAllOrders, updateOrderStatus } from '../services/orderService';
import { formatCurrency } from '../utils/formatCurrency';
import { timeAgo } from '../utils/formatDate';
import { calculateOrderProfit } from '../utils/calculateProfit';
import AdminNav from '../components/AdminNav';
import {
  IoSearch, IoClose, IoCall, IoLocation, IoPerson,
  IoCar, IoReceipt, IoFlash, IoEye,
} from 'react-icons/io5';
import toast from 'react-hot-toast';

const STATUS = {
  all:                { label: 'الكل',       color: '#8e8e93', bg: 'rgba(142,142,147,0.12)' },
  pending:            { label: 'معلقة',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  accepted_by_driver: { label: 'مقبولة',    color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  preparing:          { label: 'تحضير',      color: '#ff6b00', bg: 'rgba(255,107,0,0.12)'   },
  on_the_way:         { label: 'في الطريق', color: '#a855f7', bg: 'rgba(168,85,247,0.12)'  },
  delivered:          { label: 'مكتملة',     color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  cancelled:          { label: 'ملغية',      color: '#e53935', bg: 'rgba(229,57,53,0.12)'   },
};

export default function AdminOrders() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    try { setOrders(await getAllOrders()); } catch (err) { console.error(err); }
    setLoading(false);
  };

  const filtered = orders.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.customerName?.toLowerCase().includes(q)
          || o.id?.toLowerCase().includes(q)
          || o.customerPhone?.includes(q);
    }
    return true;
  });

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success('تم تحديث الحالة');
      loadOrders();
      if (selected?.id === orderId) setSelected(s => ({ ...s, status: newStatus }));
    } catch { toast.error('خطأ'); }
  };

  const isToday = o => {
    const d = o.createdAt?.toDate?.() || new Date((o.createdAt?.seconds || 0) * 1000);
    return d.toDateString() === new Date().toDateString();
  };

  const quickStats = [
    { label: 'تم التسليم',    value: orders.filter(o => o.status === 'delivered').length,  color: '#22c55e' },
    { label: 'قيد التحضير',  value: orders.filter(o => o.status === 'preparing').length,  color: '#ff6b00' },
    { label: 'في الطريق',    value: orders.filter(o => o.status === 'on_the_way').length, color: '#a855f7' },
    { label: 'الطلبات اليوم', value: orders.filter(isToday).length,                       color: '#3b82f6' },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#0a0a0a' }}>
      <AdminNav />

      <div className="px-4 pt-28 pb-4">
        <h1 className="text-white font-black text-3xl tracking-tight mb-0.5">الطلبات</h1>
        <p className="text-omega-text-muted text-sm mb-5">إدارة طلبات مطعم OMEGA</p>

        {/* Search */}
        <div className="relative mb-4">
          <IoSearch className="absolute top-1/2 -translate-y-1/2 text-omega-text-dim" size={17} style={{ right: '14px' }} />
          <input
            type="text"
            placeholder="ابحث عن الطلبات أو فلتر حسب الحالة"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-sm rounded-2xl border pr-11 pl-4 py-3.5 text-white placeholder-omega-text-dim outline-none"
            style={{ backgroundColor: '#15161a', borderColor: 'rgba(255,255,255,0.07)' }}
          />
        </div>

        {/* Status filter chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-1">
          {Object.entries(STATUS).map(([key, val]) => {
            const count = key === 'all' ? orders.length : orders.filter(o => o.status === key).length;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border"
                style={filter === key
                  ? { backgroundColor: val.bg, color: val.color, borderColor: val.color + '40' }
                  : { backgroundColor: 'rgba(255,255,255,0.04)', color: '#5a5a60', borderColor: 'rgba(255,255,255,0.07)' }
                }
              >
                {val.label}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: filter === key ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.07)' }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {quickStats.map((s, i) => (
            <div key={i} className="px-2 py-3 rounded-2xl text-center" style={{ backgroundColor: '#15161a', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="font-black text-lg leading-tight" style={{ color: s.color }}>{s.value}</p>
              <p className="text-omega-text-dim text-[9px] leading-tight mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* List header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-omega-text-muted text-xs">{filtered.length} طلب</p>
          <p className="text-white font-bold text-sm">أحدث الطلبات</p>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 rounded-3xl skeleton" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 rounded-3xl text-center" style={{ backgroundColor: '#15161a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <IoReceipt className="text-omega-text-dim mx-auto mb-3" size={40} />
            <p className="text-omega-text-muted text-sm">لا توجد طلبات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(o => {
              const sc = STATUS[o.status] || STATUS.pending;
              return (
                <div
                  key={o.id}
                  className="flex gap-0 rounded-3xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                  style={{ backgroundColor: '#15161a', border: '1px solid rgba(255,255,255,0.05)' }}
                  onClick={() => setSelected(o)}
                >
                  {/* Left color bar */}
                  <div className="w-1 flex-shrink-0" style={{ backgroundColor: sc.color }} />

                  {/* Content */}
                  <div className="flex-1 min-w-0 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: sc.bg, color: sc.color }}>
                          {sc.label}
                        </span>
                        <span className="text-omega-text-dim text-[10px]">{timeAgo(o.createdAt)}</span>
                      </div>
                      <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ color: '#ff6b00', backgroundColor: 'rgba(255,107,0,0.12)' }}>
                        #{o.id?.slice(-4)}
                      </span>
                    </div>
                    <p className="text-white font-bold text-sm mb-0.5">{o.customerName}</p>
                    <p className="text-omega-text-dim text-xs mb-2" dir="ltr">{o.customerPhone}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-omega-text-dim">
                        <IoReceipt size={11} />
                        <span className="text-[10px]">{o.items?.length || 0} منتج</span>
                        {o.driverName && <><IoCar size={11} /><span className="text-[10px]">سائق</span></>}
                      </div>
                      <p className="text-omega-orange font-black text-base">{formatCurrency(o.totalPrice)}</p>
                    </div>
                  </div>

                  {/* Eye */}
                  <div className="flex items-center pr-4">
                    <IoEye size={18} className="text-omega-text-dim" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setSelected(null)} />
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar p-6 rounded-t-3xl animate-slide-up"
            style={{ backgroundColor: '#15161a', borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-white font-black text-lg">طلب #{selected.id?.slice(-6)}</h3>
                <p className="text-omega-text-muted text-xs mt-0.5">{timeAgo(selected.createdAt)}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-omega-text-muted"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
              >
                <IoClose size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Customer */}
              <div className="p-4 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <IoPerson size={14} className="text-omega-orange" />
                  <p className="text-white text-sm font-bold">معلومات الزبون</p>
                </div>
                <p className="text-white text-sm mb-1">{selected.customerName}</p>
                <div className="flex items-center gap-2 text-omega-text-muted text-xs mb-1">
                  <IoCall size={11} /> <span dir="ltr">{selected.customerPhone}</span>
                </div>
                {selected.customerAddress && (
                  <div className="flex items-start gap-2 text-omega-text-muted text-xs">
                    <IoLocation size={11} className="mt-0.5 flex-shrink-0" />
                    <span>{selected.customerAddress}</span>
                  </div>
                )}
                {selected.customerNote && (
                  <p className="mt-2 pt-2 border-t border-white/5 text-omega-text-muted text-xs">📝 {selected.customerNote}</p>
                )}
              </div>

              {/* Driver */}
              {selected.driverName && (
                <div className="p-4 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <IoCar size={14} className="text-omega-info" />
                    <p className="text-white text-sm font-bold">السائق</p>
                  </div>
                  <p className="text-white text-sm">{selected.driverName}</p>
                  <p className="text-omega-text-muted text-xs" dir="ltr">{selected.driverPhone}</p>
                </div>
              )}

              {/* Items */}
              <div className="p-4 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <IoReceipt size={14} className="text-omega-orange" />
                  <p className="text-white text-sm font-bold">المنتجات</p>
                </div>
                <div className="space-y-2 mb-3">
                  {selected.items?.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm py-0.5">
                      <span className="text-omega-text">
                        <span className="text-omega-orange font-bold ml-1">×{item.quantity}</span>
                        {item.name}
                      </span>
                      <span className="text-white font-medium">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/8 pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-400 font-bold">الربح</span>
                    <span className="text-emerald-400 font-bold">{formatCurrency(calculateOrderProfit(selected).profit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white font-black">الإجمالي</span>
                    <span className="text-omega-orange font-black text-base">{formatCurrency(selected.totalPrice)}</span>
                  </div>
                </div>
              </div>

              {/* Status change */}
              <div className="p-4 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <IoFlash size={14} className="text-omega-warning" />
                  <p className="text-white text-sm font-bold">تغيير الحالة</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['pending','preparing','on_the_way','delivered','cancelled'].map(s => {
                    const cfg = STATUS[s];
                    const isActive = selected.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(selected.id, s)}
                        className="py-3 rounded-2xl text-xs font-bold border transition-all"
                        style={isActive
                          ? { backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.color + '40' }
                          : { backgroundColor: 'rgba(255,255,255,0.03)', color: '#5a5a60', borderColor: 'rgba(255,255,255,0.07)' }
                        }
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
