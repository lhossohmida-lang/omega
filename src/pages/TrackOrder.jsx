import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { subscribeToOrder, getCustomerOrders } from '../services/orderService';
import { formatCurrency } from '../utils/formatCurrency';
import CustomerNav from '../components/CustomerNav';
import {
  IoNotifications, IoPersonOutline, IoCheckmarkCircle,
  IoRestaurantOutline, IoBicycleOutline, IoArchiveOutline,
  IoCall, IoChatbubbleEllipsesOutline, IoLocationOutline,
  IoChevronBack, IoStar, IoChevronDown, IoChevronUp,
  IoShieldCheckmarkOutline, IoPulseOutline, IoTimeOutline
} from 'react-icons/io5';

const statusSteps = [
  { key: 'pending', label: 'تم الاستلام', icon: IoCheckmarkCircle },
  { key: 'preparing', label: 'قيد التحضير', icon: IoRestaurantOutline },
  { key: 'on_the_way', label: 'خرج للتوصيل', icon: IoBicycleOutline },
  { key: 'delivered', label: 'تم التسليم', icon: IoArchiveOutline },
];

const statusLabels = {
  pending: { label: 'قيد الانتظار', color: 'emerald' },
  accepted_by_driver: { label: 'مقبول', color: 'blue' },
  preparing: { label: 'قيد التحضير', color: 'orange' },
  on_the_way: { label: 'خرج للتوصيل', color: 'purple' },
  delivered: { label: 'تم التسليم', color: 'emerald' },
  cancelled: { label: 'ملغي', color: 'red' },
};

const categoryEmoji = (cat) =>
  cat === 'burger' ? '🍔' : cat === 'pizza' ? '🍕' : cat === 'tacos' ? '🌮' : '🥤';

