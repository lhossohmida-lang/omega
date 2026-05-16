import { useEffect, useMemo, useState, useRef } from 'react';
import {
  resetOrdersData,
  subscribeToAllOrders,
  updateOrderStatus,
  confirmOrder,
  createAdminOrder,
} from '../services/orderService';
import { getAllProducts } from '../services/productService';
import { useAuth } from '../hooks/useAuth';
import { playLoudAlarm } from '../utils/soundUtils';
import { formatCurrency, formatNumber } from '../utils/formatCurrency';
import { isToday, timeAgo } from '../utils/formatDate';
import { calculateOrderProfit } from '../utils/calculateProfit';
import AdminHeader from '../components/AdminHeader';
import AdminNav from '../components/AdminNav';
import {
  IoAdd,
  IoBagHandleOutline,
  IoCallOutline,
  IoCardOutline,
  IoCarOutline,
  IoCheckmarkCircleOutline,
  IoClose,
  IoDocumentTextOutline,
  IoEllipsisVertical,
  IoEyeOutline,
  IoFastFoodOutline,
  IoFilterOutline,
  IoList,
  IoLocationOutline,
  IoNavigateCircleOutline,
  IoPersonOutline,
  IoReceiptOutline,
  IoRemove,
  IoReloadOutline,
  IoRestaurantOutline,
  IoSearch,
  IoTimeOutline,
} from 'react-icons/io5';
import toast from 'react-hot-toast';

const statusConfig = {
  all: { label: 'الكل', icon: IoList, color: '#ff6b00', bg: 'rgba(255,107,0,0.15)' },
  pending: { label: 'جديد', icon: IoTimeOutline, color: '#e53935', bg: 'rgba(229,57,53,0.14)' },
  preparing: { label: 'قيد التحضير', icon: IoFastFoodOutline, color: '#ff8c33', bg: 'rgba(255,107,0,0.15)' },
  ready: { label: 'جاهز', icon: IoCheckmarkCircleOutline, color: '#22c55e', bg: 'rgba(34,197,94,0.13)' },
  delivered: { label: 'تم التسليم', icon: IoCarOutline, color: '#8e8e93', bg: 'rgba(255,255,255,0.08)' },
  cancelled: { label: 'ملغي', icon: IoClose, color: '#e53935', bg: 'rgba(229,57,53,0.12)' },
};

function paymentLabel(order) {
  return order.paymentMethod === 'card' ? 'بطاقة' : 'نقداً';
}

function displayStatus(order) {
  if (order.status === 'delivered') return 'delivered';
  if (order.status === 'cancelled') return 'cancelled';
  if (order.workerReady) return 'ready';
  if (order.status === 'preparing') return 'preparing';
  return 'pending';
}

function nextAction(order) {
  const s = displayStatus(order);
  if (s === 'ready') return { key: 'delivered', label: 'تسليم', icon: IoCarOutline };
  return null;
}

