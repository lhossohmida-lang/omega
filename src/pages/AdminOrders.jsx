import { useEffect, useMemo, useState } from 'react';
import { getAllOrders, updateOrderStatus } from '../services/orderService';
import { formatCurrency, formatNumber } from '../utils/formatCurrency';
import { isToday, timeAgo } from '../utils/formatDate';
import { calculateOrderProfit } from '../utils/calculateProfit';
import AdminHeader from '../components/AdminHeader';
import AdminNav from '../components/AdminNav';
import {
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
  IoPersonOutline,
  IoReceiptOutline,
  IoSearch,
  IoTimeOutline,
} from 'react-icons/io5';
import toast from 'react-hot-toast';

const statusConfig = {
  all: { label: 'الكل', icon: IoList, color: '#ff6b00', bg: 'rgba(255,107,0,0.15)' },
  pending: { label: 'جديد', icon: IoTimeOutline, color: '#e53935', bg: 'rgba(229,57,53,0.14)' },
  preparing: { label: 'قيد التحضير', icon: IoFastFoodOutline, color: '#ff8c33', bg: 'rgba(255,107,0,0.15)' },
  accepted_by_driver: { label: 'جاهز', icon: IoCheckmarkCircleOutline, color: '#22c55e', bg: 'rgba(34,197,94,0.13)' },
  on_the_way: { label: 'في الطريق', icon: IoCarOutline, color: '#3b82f6', bg: 'rgba(59,130,246,0.13)' },
  delivered: { label: 'تم التسليم', icon: IoCarOutline, color: '#8e8e93', bg: 'rgba(255,255,255,0.08)' },
  cancelled: { label: 'ملغي', icon: IoClose, color: '#e53935', bg: 'rgba(229,57,53,0.12)' },
};

function getTime(timestamp) {
  if (!timestamp) return 0;
  if (timestamp.toMillis) return timestamp.toMillis();
  if (timestamp.seconds) return timestamp.seconds * 1000;
  return new Date(timestamp).getTime() || 0;
}

function paymentLabel(order) {
  return order.paymentMethod === 'card' ? 'بطاقة' : 'نقداً';
}