function formatTime(d) {
  if (!d) return '';
  const date = d.toDate ? d.toDate() : new Date(d);
  return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function TrackOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [order, setOrder] = useState(null);
  const [previousOrders, setPreviousOrders] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToOrder(id, setOrder);
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (userData?.uid) {
      getCustomerOrders(userData.uid)
        .then(list => setPreviousOrders(list.filter(o => o.id !== id && o.status === 'delivered').slice(0, 3)))
        .catch(console.error);
    }
  }, [userData, id]);

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="relative">
        <div className="w-12 h-12 border-4 border-omega-orange/20 rounded-full" />
        <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-omega-orange rounded-full animate-spin" />
      </div>
    </div>
  );

  // Determine current step
  const currentStepIdx = (() => {
    if (order.status === 'delivered') return 3;
    if (order.status === 'on_the_way') return 2;
    if (order.status === 'preparing' || order.status === 'accepted_by_driver') return 1;
    return 0;
  })();

  const isCancelled = order.status === 'cancelled';
  const firstItemCategory = order.items?.[0]?.category || 'burger';
  const cur = statusLabels[order.status] || statusLabels.pending;

  return (
    <div className="min-h-screen pb-32 relative overflow-hidden" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="pointer-events-none fixed top-0 right-0 w-96 h-96 bg-omega-orange/15 rounded-full blur-[120px]" />
      <div className="pointer-events-none fixed top-1/3 -left-20 w-80 h-80 bg-omega-red/10 rounded-full blur-[120px]" />

      <div className="relative max-w-lg mx-auto px-4 pt-5">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate(-1)}
              className="w-11 h-11 rounded-full bg-white/5 border border-omega-orange/30 flex items-center justify-center text-omega-orange shadow-lg shadow-omega-orange/20">
              <IoPersonOutline size={20} />
            </button>
            <button className="w-11 h-11 rounded-full bg-white/5 border border-white/8 flex items-center justify-center text-white/80 relative">
              <IoNotifications size={18} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-omega-orange rounded-full animate-blink" />
            </button>
          </div>
          <div className="text-center flex-1">
            <h1 className="text-white font-black text-base">تتبع الطلب</h1>
          </div>
          <div className="text-right min-w-[80px]">
            <h1 className="text-white font-black text-xl tracking-tight" style={{ fontFamily: 'system-ui' }}>tarken</h1>
            <p className="text-omega-text-muted text-[10px]">مرحباً 👋</p>
          </div>
        </div>

        {/* Order summary card */}
        <div className="rounded-3xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 backdrop-blur p-5 mb-4 animate-slide-up shadow-2xl shadow-black/40">
          {/* Live indicator */}
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-omega-orange/15 border border-omega-orange/30 text-omega-orange text-[10px] font-bold">
              <IoPulseOutline size={10} className="animate-blink" /> مباشر
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-${cur.color}-500/15 border border-${cur.color}-500/40 text-${cur.color}-400 text-xs font-bold`}>
              <IoRestaurantOutline size={12} /> {cur.label}
            </span>
          </div>

          {/* Order id + name */}
          <div className="flex items-start justify-between gap-3">
            <div className="text-right flex-1">
              <p className="text-white font-black text-2xl">#{order.id?.slice(-4)}</p>
              <h2 className="text-white font-black text-lg mt-2 flex items-center gap-1.5">
                {categoryEmoji(firstItemCategory)} {order.items?.[0]?.name || 'طلب'}
              </h2>
              <p className="text-omega-text-muted text-xs mt-1">
                تم الطلب اليوم، {formatTime(order.createdAt)}
              </p>
              <div className="mt-3">
                <p className="text-omega-text-muted text-[11px]">الإجمالي</p>
                <p className="gradient-text font-black text-3xl leading-tight">{formatCurrency(order.totalPrice)}</p>
              </div>
            </div>
            <div className="text-7xl drop-shadow-2xl animate-float">{categoryEmoji(firstItemCategory)}</div>
          </div>

          {/* Toggle order details */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-4 w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-white text-xs font-bold hover:bg-white/[0.08] transition-colors"
          >
            <span>تفاصيل الطلب</span>
            {expanded ? <IoChevronUp size={14} /> : <IoChevronDown size={14} />}
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 animate-fade-in">
              {order.items?.map((item, i) => (
                <div key={i} className="flex justify-between text-xs py-2 border-b border-white/5 last:border-0">
                  <span className="text-omega-text">×{item.quantity} {item.name}</span>
                  <span className="text-omega-orange font-bold">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status timeline */}
        {!isCancelled && (
          <div className="rounded-3xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 backdrop-blur p-5 mb-4 animate-fade-in">
            <div className="flex items-start justify-between mb-4">
              {statusSteps.map((step, idx) => {
                const isCompleted = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const Icon = step.icon;
                const isLast = idx === statusSteps.length - 1;
                return (
                  <div key={step.key} className="flex-1 flex items-center" style={{ minWidth: 0 }}>
                    <div className="flex flex-col items-center min-w-[50px]">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 ${
                        isCurrent
                          ? 'bg-omega-orange text-white shadow-lg shadow-omega-orange/50 scale-110'
                          : isCompleted
                            ? 'bg-omega-orange/15 border-2 border-omega-orange text-omega-orange'
                            : 'bg-white/[0.04] border border-white/10 text-white/30'
                      }`}>
                        <Icon size={18} />
                      </div>
                      <p className={`text-[10px] font-bold mt-2 text-center leading-tight ${
                        isCurrent ? 'text-omega-orange' : isCompleted ? 'text-white' : 'text-white/30'
                      }`}>
                        {step.label}
                      </p>
                      {isCompleted && idx === 0 && (
                        <p className="text-omega-text-dim text-[9px] mt-0.5">{formatTime(order.createdAt)}</p>
                      )}
                    </div>
                    {!isLast && (
                      <div className={`flex-1 h-0.5 -mt-7 mx-1 ${
                        idx < currentStepIdx ? 'bg-omega-orange' : 'bg-white/10'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Expected arrival */}
            {currentStepIdx >= 1 && currentStepIdx < 3 && (
              <div className="relative overflow-hidden mt-4 p-4 rounded-2xl bg-gradient-to-l from-omega-orange/15 via-omega-orange/5 to-transparent border border-omega-orange/25">
                <div className="absolute -bottom-8 -left-8 text-7xl opacity-20">🛵</div>
                <div className="relative">
                  <p className="text-white text-xs font-bold mb-1">الوقت المتوقع للوصول</p>
                  <p className="gradient-text font-black text-2xl leading-tight">
                    9:25 م - 9:40 م
                  </p>
                  <p className="text-omega-text-muted text-[11px] mt-1">خلال 35 - 45 دقيقة</p>
                </div>
              </div>
            )}
          </div>
        )}

        {isCancelled && (
          <div className="rounded-3xl bg-omega-red/10 border border-omega-red/25 p-6 text-center animate-fade-in mb-4">
            <div className="text-4xl mb-3">❌</div>
            <h3 className="text-omega-red font-black text-lg mb-2">تم إلغاء الطلب</h3>
          </div>
        )}

        {/* Driver card */}
        {order.driverName && !isCancelled && (
          <div className="rounded-3xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 backdrop-blur p-4 mb-4 animate-fade-in">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-omega-orange to-omega-red flex items-center justify-center text-white font-black text-xl shadow-lg shadow-omega-orange/30">
                    {order.driverName[0]}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-omega-dark text-[9px] font-black flex items-center gap-0.5">
                    <IoStar size={8} /> 4.9
                  </div>
                </div>
                <div className="text-right flex-1 min-w-0">
                  <p className="text-omega-text-muted text-[11px]">سائقك</p>
                  <p className="text-white font-black text-base truncate">{order.driverName}</p>
                  <p className="text-omega-text-dim text-[10px] flex items-center gap-1">
                    <IoBicycleOutline size={10} /> دراج توصيل
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <a href={`tel:${order.driverPhone}`}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-omega-orange to-omega-orange-dark flex items-center justify-center text-white shadow-lg shadow-omega-orange/40 active:scale-95 transition-transform">
                  <IoCall size={18} />
                </a>
                <button className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 hover:text-omega-orange transition-colors">
                  <IoChatbubbleEllipsesOutline size={16} />
                </button>
                <button className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 hover:text-omega-orange transition-colors">
                  <IoLocationOutline size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Trust message */}
        <div className="flex items-center gap-2 justify-center mb-6 px-3 py-2.5 rounded-2xl bg-white/[0.03] border border-white/8">
          <IoShieldCheckmarkOutline className="text-omega-orange flex-shrink-0" size={16} />
          <p className="text-omega-text-muted text-[11px]">طلبك مؤمن ونتابع كل خطوة لضمان أفضل تجربة لك</p>
        </div>

        {/* Previous orders */}
        {previousOrders.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-black text-base flex items-center gap-2">
                <IoTimeOutline className="text-omega-orange" size={18} /> الطلبات السابقة
              </h3>
              <button onClick={() => navigate('/my-orders')}
                className="text-omega-text-muted text-xs flex items-center gap-1 hover:text-white">
                عرض الكل <IoChevronBack size={12} />
              </button>
            </div>
            <div className="space-y-2 stagger">
              {previousOrders.map(o => (
                <button
                  key={o.id}
                  onClick={() => navigate(`/track/${o.id}`)}
                  className="w-full rounded-2xl bg-white/[0.04] border border-white/8 hover:border-omega-orange/30 p-3 flex items-center gap-3 text-right transition-all"
                >
                  <div className="w-14 h-14 rounded-xl bg-omega-gray/40 overflow-hidden flex items-center justify-center text-2xl flex-shrink-0">
                    {o.items?.[0]?.image
                      ? <img src={o.items[0].image} alt="" className="w-full h-full object-cover" />
                      : categoryEmoji(o.items?.[0]?.category || 'burger')
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white font-black text-sm">#{o.id?.slice(-4)}</span>
                      <span className="text-white text-xs truncate">{o.items?.[0]?.name}</span>
                    </div>
                    <p className="text-omega-text-dim text-[10px]">{formatTime(o.createdAt)}</p>
                    <p className="text-omega-orange text-xs font-black mt-1">{formatCurrency(o.totalPrice)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold">
                      <IoCheckmarkCircle size={9} /> تم التسليم
                    </span>
                    <IoChevronBack className="text-omega-text-dim" size={14} />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <CustomerNav />
    </div>
  );
}
