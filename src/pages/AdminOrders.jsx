import { useEffect, useMemo, useState, useRef } from 'react';
import {
  resetOrdersData,
  subscribeToAllOrders,
  updateOrderStatus,
  updateOrderPaymentStatus,
  confirmOrder,
  createAdminOrder,
  deleteOrder,
  deleteReadyOrders,
} from '../services/orderService';
import { getAllProducts } from '../services/productService';
import { getActiveSpecialOffers } from '../services/offerService';
import { useAuth } from '../hooks/useAuth';
import { printOrderTicket } from '../utils/printer';
import { playLoudAlarm } from '../utils/soundUtils';
import { formatCurrency, formatNumber } from '../utils/formatCurrency';
import { isToday, timeAgo } from '../utils/formatDate';
import { calculateOrderProfit, isOrderPaid } from '../utils/calculateProfit';
import AdminHeader from '../components/AdminHeader';
import AdminNav from '../components/AdminNav';
import CategoryIcon from '../components/CategoryIcon';
import TransparentImg from '../components/TransparentImg';
import localSync, { SYNC_EVENTS } from '../services/localSync';
import {
  IoAdd,
  IoArrowForward,
  IoBagHandleOutline,
  IoCardOutline,
  IoCarOutline,
  IoCashOutline,
  IoCheckmarkCircleOutline,
  IoCheckmarkOutline,
  IoClose,
  IoDocumentTextOutline,
  IoFastFoodOutline,
  IoFilterOutline,
  IoList,
  IoLocationOutline,
  IoPersonOutline,
  IoReceiptOutline,
  IoRemove,
  IoReloadOutline,
  IoRestaurantOutline,
  IoSearch,
  IoShieldCheckmarkOutline,
  IoTimeOutline,
  IoTrashOutline,
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
  if (order.paymentMethod === 'ccp' || order.paymentMethod === 'card') return 'بطاقة';
  return 'نقداً';
}

function orderNumberLabel(order) {
  return order.orderNumber != null
    ? String(order.orderNumber).padStart(3, '0')
    : `#${order.id?.slice(-4)}`;
}

function orderTypeLabel(order) {
  if (order.orderType === 'delivery' || order.isDelivery) return order.driverNumber ? `توصيل · سائق ${order.driverNumber}` : 'توصيل';
  if (order.orderType === 'takeout') return order.takeoutNumber ? `سفري · زبون ${order.takeoutNumber}` : 'سفري';
  return order.tableNumber ? `طاولة ${order.tableNumber}` : 'داخل المطعم';
}

function displayStatus(order) {
  if (order.status === 'delivered') return 'delivered';
  if (order.status === 'cancelled') return 'cancelled';
  if (order.workerReady) return 'ready';
  if (order.status === 'preparing') return 'preparing';
  return 'pending';
}

function OrderSquare({ order, tone, onOpen }) {
  const ds = displayStatus(order);
  const config = statusConfig[ds] || statusConfig.pending;
  const paid = isOrderPaid(order);

  return (
    <button
      type="button"
      onClick={() => onOpen(order)}
      className={`admin-order-square ${tone}`}
      title="عرض تفاصيل الطلب"
    >
      <span className="admin-order-square-number">{orderNumberLabel(order)}</span>
      <span className="admin-order-square-total">{formatCurrency(order.totalPrice)}</span>
      <span className="admin-order-square-meta">{orderTypeLabel(order)}</span>
      <span className="admin-order-square-foot">
        <b style={{ color: config.color }}>{config.label}</b>
        <em>{paid ? 'خالصة' : 'غير خالصة'}</em>
      </span>
    </button>
  );
}