export default function AdminOrders() {
  const { userData } = useAuth();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [routingOrder, setRoutingOrder] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const previousOrdersRef = useRef([]);

  useEffect(() => {
    const unsub = subscribeToAllOrders((data) => {
      setOrders(data);
      setLoading(false);

      const previousPending = previousOrdersRef.current.filter(o => o.status === 'pending');
      const currentPending = data.filter(o => o.status === 'pending');

      if (previousOrdersRef.current.length > 0 && currentPending.length > previousPending.length) {
        playLoudAlarm();
      }

      previousOrdersRef.current = data;
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setProducts(await getAllProducts());
      } catch (err) {
        console.error('load products error:', err);
      }
    })();
  }, []);

  async function handleConfirmRouting({ destination }) {
    if (!routingOrder) return;
    try {
      await confirmOrder(routingOrder.id, {
        destination,
        adminUid: userData?.uid,
      });
      toast.success('تم تأكيد الطلب');
      setRoutingOrder(null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'تعذّر تأكيد الطلب');
    }
  }

  async function handleCreateAdminOrder(payload) {
    try {
      await createAdminOrder({
        ...payload,
        customerId: userData?.uid || 'admin',
      });
      toast.success('تم إنشاء الطلب');
      setShowNewOrder(false);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'تعذّر إنشاء الطلب');
    }
  }

  async function handleStatusChange(orderId, newStatus) {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success('تم تحديث حالة الطلب');
      setOrders(current => current.map(order => order.id === orderId ? { ...order, status: newStatus } : order));
      setSelected(current => current?.id === orderId ? { ...current, status: newStatus } : current);
    } catch (error) {
      console.error(error);
      toast.error('تعذر تحديث الطلب');
    }
  }

  async function handleResetData() {
    const ok = confirm('سيتم حذف جميع الطلبات وإعادة عدادات مبيعات المنتجات إلى صفر. هل تريد المتابعة؟');
    if (!ok) return;

    setResetting(true);
    try {
      const result = await resetOrdersData();
      setSelected(null);
      setOrders([]);
      toast.success(`تمت إعادة التعيين: ${result.deletedOrders} طلب`);
    } catch (error) {
      console.error(error);
      toast.error('تعذرت إعادة تعيين البيانات');
    } finally {
      setResetting(false);
    }
  }

  const filteredOrders = useMemo(() => {
    const value = search.trim().toLowerCase();
    return orders.filter(order => {
      if (filter !== 'all' && displayStatus(order) !== filter) return false;
      if (!value) return true;
      return order.id?.toLowerCase().includes(value)
        || order.customerName?.toLowerCase().includes(value)
        || order.customerPhone?.includes(value);
    });
  }, [orders, filter, search]);

  const counts = useMemo(() => ({
    all: orders.length,
    pending: orders.filter(o => displayStatus(o) === 'pending').length,
    preparing: orders.filter(o => displayStatus(o) === 'preparing').length,
    ready: orders.filter(o => displayStatus(o) === 'ready').length,
    delivered: orders.filter(o => displayStatus(o) === 'delivered').length,
    cancelled: orders.filter(o => displayStatus(o) === 'cancelled').length,
    today: orders.filter(o => isToday(o.createdAt)).length,
  }), [orders]);

  const summaryCards = [
    { label: 'طلبات اليوم', value: counts.today, icon: IoDocumentTextOutline, hint: 'كل الأنواع' },
    { label: 'قيد التحضير', value: counts.preparing, icon: IoFastFoodOutline, hint: 'نشطة الآن' },
    { label: 'جاهزة', value: counts.ready, icon: IoCheckmarkCircleOutline, hint: 'بانتظار التسليم' },
    { label: 'تم التسليم', value: counts.delivered, icon: IoCarOutline, hint: 'مكتملة' },
  ];

  return (
    <div className="admin-page">
      <AdminNav />

      <main className="admin-container">
        <AdminHeader title="الطلبات" subtitle="إدارة ومتابعة جميع طلبات المطعم" />

        <section className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <label className="admin-control flex min-h-12 items-center gap-3 px-4">
            <IoSearch className="text-omega-text-dim" size={26} />
            <input
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="ابحث برقم الطلب أو اسم العميل أو الهاتف"
              className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-omega-text-dim"
            />
          </label>

          <button
            type="button"
            onClick={() => setShowNewOrder(true)}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-omega-orange to-omega-red px-5 text-sm font-black text-white shadow-lg shadow-omega-orange/25 active:scale-95"
          >
            <IoAdd size={22} />
            طلب جديد
          </button>

          <button className="admin-control flex min-h-12 items-center justify-center gap-2 px-5 text-sm font-black text-white">
            <IoFilterOutline className="text-omega-orange" size={25} />
            فلترة
          </button>

          <button
            type="button"
            onClick={handleResetData}
            disabled={resetting}
            className="admin-control flex min-h-12 items-center justify-center gap-2 px-5 text-sm font-black text-omega-orange disabled:opacity-60"
          >
            <IoReloadOutline size={20} />
            {resetting ? 'جاري إعادة التعيين...' : 'إعادة تعيين البيانات'}
          </button>
        </section>

        <section className="mb-4 grid grid-cols-5 gap-2 sm:gap-3">
          {['all', 'pending', 'preparing', 'ready', 'delivered'].map(key => {
            const config = statusConfig[key];
            const Icon = config.icon;
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className="admin-control flex min-w-0 flex-col items-center justify-center gap-1 px-1.5 py-2.5 transition-all"
                style={active ? { borderColor: config.color, boxShadow: `0 0 26px -16px ${config.color}` } : undefined}
              >
                <Icon size={20} style={{ color: active ? config.color : '#8e8e93' }} />
                <p className="truncate text-[11px] font-black sm:text-xs" style={{ color: active ? config.color : '#e6e6e6' }}>{config.label}</p>
                <p className="text-[10px] text-omega-text-muted">{formatNumber(counts[key] || 0)}</p>
              </button>
            );
          })}
        </section>

        <section className="admin-glass mb-5 grid grid-cols-2 gap-2.5 p-3.5 lg:grid-cols-4">
          {summaryCards.map(({ label, value, icon: Icon, hint }) => (
            <div key={label} className="rounded-lg border border-white/8 bg-white/[0.025] p-3 text-center">
              <div className="mb-3 flex items-center justify-center gap-2 text-white">
                <Icon className="text-omega-orange" size={23} />
                <span className="font-bold">{label}</span>
              </div>
              <p className="text-2xl font-black text-white">{formatNumber(value)}</p>
              <p className="mt-1 text-sm text-omega-text-muted">طلب</p>
              <p className="mt-3 text-xs font-bold text-emerald-400">{hint}</p>
            </div>
          ))}
        </section>

        <section>
          <h2 className="mb-4 text-right text-2xl font-black text-white">أحدث الطلبات</h2>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-28 rounded-[1.35rem] skeleton" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="admin-glass rounded-[1.55rem] p-10 text-center text-omega-text-muted">
              لا توجد طلبات مطابقة
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map(order => {
                const ds = displayStatus(order);
                const config = statusConfig[ds] || statusConfig.pending;
                const action = nextAction(order);
                const ActionIcon = action?.icon;
                return (
                  <article key={order.id} className="admin-glass p-3.5">
                    <div className="grid gap-3 lg:grid-cols-[1.1fr_1.25fr_1fr_1.1fr] lg:items-center">
                      <div className="flex items-center justify-between gap-3 border-b border-white/6 pb-3 lg:border-b-0 lg:border-l lg:pb-0 lg:pl-5">
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-omega-orange" />
                            <p className="text-xl font-black text-omega-orange">#{order.id?.slice(-4)}</p>
                          </div>
                          <span
                            className="mt-3 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold"
                            style={{ color: config.color, backgroundColor: config.bg, borderColor: `${config.color}55` }}
                          >
                            {config.label}
                            <config.icon size={18} />
                          </span>
                          <span
                            className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black border"
                            style={
                              order.isDelivery
                                ? { color: '#4ade80', background: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.4)' }
                                : { color: '#fca5a5', background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.4)' }
                            }
                          >
                            {order.isDelivery ? '🚗 توصيل' : '🍽️ داخل المطعم'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right lg:border-l lg:border-white/6 lg:pl-5">
                        <div className="mb-2 flex items-center justify-end gap-2 text-white">
                          <p className="text-lg font-bold">{order.customerName || 'عميل'}</p>
                          <IoPersonOutline className="text-omega-text-muted" />
                        </div>
                        <div className="flex items-center justify-end gap-2 text-omega-text-muted" dir="ltr">
                          <span>{order.customerPhone || '---'}</span>
                          <IoCallOutline />
                        </div>
                      </div>

                      <div className="text-right lg:border-l lg:border-white/6 lg:pl-5">
                        <p className="text-sm text-omega-text-muted">المبلغ الإجمالي</p>
                        <p className="mt-1 text-2xl font-black text-white">{formatCurrency(order.totalPrice)}</p>
                        <p className="mt-2 flex items-center justify-end gap-2 text-sm text-emerald-400">
                          {paymentLabel(order)}
                          <IoCardOutline />
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm text-omega-text-muted">
                          <div className="flex items-center gap-2">
                            <IoTimeOutline />
                            {timeAgo(order.createdAt)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelected(order)}
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-omega-orange/35 bg-omega-orange/8 text-omega-orange transition-transform active:scale-95"
                            aria-label="عرض الطلب"
                          >
                            <IoEyeOutline size={22} />
                          </button>
                          {ds === 'pending' ? (
                            <button
                              type="button"
                              onClick={() => setRoutingOrder(order)}
                              className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-omega-orange/40 bg-omega-orange/15 px-3 text-omega-orange text-sm font-black transition-transform active:scale-95"
                              aria-label="تأكيد الطلب"
                            >
                              <IoNavigateCircleOutline size={20} />
                              تأكيد
                            </button>
                          ) : action ? (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(order.id, action.key)}
                              className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 transition-transform active:scale-95"
                              aria-label={action.label}
                            >
                              <ActionIcon size={21} />
                            </button>
                          ) : null}
                          <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-omega-text-muted">
                            <IoEllipsisVertical size={22} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {routingOrder && (
        <RoutingModal
          order={routingOrder}
          onClose={() => setRoutingOrder(null)}
          onConfirm={handleConfirmRouting}
        />
      )}

      {showNewOrder && (
        <NewOrderModal
          products={products}
          onClose={() => setShowNewOrder(false)}
          onSubmit={handleCreateAdminOrder}
        />
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setSelected(null)} aria-label="إغلاق" />
          <div className="admin-glass relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-[1.8rem] p-6">
            <div className="mb-5 flex items-start justify-between">
              <button
                onClick={() => setSelected(null)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-omega-text-muted"
              >
                <IoClose size={22} />
              </button>
              <div className="text-right">
                <h3 className="text-2xl font-black text-white">طلب #{selected.id?.slice(-6)}</h3>
                <p className="mt-1 text-sm text-omega-text-muted">{timeAgo(selected.createdAt)}</p>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="admin-control rounded-[1.25rem] p-4">
                <div className="mb-3 flex items-center justify-end gap-2">
                  <h4 className="font-black text-white">معلومات العميل</h4>
                  <IoPersonOutline className="text-omega-orange" />
                </div>
                <p className="text-right text-white">{selected.customerName}</p>
                <p className="mt-1 text-right text-omega-text-muted" dir="ltr">{selected.customerPhone}</p>
                <span
                  className="mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-black border"
                  style={
                    selected.isDelivery
                      ? { color: '#4ade80', background: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.4)' }
                      : { color: '#fca5a5', background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.4)' }
                  }
                >
                  {selected.isDelivery ? '🚗 توصيل' : '🍽️ داخل المطعم'}
                </span>
                {selected.isDelivery && selected.customerAddress && (
                  <p className="mt-2 flex items-start justify-end gap-2 text-right text-sm text-omega-text-muted">
                    {selected.customerAddress}
                    <IoLocationOutline className="mt-1 shrink-0" />
                  </p>
                )}
                {selected.customerNote ? (
                  <p className="mt-2 text-right text-sm text-omega-text-muted">📝 {selected.customerNote}</p>
                ) : null}
              </div>

              <div className="admin-control rounded-[1.25rem] p-4">
                <div className="mb-3 flex items-center justify-end gap-2">
                  <h4 className="font-black text-white">المنتجات</h4>
                  <IoReceiptOutline className="text-omega-orange" />
                </div>
                <div className="space-y-2">
                  {(selected.items || []).map((item, index) => (
                    <div key={`${item.name}-${index}`} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2">
                      <span className="font-bold text-white">{formatCurrency((item.price || 0) * (item.quantity || 1))}</span>
                      <span className="text-omega-text">
                        {item.name}
                        <b className="mr-2 text-omega-orange">x{item.quantity}</b>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-white/8 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-emerald-400">{formatCurrency(calculateOrderProfit(selected).profit)}</span>
                    <span className="text-omega-text-muted">الربح التقريبي</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xl font-black text-omega-orange">{formatCurrency(selected.totalPrice)}</span>
                    <span className="font-black text-white">الإجمالي</span>
                  </div>
                </div>
              </div>

              <div className="admin-control rounded-[1.25rem] p-4">
                <h4 className="mb-3 text-right font-black text-white">تغيير الحالة</h4>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {['pending', 'preparing', 'delivered', 'cancelled'].map(status => {
                    const config = statusConfig[status];
                    const active = selected.status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleStatusChange(selected.id, status)}
                        className="rounded-2xl border px-3 py-3 text-sm font-black"
                        style={{
                          color: active ? config.color : '#8e8e93',
                          backgroundColor: active ? config.bg : 'rgba(255,255,255,0.03)',
                          borderColor: active ? `${config.color}55` : 'rgba(255,255,255,0.08)',
                        }}
                      >
                        {config.label}
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

/* ─── Destination Picker (Table vs Delivery only) ───────── */
function DestinationPicker({ destination, setDestination }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => setDestination('table')}
        className={`rounded-xl p-4 text-sm font-black border transition-all ${
          destination === 'table'
            ? 'bg-omega-orange/15 border-omega-orange/50 text-omega-orange'
            : 'bg-white/[0.03] border-white/10 text-omega-text-muted hover:text-white'
        }`}
      >
        <IoRestaurantOutline className="mx-auto mb-1.5" size={24} />
        طلب طاولة (داخل المطعم)
      </button>
      <button
        type="button"
        onClick={() => setDestination('delivery')}
        className={`rounded-xl p-4 text-sm font-black border transition-all ${
          destination === 'delivery'
            ? 'bg-omega-orange/15 border-omega-orange/50 text-omega-orange'
            : 'bg-white/[0.03] border-white/10 text-omega-text-muted hover:text-white'
        }`}
      >
        <IoCarOutline className="mx-auto mb-1.5" size={24} />
        طلب توصيل
      </button>
    </div>
  );
}

function RoutingModal({ order, onClose, onConfirm }) {
  const [destination, setDestination] = useState(order.isDelivery ? 'delivery' : 'table');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    await onConfirm({ destination });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm p-3 sm:items-center">
      <div className="w-full max-w-lg rounded-3xl bg-omega-dark border border-white/10 p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/5 p-2 text-white hover:bg-white/10"
            aria-label="إغلاق"
          >
            <IoClose size={18} />
          </button>
          <div className="text-right">
            <h2 className="text-white text-lg font-black">تأكيد الطلب #{order.id?.slice(-4)}</h2>
            <p className="text-omega-text-muted text-xs mt-0.5">
              {order.customerName} • {formatCurrency(order.totalPrice)}
            </p>
          </div>
        </div>

        <DestinationPicker
          destination={destination}
          setDestination={setDestination}
        />

        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          className="mt-5 w-full rounded-xl bg-gradient-to-l from-omega-orange to-omega-red py-3 text-white font-black text-sm shadow-lg shadow-omega-orange/25 disabled:opacity-60 active:scale-[0.98]"
        >
          {submitting ? '...جاري التأكيد' : 'إرسال للمطبخ'}
        </button>
      </div>
    </div>
  );
}

/* ─── New Walk-in Order Modal ───────────────────────────── */
function NewOrderModal({ products, onClose, onSubmit }) {
  const [step, setStep] = useState(1);
  const [cart, setCart] = useState({});
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [destination, setDestination] = useState('table');
  const [submitting, setSubmitting] = useState(false);
  const [searchProd, setSearchProd] = useState('');

  const availableProducts = products.filter(p => p.isAvailable !== false);
  const filteredProducts = availableProducts.filter(p => {
    if (!searchProd.trim()) return true;
    return p.name?.toLowerCase().includes(searchProd.toLowerCase());
  });

  const addItem = (id) => setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const removeItem = (id) => setCart(c => {
    const n = { ...c };
    if (n[id] > 1) n[id] -= 1;
    else delete n[id];
    return n;
  });

  const cartEntries = Object.entries(cart).map(([pid, qty]) => {
    const p = products.find(x => x.id === pid);
    return p ? { product: p, quantity: qty } : null;
  }).filter(Boolean);

  const totalPrice = cartEntries.reduce((s, { product, quantity }) => s + (product.price || 0) * quantity, 0);
  const itemsCount = cartEntries.reduce((s, e) => s + e.quantity, 0);

  const canGoNext = itemsCount > 0;

  const handleSubmit = async () => {
    if (cartEntries.length === 0) {
      toast.error('أضف منتجات أولاً');
      return;
    }
    setSubmitting(true);
    const items = cartEntries.map(({ product, quantity }) => ({
      productId: product.id,
      name: product.name,
      price: product.price || 0,
      costPrice: product.costPrice || 0,
      image: product.image || '',
      category: product.category || '',
      quantity,
    }));
    const payload = {
      items,
      totalPrice,
      customerName: customerName || 'زبون داخل المطعم',
      customerPhone: customerPhone || '',
      customerNote,
      isDelivery: destination === 'delivery',
      orderType: destination,
    };
    await onSubmit(payload);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm p-3 sm:items-center">
      <div className="w-full max-w-xl rounded-3xl bg-omega-dark border border-white/10 p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/5 p-2 text-white hover:bg-white/10"
            aria-label="إغلاق"
          >
            <IoClose size={18} />
          </button>
          <div className="text-right">
            <h2 className="text-white text-lg font-black">طلب جديد من الإدارة</h2>
            <p className="text-omega-text-muted text-xs mt-0.5">
              الخطوة {step} من 2
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-omega-orange' : 'bg-white/10'}`} />
          <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-omega-orange' : 'bg-white/10'}`} />
        </div>

        {step === 1 ? (
          <>
            <label className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 mb-3">
              <IoSearch className="text-omega-text-muted" size={18} />
              <input
                type="text"
                placeholder="ابحث عن منتج..."
                value={searchProd}
                onChange={e => setSearchProd(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-omega-text-dim text-right"
              />
            </label>

            <div className="space-y-1.5 max-h-72 overflow-y-auto mb-3">
              {filteredProducts.length === 0 ? (
                <p className="text-omega-text-dim text-sm text-center py-6">لا توجد منتجات</p>
              ) : (
                filteredProducts.map(p => {
                  const qty = cart[p.id] || 0;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 ${
                        qty > 0 ? 'border-omega-orange/40 bg-omega-orange/[0.06]' : 'border-white/8 bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {qty > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => removeItem(p.id)}
                              className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/15"
                            >
                              <IoRemove size={16} />
                            </button>
                            <span className="w-5 text-center text-white font-black text-sm">{qty}</span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => addItem(p.id)}
                          className="w-7 h-7 rounded-lg bg-omega-orange text-white flex items-center justify-center hover:bg-omega-orange/90"
                        >
                          <IoAdd size={16} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                        <div className="text-right min-w-0">
                          <p className="text-white font-bold text-sm truncate">{p.name}</p>
                          <p className="text-omega-orange text-xs font-bold">{formatCurrency(p.price)}</p>
                        </div>
                        {p.image && (
                          <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <input
                type="text"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="الهاتف (اختياري)"
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white text-sm outline-none placeholder:text-omega-text-dim text-right"
                dir="ltr"
              />
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="اسم الزبون (اختياري)"
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white text-sm outline-none placeholder:text-omega-text-dim text-right"
              />
            </div>
            <textarea
              value={customerNote}
              onChange={e => setCustomerNote(e.target.value)}
              placeholder="ملاحظة (اختياري)"
              rows={2}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white text-sm outline-none placeholder:text-omega-text-dim text-right resize-none mb-3"
            />

            {itemsCount > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-omega-orange/10 border border-omega-orange/30 px-4 py-3 mb-3">
                <span className="text-omega-orange font-black text-lg">
                  {formatCurrency(totalPrice)}
                </span>
                <span className="text-white text-sm font-bold">{itemsCount} منتج</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!canGoNext}
              className="w-full rounded-xl bg-gradient-to-l from-omega-orange to-omega-red py-3 text-white font-black text-sm shadow-lg shadow-omega-orange/25 disabled:opacity-50 active:scale-[0.98]"
            >
              التالي — اختيار نوع الطلب
            </button>
          </>
        ) : (
          <>
            <div className="mb-4 rounded-xl bg-omega-orange/[0.06] border border-omega-orange/20 p-3 flex items-center justify-between">
              <span className="text-omega-orange font-black">{formatCurrency(totalPrice)}</span>
              <span className="text-white text-sm font-bold">{itemsCount} منتج • {customerName || 'زبون داخل المطعم'}</span>
            </div>

            <DestinationPicker
              destination={destination}
              setDestination={setDestination}
            />

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl bg-white/5 border border-white/10 py-3 text-white text-sm font-bold hover:bg-white/10"
              >
                رجوع
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl bg-gradient-to-l from-omega-orange to-omega-red py-3 text-white font-black text-sm shadow-lg shadow-omega-orange/25 disabled:opacity-60 active:scale-[0.98]"
              >
                {submitting ? '...جاري الحفظ' : 'إنشاء الطلب'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