function nextStatus(status) {
  if (status === 'pending') return { key: 'preparing', label: 'تحضير', icon: IoFastFoodOutline };
  if (status === 'preparing') return { key: 'accepted_by_driver', label: 'جاهز', icon: IoCheckmarkCircleOutline };
  if (status === 'accepted_by_driver' || status === 'on_the_way') return { key: 'delivered', label: 'تسليم', icon: IoCarOutline };
  return null;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setOrders(await getAllOrders());
    } catch (error) {
      console.error(error);
      toast.error('تعذر جلب الطلبات');
    } finally {
      setLoading(false);
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

  const filteredOrders = useMemo(() => {
    const value = search.trim().toLowerCase();
    return orders.filter(order => {
      if (filter !== 'all' && order.status !== filter) return false;
      if (!value) return true;
      return order.id?.toLowerCase().includes(value)
        || order.customerName?.toLowerCase().includes(value)
        || order.customerPhone?.includes(value);
    });
  }, [orders, filter, search]);

  const counts = useMemo(() => ({
    all: orders.length,
    pending: orders.filter(order => order.status === 'pending').length,
    preparing: orders.filter(order => order.status === 'preparing').length,
    accepted_by_driver: orders.filter(order => order.status === 'accepted_by_driver').length,
    on_the_way: orders.filter(order => order.status === 'on_the_way').length,
    delivered: orders.filter(order => order.status === 'delivered').length,
    cancelled: orders.filter(order => order.status === 'cancelled').length,
    today: orders.filter(order => isToday(order.createdAt)).length,
  }), [orders]);

  const summaryCards = [
    { label: 'طلبات اليوم', value: counts.today, icon: IoDocumentTextOutline, hint: 'عن أمس' },
    { label: 'قيد التحضير', value: counts.preparing, icon: IoFastFoodOutline, hint: 'نشطة الآن' },
    { label: 'جاهزة للتسليم', value: counts.accepted_by_driver + counts.on_the_way, icon: IoCheckmarkCircleOutline, hint: 'تحتاج سائق' },
    { label: 'تم التسليم', value: counts.delivered, icon: IoCarOutline, hint: 'مكتملة' },
  ];

  return (
    <div className="admin-page">
      <AdminNav />

      <main className="admin-container">
        <AdminHeader title="الطلبات" subtitle="إدارة ومتابعة جميع طلبات المطعم" />

        <section className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="admin-control flex min-h-16 items-center gap-3 rounded-[1.35rem] px-5">
            <IoSearch className="text-omega-text-dim" size={26} />
            <input
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="ابحث برقم الطلب أو اسم العميل أو الهاتف"
              className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-omega-text-dim"
            />
          </label>

          <button className="admin-control flex min-h-16 items-center justify-center gap-3 rounded-[1.35rem] px-6 text-base font-black text-white">
            <IoFilterOutline className="text-omega-orange" size={25} />
            فلترة
          </button>
        </section>

        <section className="mb-5 grid grid-cols-5 gap-2 sm:gap-3">
          {['all', 'pending', 'preparing', 'accepted_by_driver', 'delivered'].map(key => {
            const config = statusConfig[key];
            const Icon = config.icon;
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className="admin-control flex min-w-0 flex-col items-center justify-center gap-1 rounded-[1.2rem] px-1.5 py-3 transition-all"
                style={active ? { borderColor: config.color, boxShadow: `0 0 26px -16px ${config.color}` } : undefined}
              >
                <Icon size={20} style={{ color: active ? config.color : '#8e8e93' }} />
                <p className="truncate text-[11px] font-black sm:text-xs" style={{ color: active ? config.color : '#e6e6e6' }}>{config.label}</p>
                <p className="text-[10px] text-omega-text-muted">{formatNumber(counts[key] || 0)}</p>
              </button>
            );
          })}
        </section>

        <section className="admin-glass mb-6 grid grid-cols-2 gap-3 rounded-[1.55rem] p-4 lg:grid-cols-4">
          {summaryCards.map(({ label, value, icon: Icon, hint }) => (
            <div key={label} className="rounded-[1.25rem] border border-white/8 bg-white/[0.025] p-4 text-center">
              <div className="mb-3 flex items-center justify-center gap-2 text-white">
                <Icon className="text-omega-orange" size={23} />
                <span className="font-bold">{label}</span>
              </div>
              <p className="text-3xl font-black text-white">{formatNumber(value)}</p>
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
                const config = statusConfig[order.status] || statusConfig.pending;
                const ActionIcon = nextStatus(order.status)?.icon;
                return (
                  <article key={order.id} className="admin-glass rounded-[1.35rem] p-4">
                    <div className="grid gap-4 lg:grid-cols-[1.1fr_1.25fr_1fr_1.1fr] lg:items-center">
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
                            className="flex h-12 w-12 items-center justify-center rounded-xl border border-omega-orange/35 bg-omega-orange/8 text-omega-orange transition-transform active:scale-95"
                            aria-label="عرض الطلب"
                          >
                            <IoEyeOutline size={22} />
                          </button>
                          {ActionIcon && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(order.id, nextStatus(order.status).key)}
                              className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 transition-transform active:scale-95"
                              aria-label={nextStatus(order.status).label}
                            >
                              <ActionIcon size={21} />
                            </button>
                          )}
                          <button className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-omega-text-muted">
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
                {selected.customerAddress && (
                  <p className="mt-2 flex items-start justify-end gap-2 text-right text-sm text-omega-text-muted">
                    {selected.customerAddress}
                    <IoLocationOutline className="mt-1 shrink-0" />
                  </p>
                )}
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
                  {['pending', 'preparing', 'accepted_by_driver', 'on_the_way', 'delivered', 'cancelled'].map(status => {
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