export default function AdminOrders() {
  const { userData } = useAuth();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [deletingReady, setDeletingReady] = useState(false);
  const [routingOrder, setRoutingOrder] = useState(null);
  const [panelType, setPanelType] = useState(null); // 'dine-in' | 'takeout' | 'delivery'
  const [newOrderContext, setNewOrderContext] = useState(null); // { orderType, tableNumber?, driverNumber?, customerName?, customerPhone? }
  const [driverPhoneStep, setDriverPhoneStep] = useState(null); // { driverNumber }
  const previousOrdersRef = useRef([]);
  const deletionTimers = useRef({});
  const printedReadyOrdersRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    const unsub = subscribeToAllOrders((data) => {
      // On first load, record existing ready orders to avoid reprint
      if (isFirstLoadRef.current && data.length > 0) {
        data.forEach((o) => {
          if (o.workerReady) {
            printedReadyOrdersRef.current.add(o.id);
          }
        });
        isFirstLoadRef.current = false;
      }

      // Check for any newly ready order to print automatically
      data.forEach((o) => {
        if (o.workerReady && !printedReadyOrdersRef.current.has(o.id)) {
          printedReadyOrdersRef.current.add(o.id);
          printOrderTicket(o, { type: 'admin' });
          toast.success(`تم طباعة تيكيت الإدارة للطلب #${o.id?.slice(-6)} تلقائياً! 🖨️`);
        }
      });

      setOrders(data);
      setLoading(false);

      const previousPending = previousOrdersRef.current.filter(o => o.status === 'pending');
      const currentPending = data.filter(o => o.status === 'pending');

      if (previousOrdersRef.current.length > 0 && currentPending.length > previousPending.length) {
        playLoudAlarm();
      }

      previousOrdersRef.current = data;
    });

    // استماع لتحديثات الشبكة المحلية (بدون إنترنت)
    const unsubLocal = localSync.on(SYNC_EVENTS.ORDER_UPDATED, () => {
      // فقط إذا Firebase غير متصل — الوصف يعتمد على offline cache
      toast('🔄 تحديث من الشبكة المحلية', { duration: 1500 });
    });
    const unsubNew = localSync.on(SYNC_EVENTS.ORDER_CREATED, () => {
      playLoudAlarm();
      toast('طلب جديد من الشبكة! 🔔', { duration: 3000 });
    });

    return () => { unsub(); unsubLocal(); unsubNew(); };
  }, []);

  // حذف تلقائي للطلبات الجاهزة بعد 3 دقائق
  useEffect(() => {
    const currentIds = new Set(orders.map(o => o.id));

    // إلغاء التوقيتات للطلبات التي لم تعد جاهزة أو محذوفة
    Object.keys(deletionTimers.current).forEach(id => {
      const order = orders.find(o => o.id === id);
      if (!order || displayStatus(order) !== 'ready') {
        clearTimeout(deletionTimers.current[id]);
        delete deletionTimers.current[id];
      }
    });

    // جدولة حذف الطلبات الجاهزة
    orders.forEach(order => {
      if (displayStatus(order) === 'ready' && !deletionTimers.current[order.id]) {
        deletionTimers.current[order.id] = setTimeout(async () => {
          try {
            await deleteOrder(order.id);
          } catch { /* silent */ }
          delete deletionTimers.current[order.id];
        }, 3 * 60 * 1000);
      }
    });
  }, [orders]);

  useEffect(() => () => Object.values(deletionTimers.current).forEach(clearTimeout), []);

  useEffect(() => {
    (async () => {
      try {
        setProducts(await getAllProducts());
        const activeOffers = await getActiveSpecialOffers();
        setOffers(activeOffers);
      } catch (err) {
        console.error('load products/offers error:', err);
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
      const orderId = await createAdminOrder({
        ...payload,
        customerId: userData?.uid || 'admin',
      });
      toast.success('تم إنشاء الطلب');
      setPanelType(null);
      // إشعار المطبخ بطلب جديد
      localSync.emit(SYNC_EVENTS.ORDER_CREATED, { source: 'admin' });
      return orderId;
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'تعذّر إنشاء الطلب');
      throw err;
    }
  }

  async function handleStatusChange(orderId, newStatus) {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success('تم تحديث حالة الطلب');
      setOrders(current => current.map(order => order.id === orderId ? { ...order, status: newStatus } : order));
      setSelected(current => current?.id === orderId ? { ...current, status: newStatus } : current);
      // إشعار المطبخ عبر الشبكة المحلية
      localSync.emit(SYNC_EVENTS.ORDER_UPDATED, { orderId, newStatus });
    } catch (error) {
      console.error(error);
      toast.error('تعذر تحديث الطلب');
    }
  }

  async function handlePaymentToggle(order, paid) {
    if (!order?.id) return;
    try {
      await updateOrderPaymentStatus(order.id, paid);
      const updates = {
        paymentStatus: paid ? 'paid' : 'unpaid',
        isPaid: paid,
      };
      setOrders(current => current.map(item => item.id === order.id ? { ...item, ...updates } : item));
      setSelected(current => current?.id === order.id ? { ...current, ...updates } : current);
      toast.success(paid ? 'تم تعليم الطلب كخالصة' : 'تم تعليم الطلب كغير خالصة');
      localSync.emit(SYNC_EVENTS.ORDER_UPDATED, { orderId: order.id, paymentStatus: updates.paymentStatus });
    } catch (error) {
      console.error(error);
      toast.error('تعذر تحديث حالة الدفع');
    }
  }

  async function handleDeleteOrder(orderId) {
    const ok = confirm('هل تريد حذف هذا الطلب نهائياً؟');
    if (!ok) return;
    try {
      await deleteOrder(orderId);
      if (selected?.id === orderId) setSelected(null);
      toast.success('تم حذف الطلب');
    } catch (err) {
      toast.error(err.message || 'تعذّر حذف الطلب');
    }
  }

  async function handleDeleteReadyOrders() {
    const ok = confirm('هل تريد حذف جميع الطلبات الجاهزة نهائياً؟');
    if (!ok) return;
    setDeletingReady(true);
    try {
      const count = await deleteReadyOrders();
      toast.success(`تم حذف ${count} طلب جاهز`);
    } catch (err) {
      toast.error(err.message || 'تعذّر حذف الطلبات الجاهزة');
    } finally {
      setDeletingReady(false);
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
      toast.success(`تمت إعادة التعيين: ${result.deletedOrders} طلب، وسيبدأ الترقيم من 1`);
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

  const paymentGroups = useMemo(() => ({
    paid: filteredOrders.filter(isOrderPaid),
    unpaid: filteredOrders.filter(order => !isOrderPaid(order)),
  }), [filteredOrders]);

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

        <section className="mb-4">
          <div className="ch-search-row" style={{ paddingTop: 0 }}>
            <label className="ch-search-box">
              <IoSearch size={20} className="ch-search-icon" />
              <input
                type="text"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="ابحث برقم الطلب أو اسم العميل أو الهاتف"
              />
            </label>
          </div>
        </section>

        <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setPanelType('dine-in')}
            className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-omega-orange to-omega-red px-5 text-sm font-black text-white shadow-lg shadow-omega-orange/25 active:scale-95"
          >
            <IoRestaurantOutline size={22} />
            طلبات داخل المطعم
          </button>
          <button
            type="button"
            onClick={() => setPanelType('takeout')}
            className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-500 to-emerald-700 px-5 text-sm font-black text-white shadow-lg shadow-emerald-500/25 active:scale-95"
          >
            <IoBagHandleOutline size={22} />
            طلبات يأخذها معه
          </button>
          <button
            type="button"
            onClick={() => setPanelType('delivery')}
            className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-blue-500 to-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-500/25 active:scale-95"
          >
            <IoCarOutline size={22} />
            طلبات التوصيل
          </button>
        </section>

        <section className="mb-4 grid gap-3 sm:grid-cols-3">
          <button className="admin-control flex min-h-12 items-center justify-center gap-2 px-5 text-sm font-black text-white">
            <IoFilterOutline className="text-omega-orange" size={25} />
            فلترة
          </button>

          <button
            type="button"
            onClick={handleDeleteReadyOrders}
            disabled={deletingReady}
            className="admin-control flex min-h-12 items-center justify-center gap-2 px-5 text-sm font-black text-emerald-400 disabled:opacity-60"
          >
            <IoTrashOutline size={20} />
            {deletingReady ? 'جاري الحذف...' : 'حذف الجاهزة'}
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

        <section className="admin-payment-board">
          <div className="admin-payment-heading">
            <div className="admin-payment-count paid">
              الخالصة: {formatNumber(paymentGroups.paid.length)}
            </div>
            <h2>مربعات الطلبات حسب الدفع</h2>
            <div className="admin-payment-count unpaid">
              غير الخالصة: {formatNumber(paymentGroups.unpaid.length)}
            </div>
          </div>

          {loading ? (
            <div className="admin-payment-split">
              <div className="admin-payment-column paid">
                {Array.from({ length: 6 }).map((__, index) => (
                  <div key={index} className="h-28 rounded-xl skeleton" />
                ))}
              </div>
              <div className="admin-payment-column unpaid">
                {Array.from({ length: 6 }).map((__, index) => (
                  <div key={index} className="h-28 rounded-xl skeleton" />
                ))}
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="admin-glass rounded-[1.55rem] p-10 text-center text-omega-text-muted">
              لا توجد طلبات مطابقة
            </div>
          ) : (
            <div className="admin-payment-split">
              <section className="admin-payment-column paid" dir="rtl">
                <header>
                  <span>خالصة</span>
                  <b>{formatNumber(paymentGroups.paid.length)}</b>
                </header>
                {paymentGroups.paid.length ? (
                  <div className="admin-order-square-grid">
                    {paymentGroups.paid.map(order => (
                      <OrderSquare key={order.id} order={order} tone="paid" onOpen={setSelected} />
                    ))}
                  </div>
                ) : (
                  <p className="admin-payment-empty">لا توجد طلبات خالصة</p>
                )}
              </section>

              <section className="admin-payment-column unpaid" dir="rtl">
                <header>
                  <span>غير خالصة</span>
                  <b>{formatNumber(paymentGroups.unpaid.length)}</b>
                </header>
                {paymentGroups.unpaid.length ? (
                  <div className="admin-order-square-grid">
                    {paymentGroups.unpaid.map(order => (
                      <OrderSquare key={order.id} order={order} tone="unpaid" onOpen={setSelected} />
                    ))}
                  </div>
                ) : (
                  <p className="admin-payment-empty">كل الطلبات خالصة</p>
                )}
              </section>
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

      {panelType && !newOrderContext && !driverPhoneStep && (
        <OrderTypePanel
          type={panelType}
          orders={orders}
          onClose={() => setPanelType(null)}
          onPickTable={(tableNumber) => setNewOrderContext({ orderType: 'table', tableNumber })}
          onPickTakeout={(takeoutNumber) => setNewOrderContext({ orderType: 'takeout', takeoutNumber })}
          onPickDriver={(driverNumber) => setDriverPhoneStep({ driverNumber })}
        />
      )}

      {driverPhoneStep && (
        <DriverCustomerForm
          driverNumber={driverPhoneStep.driverNumber}
          onClose={() => setDriverPhoneStep(null)}
          onSubmit={({ customerName, customerPhone }) => {
            setNewOrderContext({
              orderType: 'delivery',
              driverNumber: driverPhoneStep.driverNumber,
              customerName,
              customerPhone,
            });
            setDriverPhoneStep(null);
          }}
        />
      )}

      {newOrderContext && (
        <NewOrderModal
          products={products}
          offers={offers}
          context={newOrderContext}
          onClose={() => setNewOrderContext(null)}
          onSubmit={handleCreateAdminOrder}
        />
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setSelected(null)} aria-label="إغلاق" />
          <div className="admin-glass relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-[1.8rem] p-6">
            <div className="mb-5 flex items-start justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelected(null)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-omega-text-muted transition-transform active:scale-95"
                  aria-label="إغلاق"
                >
                  <IoClose size={22} />
                </button>
                <button
                  onClick={() => {
                    printOrderTicket(selected, { type: 'admin' });
                    toast.success('تم إرسال تيكيت الإدارة للطباعة! 🖨️');
                  }}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-omega-orange/30 bg-omega-orange/10 px-4 text-omega-orange transition-transform active:scale-95 text-sm font-black"
                  title="طباعة تيكيت الطلب"
                >
                  <IoReceiptOutline size={18} />
                  <span>طباعة تيكيت</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentToggle(selected, !isOrderPaid(selected))}
                  className={`flex h-11 items-center justify-center gap-1.5 rounded-2xl border px-4 text-sm font-black transition-transform active:scale-95 ${
                    isOrderPaid(selected)
                      ? 'border-red-500/35 bg-red-500/10 text-red-400'
                      : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400'
                  }`}
                  title="تغيير حالة الدفع"
                >
                  <IoCheckmarkCircleOutline size={18} />
                  <span>{isOrderPaid(selected) ? 'تعليم كغير خالصة' : 'تعليم كخالصة'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteOrder(selected.id)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-red-400 transition-transform active:scale-95"
                  title="حذف الطلب"
                  aria-label="حذف الطلب"
                >
                  <IoTrashOutline size={19} />
                </button>
              </div>
              <div className="text-right">
                <h3 className="text-2xl font-black text-white">
                  طلب رقم {selected.orderNumber != null ? String(selected.orderNumber).padStart(3, '0') : `#${selected.id?.slice(-6)}`}
                </h3>
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
                  <h4 className="font-black text-white">حالة الدفع</h4>
                  <IoCheckmarkCircleOutline className={isOrderPaid(selected) ? 'text-emerald-400' : 'text-red-400'} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={`inline-flex rounded-full border px-4 py-2 text-sm font-black ${
                      isOrderPaid(selected)
                        ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400'
                        : 'border-red-500/35 bg-red-500/10 text-red-400'
                    }`}
                  >
                    {isOrderPaid(selected) ? 'خالصة' : 'غير خالصة'}
                  </span>
                  <div className="text-right">
                    <p className="text-sm text-omega-text-muted">طريقة الدفع</p>
                    <p className="mt-1 text-lg font-black text-white">{paymentLabel(selected)}</p>
                  </div>
                </div>
              </div>

              <div className="admin-control rounded-[1.25rem] p-4">
                <div className="mb-3 flex items-center justify-end gap-2">
                  <h4 className="font-black text-white">المنتجات</h4>
                  <IoReceiptOutline className="text-omega-orange" />
                </div>
                <div className="space-y-2">
                  {(selected.items || []).map((item, index) => (
                    <div key={`${item.name}-${index}`} className="rounded-xl bg-white/[0.03] px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-white">{formatCurrency((item.price || 0) * (item.quantity || 1))}</span>
                        <span className="text-omega-text">
                          {item.type === 'offer' ? <b className="ml-2 rounded-full bg-omega-orange/10 px-2 py-0.5 text-[10px] text-omega-orange">عرض</b> : null}
                          {item.name}
                          <b className="mr-2 text-omega-orange">x{item.quantity}</b>
                        </span>
                      </div>
                      {item.type === 'offer' && item.components?.length > 0 && (
                        <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                          {item.components.map(component => (
                            <span key={component.productId} className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-bold text-omega-text-muted">
                              {component.quantity}x {component.name}
                            </span>
                          ))}
                        </div>
                      )}
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

/* ─── Order Type Panel: Tables / Takeout / Drivers ──────── */
const TABLES_COUNT = 10;
const DRIVERS_COUNT = 10;
const TAKEOUT_SLOTS = 10;

function OrderTypePanel({ type, orders, onClose, onPickTable, onPickTakeout, onPickDriver }) {
  // Compute counts from active orders
  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
  const tablesOccupied = new Set(
    activeOrders
      .filter(o => o.orderType === 'table' && o.tableNumber)
      .map(o => Number(o.tableNumber))
  );
  const driversBusy = new Set(
    activeOrders
      .filter(o => o.orderType === 'delivery' && o.driverNumber)
      .map(o => Number(o.driverNumber))
  );
  const takeoutSlots = new Set(
    activeOrders
      .filter(o => o.orderType === 'takeout' && o.takeoutNumber)
      .map(o => Number(o.takeoutNumber))
  );

  const title = {
    'dine-in': 'طلبات داخل المطعم',
    'takeout': 'طلبات يأخذها معه',
    'delivery': 'طلبات التوصيل',
  }[type];

  const subtitle = {
    'dine-in': `${TABLES_COUNT - tablesOccupied.size} طاولة فارغة من ${TABLES_COUNT}`,
    'takeout': `${TAKEOUT_SLOTS - takeoutSlots.size} زبون متاح من ${TAKEOUT_SLOTS}`,
    'delivery': `${DRIVERS_COUNT - driversBusy.size} سائق متاح من ${DRIVERS_COUNT}`,
  }[type];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-2xl rounded-t-[1.8rem] sm:rounded-3xl bg-white border border-gray-200 shadow-2xl max-h-[92vh] flex flex-col">
        {/* رأس */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0 border-b border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            <IoClose size={18} />
          </button>
          <div className="text-right">
            <h2 className="text-gray-900 text-lg font-black">{title}</h2>
            <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {type === 'dine-in' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: TABLES_COUNT }, (_, i) => i + 1).map(num => {
                const occupied = tablesOccupied.has(num);
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => !occupied && onPickTable(num)}
                    disabled={occupied}
                    className={`relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                      occupied
                        ? 'bg-red-50 border-red-200 cursor-not-allowed opacity-70'
                        : 'bg-white border-gray-200 hover:border-omega-orange hover:bg-omega-orange/5 active:scale-95'
                    }`}
                  >
                    <IoRestaurantOutline size={32} className={occupied ? 'text-red-400' : 'text-omega-orange'} />
                    <span className={`text-2xl font-black ${occupied ? 'text-red-500' : 'text-gray-900'}`}>
                      {num}
                    </span>
                    <span className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-black ${
                      occupied ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                    }`}>
                      {occupied ? 'مشغولة' : 'فارغة'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {type === 'takeout' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: TAKEOUT_SLOTS }, (_, i) => i + 1).map(num => {
                const occupied = takeoutSlots.has(num);
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => !occupied && onPickTakeout(num)}
                    disabled={occupied}
                    className={`relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                      occupied
                        ? 'bg-red-50 border-red-200 cursor-not-allowed opacity-70'
                        : 'bg-white border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 active:scale-95'
                    }`}
                  >
                    <IoBagHandleOutline size={32} className={occupied ? 'text-red-400' : 'text-emerald-500'} />
                    <span className={`text-base font-black ${occupied ? 'text-red-500' : 'text-gray-900'}`}>
                      زبون {num}
                    </span>
                    <span className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-black ${
                      occupied ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                    }`}>
                      {occupied ? 'قيد التحضير' : 'متاح'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {type === 'delivery' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: DRIVERS_COUNT }, (_, i) => i + 1).map(num => {
                const busy = driversBusy.has(num);
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => !busy && onPickDriver(num)}
                    disabled={busy}
                    className={`relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                      busy
                        ? 'bg-red-50 border-red-200 cursor-not-allowed opacity-70'
                        : 'bg-white border-gray-200 hover:border-blue-500 hover:bg-blue-50 active:scale-95'
                    }`}
                  >
                    <IoCarOutline size={32} className={busy ? 'text-red-400' : 'text-blue-500'} />
                    <span className={`text-base font-black ${busy ? 'text-red-500' : 'text-gray-900'}`}>
                      سائق {num}
                    </span>
                    <span className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-black ${
                      busy ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                    }`}>
                      {busy ? 'مشغول' : 'متاح'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Driver Customer Form (phone capture before new order) ── */
function DriverCustomerForm({ driverNumber, onClose, onSubmit }) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerPhone.trim()) {
      toast.error('أدخل رقم الهاتف');
      return;
    }
    onSubmit({ customerName: customerName.trim(), customerPhone: customerPhone.trim() });
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-t-[1.8rem] sm:rounded-3xl bg-white border border-gray-200 shadow-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            <IoClose size={18} />
          </button>
          <div className="text-right">
            <h2 className="text-gray-900 text-lg font-black">بيانات الزبون</h2>
            <p className="text-blue-500 text-xs mt-0.5 font-bold">سائق {driverNumber}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-right text-sm font-bold text-gray-700 mb-1.5">
              رقم الهاتف <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              placeholder="0555 555 555"
              dir="ltr"
              autoFocus
              className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-gray-900 text-base outline-none placeholder:text-gray-400 text-right focus:border-omega-orange/50 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-right text-sm font-bold text-gray-700 mb-1.5">
              اسم الزبون (اختياري)
            </label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="اسم الزبون"
              className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-gray-900 text-base outline-none placeholder:text-gray-400 text-right focus:border-omega-orange/50 focus:bg-white transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          className="mt-5 w-full rounded-2xl bg-gradient-to-l from-blue-500 to-blue-700 py-3.5 text-white font-black text-sm shadow-lg shadow-blue-500/25 active:scale-[0.98]"
        >
          متابعة إلى الطلب ←
        </button>
      </form>
    </div>
  );
}

/* ─── Destination Picker (Table vs Delivery only) ───────── */
function DestinationPicker({ destination, setDestination, light = false }) {
  const activeCls = 'bg-omega-orange/15 border-omega-orange/50 text-omega-orange';
  const inactiveCls = light
    ? 'bg-gray-50 border-gray-200 text-gray-600 hover:text-gray-900'
    : 'bg-white/[0.03] border-white/10 text-omega-text-muted hover:text-white';
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => setDestination('table')}
        className={`rounded-xl p-4 text-sm font-black border transition-all ${
          destination === 'table' ? activeCls : inactiveCls
        }`}
      >
        <IoRestaurantOutline className="mx-auto mb-1.5" size={24} />
        طلب طاولة (داخل المطعم)
      </button>
      <button
        type="button"
        onClick={() => setDestination('delivery')}
        className={`rounded-xl p-4 text-sm font-black border transition-all ${
          destination === 'delivery' ? activeCls : inactiveCls
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
            <h2 className="text-white text-lg font-black">
              تأكيد الطلب {order.orderNumber != null ? `رقم ${String(order.orderNumber).padStart(3, '0')}` : `#${order.id?.slice(-4)}`}
            </h2>
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
          className="mt-5 w-full rounded-2xl bg-gradient-to-l from-omega-orange to-omega-red py-5 text-white font-black text-lg shadow-lg shadow-omega-orange/30 disabled:opacity-60 active:scale-[0.98]"
        >
          {submitting ? '...جاري التأكيد' : 'تأكيد الطلب وإرساله للمطبخ ✓'}
        </button>
      </div>
    </div>
  );
}

/* ─── Fallback Images for Categories ──────────────────────── */
function fallbackImg(cat) {
  return {
    burger: '/burger-classic.png',
    pizza:  '/pizza-pepperoni.png',
    tacos:  '/tacos-wrap.png',
    drinks: '/drink-cola.png',
    appetizers: '/fried-chicken.png',
    desserts: '/appetizer-gratin.png',
    sofli: '/sofli.png',
    box: '/burger-classic.png',
  }[cat] || '/burger-classic.png';
}

/* ─── Product Tile (grid layout) ─────────────────────────── */
function ProductTile({ p, cart, addItem, removeItem, activeSize = 'all' }) {
  const hasSizes = p.hasSizes && p.sizes?.length > 0;

  if (hasSizes) {
    const sizesToShow = (activeSize === 'all' ? p.sizes : p.sizes.filter(sz => sz.label === activeSize))
      .filter(sz => sz.price && Number(sz.price) > 0);
    if (sizesToShow.length === 0) return null;
    
    // If only one size visible (when filter is L/XL/XXL), treat as single tile
    if (sizesToShow.length === 1) {
      const sz = sizesToShow[0];
      const key = `${p.id}__${sz.label}`;
      const qty = cart[key]?.qty || 0;
      return (
        <button
          type="button"
          onClick={() => addItem(p.id, sz.label, sz.price)}
          className={`relative rounded-2xl border-2 p-2.5 text-right transition-all ${
            qty > 0 ? 'border-omega-orange bg-omega-orange/[0.07]' : 'border-gray-200 bg-white hover:border-omega-orange/40'
          }`}
        >
          <div className="aspect-[4/3] rounded-xl bg-gray-50 mb-2 overflow-hidden flex items-center justify-center">
            <TransparentImg src={p.image || fallbackImg(p.category)} alt={p.name} className="w-full h-full object-cover" />
          </div>
          <p className="text-gray-900 font-bold text-sm truncate leading-snug">{p.name}</p>
          <p className="text-gray-500 text-[11px] font-black mt-0.5">{sz.label}</p>
          <p className="text-omega-orange text-sm font-black mt-1">{formatCurrency(sz.price)}</p>
          {qty > 0 && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-omega-orange text-white rounded-full px-1.5 py-0.5">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeItem(key); }}
                className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded-full"
              ><IoRemove size={13} /></button>
              <span className="font-black text-xs min-w-[1ch] text-center">{qty}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); addItem(p.id, sz.label, sz.price); }}
                className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded-full"
              ><IoAdd size={13} /></button>
            </div>
          )}
        </button>
      );
    }
    
    // Multiple sizes — show as a card with size chips
    return (
      <div 
        onClick={() => {
          if (sizesToShow.length > 0) {
            const firstSz = sizesToShow[0];
            addItem(p.id, firstSz.label, firstSz.price);
          }
        }}
        className="rounded-2xl border-2 border-gray-200 bg-white p-3 cursor-pointer hover:border-omega-orange/40 transition-all flex flex-col justify-between"
      >
        <div>
          <div className="aspect-[4/3] rounded-xl bg-gray-50 mb-2 overflow-hidden flex items-center justify-center">
            <TransparentImg src={p.image || fallbackImg(p.category)} alt={p.name} className="w-full h-full object-cover" />
          </div>
          <p className="text-gray-900 font-bold text-sm truncate leading-snug text-right mb-3">{p.name}</p>
        </div>
        <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
          {sizesToShow.map(sz => {
            const key = `${p.id}__${sz.label}`;
            const qty = cart[key]?.qty || 0;
            return (
              <button
                key={sz.label}
                type="button"
                onClick={(e) => { e.stopPropagation(); addItem(p.id, sz.label, sz.price); }}
                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-all active:scale-[0.98] ${
                  qty > 0 
                    ? 'border-omega-orange bg-omega-orange/10 font-bold text-omega-orange' 
                    : 'border-gray-200 bg-gray-50 hover:bg-white text-gray-700'
                }`}
              >
                <span className="text-omega-orange text-sm font-black">{formatCurrency(sz.price)}</span>
                <span className="flex items-center gap-1.5">
                  {qty > 0 && (
                    <>
                      <span className="text-gray-700 font-black text-sm">{qty}×</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); removeItem(key); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); removeItem(key); } }}
                        className="w-5 h-5 rounded bg-gray-200 text-gray-700 flex items-center justify-center cursor-pointer transition-transform active:scale-90"
                      ><IoRemove size={12} /></span>
                    </>
                  )}
                  <span className="text-gray-900 text-xs font-black">{sz.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const qty = cart[p.id]?.qty || 0;
  return (
    <button
      type="button"
      onClick={() => addItem(p.id)}
      className={`relative rounded-2xl border-2 p-2.5 text-right transition-all ${
        qty > 0 ? 'border-omega-orange bg-omega-orange/[0.07]' : 'border-gray-200 bg-white hover:border-omega-orange/40'
      }`}
    >
      <div className="aspect-[4/3] rounded-xl bg-gray-50 mb-2 overflow-hidden flex items-center justify-center">
        <TransparentImg src={p.image || fallbackImg(p.category)} alt={p.name} className="w-full h-full object-cover" />
      </div>
      <p className="text-gray-900 font-bold text-sm truncate leading-snug">{p.name}</p>
      <p className="text-omega-orange text-sm font-black mt-1">{formatCurrency(p.price)}</p>
      {qty > 0 && (
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-omega-orange text-white rounded-full px-1.5 py-0.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeItem(p.id); }}
            className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded-full"
          ><IoRemove size={13} /></button>
          <span className="font-black text-xs min-w-[1ch] text-center">{qty}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); addItem(p.id); }}
            className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded-full"
          ><IoAdd size={13} /></button>
        </div>
      )}
    </button>
  );
}

function isSellableProduct(product) {
  if (product.hasSizes && product.sizes?.length > 0) return product.sizes.some(sz => Number(sz.price || 0) > 0);
  return Number(product.price || 0) > 0;
}

/* ─── New Walk-in Order Modal ───────────────────────────── */
function NewOrderModal({ products, offers = [], context, onClose, onSubmit }) {
  const [cart, setCart] = useState({});
  const [customerName, setCustomerName] = useState(context?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(context?.customerPhone || '');
  const [customerNote, setCustomerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState('category');
  const [activeCat, setActiveCat] = useState(null);
  const [activeSize, setActiveSize] = useState(null);
  const [createdOrderId, setCreatedOrderId] = useState(null);
  const [createdPaymentMethod, setCreatedPaymentMethod] = useState(null);

  const SINGLE_SIZE_VALUE = '__single_size__';
  const MENU_CATEGORY_ORDER = ['pizza', 'tacos', 'sofli', 'box', 'drinks'];
  const CAT_META = {
    pizza:      { label: 'بيتزا', icon: IoFastFoodOutline },
    burger:     { label: 'برغر', icon: IoFastFoodOutline },
    tacos:      { label: 'تاكوس', icon: IoFastFoodOutline },
    sofli:      { label: 'سوفلي', icon: IoFastFoodOutline },
    box:        { label: 'box', icon: IoBagHandleOutline },
    drinks:     { label: 'مشروبات', icon: IoFastFoodOutline },
    appetizers: { label: 'مقبلات', icon: IoFastFoodOutline },
    desserts:   { label: 'حلويات', icon: IoFastFoodOutline },
  };

  const offerToProduct = (offer) => ({
    id: `offer_${offer.id}`,
    type: 'offer',
    offerId: offer.id,
    name: offer.title,
    description: offer.description || (offer.items || []).map(item => `${item.quantity || 1} ${item.productName || item.name}`).join(' + '),
    price: Number(offer.offerPrice || 0),
    costPrice: 0,
    image: offer.image || offer.items?.find(item => item.image)?.image || '/burger-classic.png',
    category: 'box',
    isAvailable: offer.isActive !== false,
    hasSizes: false,
    sizes: [],
    components: offer.items || [],
  });

  const sellableSizes = (product) => (
    product.hasSizes && Array.isArray(product.sizes)
      ? product.sizes.filter(size => Number(size?.price || 0) > 0)
      : []
  );

  const allProducts = useMemo(() => ([
    ...products,
    ...offers.map(offerToProduct),
  ]), [products, offers]);

  const availableProducts = useMemo(
    () => allProducts.filter(p => p.isAvailable !== false && isSellableProduct(p)),
    [allProducts]
  );

  const existingCats = useMemo(() => {
    const cats = Object.keys(CAT_META).filter(cat => availableProducts.some(product => product.category === cat));
    const priorityCats = MENU_CATEGORY_ORDER.filter(cat => cats.includes(cat));
    const otherCats = cats.filter(cat => !MENU_CATEGORY_ORDER.includes(cat));
    return [...priorityCats, ...otherCats];
  }, [availableProducts]);

  const selectedCategoryProducts = useMemo(() => (
    activeCat ? availableProducts.filter(product => product.category === activeCat) : []
  ), [activeCat, availableProducts]);

  const availableSizes = useMemo(() => {
    if (!activeCat) return [];

    const sizeOptions = new Map();
    let hasSingleSizeProducts = false;

    selectedCategoryProducts.forEach((product) => {
      const sizes = sellableSizes(product);
      if (sizes.length) {
        sizes.forEach((size) => {
          if (size?.label && !sizeOptions.has(size.label)) {
            sizeOptions.set(size.label, { label: size.label, value: size.label });
          }
        });
      } else {
        hasSingleSizeProducts = true;
      }
    });

    const options = [...sizeOptions.values()];
    if (hasSingleSizeProducts || !options.length) {
      options.push({ label: 'حجم واحد', value: SINGLE_SIZE_VALUE });
    }
    return options;
  }, [activeCat, selectedCategoryProducts]);

  const filteredProducts = useMemo(() => {
    if (!activeCat || !activeSize) return [];
    return selectedCategoryProducts.filter((product) => {
      const sizes = sellableSizes(product);
      if (activeSize === SINGLE_SIZE_VALUE) return !sizes.length;
      return sizes.some(size => size.label === activeSize);
    });
  }, [activeCat, activeSize, selectedCategoryProducts]);

  const addItem = (id, sizeLabel, sizePrice) => {
    if (sizeLabel !== undefined) {
      const key = `${id}__${sizeLabel}`;
      setCart(c => ({ ...c, [key]: { qty: (c[key]?.qty || 0) + 1, productId: id, sizeLabel, sizePrice } }));
    } else {
      setCart(c => ({ ...c, [id]: { qty: (c[id]?.qty || 0) + 1, productId: id } }));
    }
  };
  const removeItem = (key) => setCart(c => {
    const n = { ...c };
    if (n[key]?.qty > 1) n[key] = { ...n[key], qty: n[key].qty - 1 };
    else delete n[key];
    return n;
  });

  const cartEntries = Object.entries(cart).map(([key, entry]) => {
    const p = allProducts.find(x => x.id === entry.productId);
    if (!p) return null;
    const price = entry.sizePrice !== undefined ? entry.sizePrice : (p.price || 0);
    const label = entry.sizeLabel ? ` (${entry.sizeLabel})` : '';
    return { key, product: p, quantity: entry.qty, price, label, selectedSize: entry.sizeLabel || null };
  }).filter(Boolean);

  const totalPrice = cartEntries.reduce((s, e) => s + (e.price * e.quantity), 0);
  const itemsCount = cartEntries.reduce((s, e) => s + e.quantity, 0);

  const orderType = context?.orderType || 'table';
  const headerInfo = (() => {
    if (orderType === 'table') return { label: `أكل في المطعم · طاولة ${context?.tableNumber || '—'}`, icon: IoRestaurantOutline };
    if (orderType === 'takeout') return { label: `سفري · زبون ${context?.takeoutNumber || '—'}`, icon: IoBagHandleOutline };
    if (orderType === 'delivery') return { label: `توصيل · سائق ${context?.driverNumber || '—'}`, icon: IoCarOutline };
    return { label: 'طلب جديد', icon: IoBagHandleOutline };
  })();
  const HeaderIcon = headerInfo.icon;

  const stepLabel = {
    category: 'خطوة 1 من 5',
    size: 'خطوة 2 من 5',
    product: 'خطوة 3 من 5',
    summary: 'خطوة 4 من 5',
    payment: 'خطوة 5 من 5',
    success: 'تم الطلب',
  }[phase];

  const screenTitle = {
    category: ['اختر ', 'نوع الطبق'],
    size: ['اختر ', `حجم ${CAT_META[activeCat]?.label || 'الطبق'}`],
    product: ['اختر ', `طبق ${CAT_META[activeCat]?.label || ''}`],
    summary: ['ملخص ', 'طلبك'],
    payment: ['اختر طريقة ', 'الدفع'],
  }[phase] || ['تم ', 'الطلب'];

  const goBack = () => {
    if (submitting) return;
    if (phase === 'category') onClose();
    else if (phase === 'size') setPhase('category');
    else if (phase === 'product') setPhase('size');
    else if (phase === 'summary') setPhase('product');
    else if (phase === 'payment') setPhase('summary');
    else onClose();
  };

  const selectCategory = (cat) => {
    setActiveCat(cat);
    setActiveSize(null);
    setPhase('size');
  };

  const selectSize = (sizeValue) => {
    setActiveSize(sizeValue);
    setPhase('product');
  };

  const getProductSize = (product) => {
    const sizes = sellableSizes(product);
    if (!sizes.length || activeSize === SINGLE_SIZE_VALUE) return null;
    return sizes.find(size => size.label === activeSize) || null;
  };

  const addProductFromMenu = (product) => {
    const size = getProductSize(product);
    const price = Number(size?.price ?? product.price ?? 0);
    if (price <= 0) return;

    if (size) addItem(product.id, size.label, price);
    else addItem(product.id);
  };

  const handleSubmit = async (paymentMethod) => {
    if (!cartEntries.length) {
      toast.error('أضف منتجات أولاً');
      return;
    }
    if (orderType === 'delivery' && !customerPhone.trim()) {
      toast.error('رقم هاتف الزبون مطلوب');
      return;
    }
    setSubmitting(true);

    const items = cartEntries.map(({ product, quantity, price, selectedSize }) => {
      if (product.type === 'offer') {
        return {
          productId: product.id,
          offerId: product.offerId,
          name: product.name,
          type: 'offer',
          price,
          costPrice: 0,
          image: product.image || '',
          category: 'offers',
          quantity,
          components: product.components || [],
        };
      }

      return {
        productId: product.id,
        name: product.name,
        selectedSize,
        price,
        costPrice: product.costPrice || 0,
        image: product.image || '',
        category: product.category || '',
        quantity,
      };
    });

    const defaultName = {
      table: `طاولة ${context?.tableNumber || ''}`.trim(),
      takeout: `زبون ${context?.takeoutNumber || ''}`.trim(),
      delivery: 'زبون توصيل',
    }[orderType] || 'زبون';
    const isPaid = paymentMethod === 'ccp';

    const payload = {
      items,
      totalPrice,
      customerName: customerName.trim() || defaultName,
      customerPhone: customerPhone.trim(),
      customerNote,
      note: customerNote,
      isDelivery: orderType === 'delivery',
      orderType,
      tableNumber: orderType === 'table' ? context?.tableNumber : null,
      takeoutNumber: orderType === 'takeout' ? context?.takeoutNumber : null,
      driverNumber: orderType === 'delivery' ? context?.driverNumber : null,
      paymentMethod,
      paymentStatus: isPaid ? 'paid' : 'unpaid',
      isPaid,
    };

    try {
      const orderId = await onSubmit(payload);
      setCreatedOrderId(orderId);
      setCreatedPaymentMethod(paymentMethod);
      setPhase('success');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const Head = ({ compact = false, icon: Icon = HeaderIcon }) => (
    <header className={`kiosk-screen-head ${compact ? 'compact' : ''}`}>
      <div className="kiosk-logo">
        <img src="/logo.png?v=2" alt="OMEGA Pizza" />
      </div>
      <h1 className="kiosk-screen-title">
        {screenTitle[0]}
        <strong>{screenTitle[1]}</strong>
      </h1>
      <p className="kiosk-screen-subtitle">{headerInfo.label}</p>
      {Icon && (
        <span className="kiosk-title-icon" aria-hidden="true">
          <Icon />
        </span>
      )}
    </header>
  );

  const TrustLine = ({ text = 'نظام الطلب الإداري بنفس مراحل الكشك' }) => (
    <div className="kiosk-trust-line">
      <IoShieldCheckmarkOutline aria-hidden="true" />
      <span><strong>100%</strong> {text}</span>
    </div>
  );

  const renderCategory = () => (
    <>
      <Head compact icon={IoFastFoodOutline} />
      <div className="kiosk-menu-progress" aria-label="مراحل اختيار الطلب">
        <span className="active">1. النوع</span>
        <span>2. الحجم</span>
        <span>3. الطبق</span>
      </div>
      {existingCats.length ? (
        <div className="kiosk-category-grid admin-kiosk-choice-grid">
          {existingCats.map((cat) => {
            const meta = CAT_META[cat];
            const Icon = meta?.icon || IoFastFoodOutline;
            return (
              <button key={cat} type="button" className="kiosk-category-card" onClick={() => selectCategory(cat)}>
                <span className="kiosk-category-icon"><Icon aria-hidden="true" /></span>
                <strong>{meta?.label || cat}</strong>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="kiosk-loading-card">
          <strong>لا توجد منتجات متاحة حالياً</strong>
          <span>يمكنك تحديث المنتجات من لوحة المنيو.</span>
        </div>
      )}
      <TrustLine />
    </>
  );

  const renderSize = () => (
    <>
      <Head compact icon={IoFastFoodOutline} />
      <div className="kiosk-menu-progress" aria-label="مراحل اختيار الطلب">
        <span>1. النوع</span>
        <span className="active">2. الحجم</span>
        <span>3. الطبق</span>
      </div>
      <div className="kiosk-size-grid admin-kiosk-choice-grid">
        {availableSizes.map(size => (
          <button key={size.value} type="button" className="kiosk-size-card" onClick={() => selectSize(size.value)}>
            <IoFastFoodOutline aria-hidden="true" />
            <strong>{size.label}</strong>
          </button>
        ))}
      </div>
      <TrustLine />
    </>
  );

  const renderProducts = () => (
    <>
      <Head compact icon={IoReceiptOutline} />
      <div className="kiosk-menu-progress" aria-label="مراحل اختيار الطلب">
        <span>1. النوع</span>
        <span>2. الحجم</span>
        <span className="active">3. الطبق</span>
      </div>

      <div className="kiosk-product-grid admin-kiosk-product-grid">
        {filteredProducts.map((product) => {
          const size = getProductSize(product);
          const price = Number(size?.price ?? product.price ?? 0);
          const key = size ? `${product.id}__${size.label}` : product.id;
          const qty = cart[key]?.qty || 0;
          return (
            <article className="kiosk-product-card" key={key}>
              <div className="kiosk-product-image-wrap">
                <TransparentImg
                  src={product.image || fallbackImg(product.category)}
                  alt={product.name}
                  className="kiosk-product-img"
                />
                {qty > 0 && <span className="admin-kiosk-qty">{qty}x</span>}
              </div>
              <div className="kiosk-product-body">
                <h2>{product.name}</h2>
                <p>{product.description || CAT_META[product.category]?.label || 'وجبة من OMEGA'}</p>
                {size && <span className="kiosk-product-size">{size.label}</span>}
                <strong>{formatCurrency(price)}</strong>
              </div>
              <div className="kiosk-product-actions">
                <button type="button" onClick={() => addProductFromMenu(product)}>
                  <IoAdd aria-hidden="true" />
                  <span>إضافة إلى الطلب</span>
                  <small>{formatCurrency(price)}</small>
                </button>
                {qty > 0 && (
                  <button type="button" className="admin-kiosk-remove-btn" onClick={() => removeItem(key)}>
                    <IoRemove aria-hidden="true" />
                    <span>إنقاص</span>
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="kiosk-action-row admin-kiosk-sticky-actions">
        <button type="button" className="kiosk-white-action" onClick={() => setPhase('category')}>
          اختيار صنف آخر
        </button>
        <button
          type="button"
          className="kiosk-main-btn"
          onClick={() => setPhase('summary')}
          disabled={!itemsCount}
        >
          <IoReceiptOutline aria-hidden="true" />
          <span>إتمام الطلب</span>
        </button>
      </div>
    </>
  );

  const renderSummary = () => (
    <>
      <Head icon={IoBagHandleOutline} />
      <div className="kiosk-summary-list admin-kiosk-summary-list">
        {cartEntries.map((item) => (
          <article className="kiosk-summary-item" key={item.key}>
            <img src={item.product.image || fallbackImg(item.product.category)} alt="" />
            <div>
              <h2>{item.product.name}{item.label}</h2>
              <span>{CAT_META[item.product.category]?.label || 'OMEGA'}</span>
            </div>
            <b>{item.quantity}x</b>
            <strong>{formatCurrency(item.price * item.quantity)}</strong>
            <button
              type="button"
              className="kiosk-summary-remove"
              onClick={() => removeItem(item.key)}
              aria-label={item.quantity > 1 ? 'إنقاص الكمية' : 'حذف الطبق'}
            >
              {item.quantity > 1 ? <IoRemove aria-hidden="true" /> : <IoTrashOutline aria-hidden="true" />}
            </button>
          </article>
        ))}
      </div>

      <div className="kiosk-summary-box admin-kiosk-customer-box">
        <div>
          <span>نوع الطلب</span>
          <strong>{headerInfo.label}</strong>
        </div>
        {(orderType === 'delivery' || orderType === 'takeout') && (
          <div className="admin-kiosk-fields">
            <input
              type="text"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              placeholder={orderType === 'delivery' ? 'الهاتف *' : 'الهاتف (اختياري)'}
              dir="ltr"
              className="admin-kiosk-input"
            />
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="اسم الزبون (اختياري)"
              className="admin-kiosk-input"
            />
          </div>
        )}
        <textarea
          value={customerNote}
          onChange={e => setCustomerNote(e.target.value)}
          placeholder="ملاحظة (اختياري)"
          rows={2}
          className="admin-kiosk-input admin-kiosk-note"
        />
      </div>

      <div className="kiosk-total-card">
        <span>الإجمالي</span>
        <strong>{formatCurrency(totalPrice)}</strong>
      </div>

      <div className="kiosk-action-row">
        <button
          type="button"
          className="kiosk-white-action"
          onClick={() => {
            setActiveCat(null);
            setActiveSize(null);
            setPhase('category');
          }}
        >
          اختيار طلب آخر
        </button>
        <button type="button" className="kiosk-main-btn" onClick={() => setPhase('payment')} disabled={!itemsCount}>
          <span>متابعة للدفع</span>
        </button>
      </div>
      <TrustLine text="راجع الطلب قبل اختيار طريقة الدفع" />
    </>
  );

  const renderPayment = () => (
    <>
      <Head icon={IoCardOutline} />
      <div className="kiosk-option-grid payment">
        <button
          type="button"
          className="kiosk-option-card admin-kiosk-pay-card"
          onClick={() => handleSubmit('cash')}
          disabled={submitting}
        >
          <div className="kiosk-icon-orb"><IoCashOutline aria-hidden="true" /></div>
          <h2>الدفع نقداً</h2>
          <p>يُنشأ الطلب كغير خالصة حتى يتم تحصيل المبلغ.</p>
          <span className="kiosk-main-btn gold">{submitting ? 'جاري تسجيل الطلب...' : 'اختر هذا الخيار'}</span>
        </button>
        <button
          type="button"
          className="kiosk-option-card admin-kiosk-pay-card"
          onClick={() => handleSubmit('ccp')}
          disabled={submitting}
        >
          <div className="kiosk-icon-orb"><IoCardOutline aria-hidden="true" /></div>
          <h2>الدفع بالبطاقة</h2>
          <p>يُنشأ الطلب كخالصة ويدخل مباشرة في سجل الطلبات.</p>
          <span className="kiosk-main-btn">{submitting ? 'جاري تسجيل الطلب...' : 'اختر هذا الخيار'}</span>
        </button>
      </div>
      <div className="kiosk-secure-note">
        <IoShieldCheckmarkOutline aria-hidden="true" />
        <span>طريقة الدفع ستظهر في مربعات الخالصة وغير الخالصة.</span>
      </div>
    </>
  );

  const renderSuccess = () => (
    <div className="kiosk-success admin-kiosk-success">
      <div className="kiosk-success-check">
        <IoCheckmarkOutline aria-hidden="true" />
      </div>
      <h1>تم إنشاء الطلب بنجاح!</h1>
      <p><strong>OMEGA</strong> تم إرسال الطلب للمطبخ</p>
      <span>{createdPaymentMethod === 'ccp' ? 'الطلب خالصة.' : 'الطلب غير خالصة حتى يتم الدفع.'}</span>
      <div className="kiosk-order-number">
        <span>معرّف الطلب</span>
        <strong>{createdOrderId ? `#${String(createdOrderId).slice(-6)}` : '...'}</strong>
      </div>
      <button type="button" className="kiosk-main-btn kiosk-home-btn" onClick={onClose}>
        <IoReceiptOutline aria-hidden="true" />
        <span>العودة للطلبات</span>
      </button>
    </div>
  );

  const renderContent = () => {
    if (phase === 'category') return renderCategory();
    if (phase === 'size') return renderSize();
    if (phase === 'product') return renderProducts();
    if (phase === 'summary') return renderSummary();
    if (phase === 'payment') return renderPayment();
    return renderSuccess();
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="kiosk-v2 admin-kiosk-order-modal" dir="rtl">
        <div className="kiosk-decor" aria-hidden="true">
          <span className="kiosk-tomato kiosk-tomato-a" />
          <span className="kiosk-tomato kiosk-tomato-b" />
          <span className="kiosk-tomato kiosk-tomato-c" />
          <span className="kiosk-leaf kiosk-leaf-a" />
          <span className="kiosk-leaf kiosk-leaf-b" />
          <span className="kiosk-leaf kiosk-leaf-c" />
          <span className="kiosk-bokeh kiosk-bokeh-a" />
          <span className="kiosk-bokeh kiosk-bokeh-b" />
          <span className="kiosk-bokeh kiosk-bokeh-c" />
        </div>

        <main className="kiosk-stage admin-kiosk-stage">
          <section className={`kiosk-phone kiosk-phone-wide admin-kiosk-phone ${phase === 'success' ? 'admin-kiosk-success-phone' : ''}`}>
            {phase !== 'success' && (
              <div className="kiosk-topbar">
                <button type="button" className="kiosk-back-btn" onClick={goBack}>
                  <IoArrowForward aria-hidden="true" />
                  <span>{phase === 'category' ? 'إغلاق' : 'رجوع'}</span>
                </button>
                <span className="kiosk-step-pill">{stepLabel}</span>
              </div>
            )}

            {renderContent()}
          </section>
        </main>
      </div>
    </div>
  );
}
