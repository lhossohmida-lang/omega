import { useState, useEffect, useRef } from 'react';
import { subscribeToWorkerOrders, markWorkerOrderReady } from '../services/orderService';
import { playLoudAlarm } from '../utils/soundUtils';
import { formatCurrency } from '../utils/formatCurrency';
import { timeAgo } from '../utils/formatDate';
import WorkerNav from '../components/WorkerNav';
import {
  IoRestaurant,
  IoTime,
  IoCheckmarkCircle,
  IoAlertCircle,
  IoDocumentText,
} from 'react-icons/io5';
import toast from 'react-hot-toast';

const categoryEmoji = {
  pizza: '🍕',
  burger: '🍔',
  tacos: '🌮',
  drinks: '🥤',
  appetizers: '🍟',
  desserts: '🍰',
};

export default function WorkerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(null);
  const previousCountRef = useRef(0);

  useEffect(() => {
    // timeout احتياطي بعد 6 ثوانٍ لإيقاف حالة التحميل
    const timeout = setTimeout(() => setLoading(false), 6000);

    const unsub = subscribeToWorkerOrders((data) => {
      clearTimeout(timeout);
      setOrders(data);
      setLoading(false);

      if (previousCountRef.current > 0 && data.length > previousCountRef.current) {
        playLoudAlarm();
        toast('طلب جديد وصل! 🍽️', { icon: '🔔' });
      }

      previousCountRef.current = data.length;
    });

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, []);

  const handleMarkReady = async (orderId) => {
    setMarking(orderId);
    try {
      await markWorkerOrderReady(orderId);
      toast.success('تم تحديد الطلب كجاهز ✅');
    } catch (error) {
      toast.error(error.message || 'حدث خطأ');
    }
    setMarking(null);
  };

  const pendingOrders = orders.filter(o => !o.workerReady);
  const readyOrders = orders.filter(o => o.workerReady);

  return (
    <div className="min-h-screen bg-omega-dark pb-28">
      {/* Header */}
      <div className="sticky top-0 z-30 glass border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-omega-orange bg-omega-orange/10 border border-omega-orange/20 px-3 py-1 rounded-full">
                {pendingOrders.length} قيد التحضير
              </span>
              {readyOrders.length > 0 && (
                <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  {readyOrders.length} جاهز
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <IoRestaurant className="text-omega-orange" size={22} />
              <h1 className="text-lg font-black text-white">طلبات المطبخ</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4 space-y-6">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-omega-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-omega-text-muted text-sm">جاري تحميل الطلبات...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-white font-bold text-lg mb-2">لا توجد طلبات حالياً</h3>
            <p className="text-omega-text-muted text-sm">سيظهر الطلب هنا بعد تأكيد الإدارة</p>
          </div>
        ) : (
          <>
            {/* قيد التحضير */}
            {pendingOrders.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <IoAlertCircle className="text-omega-orange" size={18} />
                  <h2 className="text-base font-black text-omega-orange">بحاجة للتحضير</h2>
                </div>
                <div className="space-y-3">
                  {pendingOrders.map((order, idx) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      idx={idx}
                      onMarkReady={handleMarkReady}
                      marking={marking}
                      isReady={false}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* جاهزة للتسليم */}
            {readyOrders.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <IoCheckmarkCircle className="text-emerald-400" size={18} />
                  <h2 className="text-base font-black text-emerald-400">جاهز — ينتظر السائق</h2>
                </div>
                <div className="space-y-3">
                  {readyOrders.map((order, idx) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      idx={idx}
                      onMarkReady={handleMarkReady}
                      marking={marking}
                      isReady={true}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <WorkerNav />
    </div>
  );
}

function OrderCard({ order, idx, onMarkReady, marking, isReady }) {
  return (
    <div
      className={`rounded-2xl p-4 border transition-all animate-slide-up ${
        isReady
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'glass border-white/5 hover:border-omega-orange/20'
      }`}
      style={{ animationDelay: `${idx * 60}ms` }}
    >
      {/* رأس البطاقة */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <IoTime className="text-omega-text-muted" size={13} />
          <span className="text-omega-text-muted text-xs">{timeAgo(order.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          {isReady && (
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-lg">
              ✅ جاهز
            </span>
          )}
          <span className="text-omega-orange font-black text-lg">#{order.id?.slice(-4)}</span>
        </div>
      </div>

      {/* قائمة المنتجات */}
      <div className="bg-omega-dark/40 rounded-xl p-3 mb-3 space-y-2">
        <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
          <IoDocumentText className="text-omega-orange" size={14} />
          <span className="text-white font-bold text-sm">المنتجات المطلوبة</span>
        </div>
        {order.items?.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-omega-text text-sm font-bold">{formatCurrency(item.price * item.quantity)}</span>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white">{item.name}</span>
              <span className="text-omega-orange font-black text-base w-7 h-7 bg-omega-orange/10 rounded-lg flex items-center justify-center">
                ×{item.quantity}
              </span>
              <span className="text-lg">{categoryEmoji[item.category] || '🍽️'}</span>
            </div>
          </div>
        ))}
        <div className="border-t border-white/10 pt-2 flex justify-between items-center">
          <span className="text-omega-orange font-black">{formatCurrency(order.totalPrice)}</span>
          <span className="text-white font-bold text-sm">الإجمالي</span>
        </div>
      </div>

      {/* ملاحظة العميل */}
      {order.customerNote && (
        <div className="bg-omega-orange/5 border border-omega-orange/15 rounded-xl p-3 mb-3 text-right">
          <p className="text-omega-orange text-xs font-bold mb-1">📝 ملاحظة العميل</p>
          <p className="text-omega-text text-sm">{order.customerNote}</p>
        </div>
      )}

      {/* نوع الطلب */}
      <div className="flex items-center justify-end gap-2 mb-3">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
          order.isDelivery
            ? 'bg-blue-500/10 text-blue-400'
            : 'bg-purple-500/10 text-purple-400'
        }`}>
          {order.isDelivery ? '🚗 توصيل' : '🏪 استلام من المحل'}
        </span>
      </div>

      {/* زر التحضير */}
      {!isReady && (
        <button
          onClick={() => onMarkReady(order.id)}
          disabled={marking === order.id}
          className="w-full py-3.5 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-white font-black text-sm hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {marking === order.id ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <><IoCheckmarkCircle size={20} /><span>تم التحضير — جاهز للتسليم</span></>
          )}
        </button>
      )}
    </div>
  );
}
