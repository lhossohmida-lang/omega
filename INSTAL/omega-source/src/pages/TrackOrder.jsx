import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { subscribeToOrder } from '../services/orderService';
import { addTrackedOrderId } from '../utils/guestStorage';
import { formatCurrency } from '../utils/formatCurrency';
import { formatTime, timeAgo } from '../utils/formatDate';
import CustomerNav from '../components/CustomerNav';
import {
  IoArrowBack,
  IoBagHandleOutline,
  IoCallOutline,
  IoCheckmarkCircleOutline,
  IoClipboardOutline,
  IoLocationOutline,
  IoPersonOutline,
  IoRestaurantOutline,
} from 'react-icons/io5';

const steps = [
  { key: 'pending', label: 'استلام الطلب', icon: IoClipboardOutline },
  { key: 'preparing', label: 'تحضير الأصناف', icon: IoRestaurantOutline },
  { key: 'ready', label: 'جاهز', icon: IoCheckmarkCircleOutline },
  { key: 'delivered', label: 'تم التسليم', icon: IoBagHandleOutline },
];

function currentStepIndex(order) {
  if (!order) return 0;
  if (order.status === 'delivered') return 3;
  if (order.workerReady) return 2;
  if (order.status === 'preparing') return 1;
  return 0;
}

const statusLabel = {
  pending: 'جديد',
  preparing: 'قيد التجهيز',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

export default function TrackOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!id) return undefined;
    // إذا فتح المستخدم رابط الطلب مباشرة، نضيفه إلى قائمة التتبع المحلية
    addTrackedOrderId(id);
    return subscribeToOrder(id, setOrder);
  }, [id]);

  const currentStep = currentStepIndex(order);
  const subtotal = useMemo(
    () => (order?.items || []).reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0),
    [order]
  );

  if (!order) {
    return (
      <div className="omega-app-shell no-bottom-nav grid place-items-center">
        <div className="skeleton h-16 w-16 rounded-full" />
      </div>
    );
  }

  const cancelled = order.status === 'cancelled';
  const displayStatus = order.workerReady && order.status !== 'delivered'
    ? 'جاهز'
    : (statusLabel[order.status] || order.status);

  return (
    <div className="omega-app-shell">
      <main className="omega-app-main">
        <header className="omega-mobile-header">
          <button type="button" onClick={() => navigate(-1)} className="omega-icon-button red" aria-label="رجوع">
            <IoArrowBack size={25} />
          </button>
          <div className="omega-mobile-title">
            <h1>تتبع الطلب</h1>
            <p>{timeAgo(order.createdAt)}</p>
          </div>
          <div className="omega-mini-logo">
            <img src="/logo.png?v=2" alt="OMEGA" />
          </div>
        </header>

        <section className="omega-card mb-4 p-4">
          <div className="flex items-start justify-between gap-4">
            <span className={`omega-status-badge ${cancelled ? 'red' : order.status === 'delivered' || order.workerReady ? 'green' : 'soft'}`}>
              {displayStatus}
            </span>
            <div className="text-right">
              <strong className="omega-order-id">#{order.id?.slice(-6)}</strong>
              <p className="mt-1 text-sm font-bold text-omega-text-muted">تم الطلب {formatTime(order.createdAt)}</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-omega-text-muted">الإجمالي</p>
              <strong className="text-3xl font-black text-omega-red">{formatCurrency(order.totalPrice)}</strong>
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-omega-text-muted">نوع الطلب</p>
              <span
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-black border"
                style={
                  order.isDelivery
                    ? { color: '#16a34a', background: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.4)' }
                    : { color: '#dc2626', background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.4)' }
                }
              >
                {order.isDelivery ? '🚗 توصيل' : '🍽️ داخل المطعم'}
              </span>
            </div>
          </div>
        </section>

        {!cancelled ? (
          <section className="omega-card mb-4 p-4">
            <div className="omega-section-label mt-0">
              <span>مسار الطلب</span>
              <IoCheckmarkCircleOutline />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const active = index <= currentStep;
                return (
                  <div key={step.key} className="text-center">
                    <div className={`mx-auto grid h-11 w-11 place-items-center rounded-full border-2 ${active ? 'border-omega-red bg-red-50 text-omega-red' : 'border-gray-200 text-gray-300'}`}>
                      <Icon size={20} />
                    </div>
                    <p className={`mt-2 text-[0.68rem] font-black ${active ? 'text-omega-red' : 'text-omega-text-muted'}`}>{step.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="omega-progress mt-5">
              <span style={{ width: `${Math.min(100, (currentStep / (steps.length - 1)) * 100)}%` }} />
            </div>
          </section>
        ) : null}

        <section className="omega-card mb-4 p-4">
          <div className="omega-section-label mt-0">
            <span>تفاصيل الطلب</span>
            <IoClipboardOutline />
          </div>
          {(order.items || []).map((item, index) => (
            <div key={`${item.name}-${index}`} className="omega-item-row">
              <span className="font-bold text-omega-text-muted">{formatCurrency((item.price || 0) * (item.quantity || 1))}</span>
              <div className="text-right">
                <strong className="text-omega-text">
                  {item.quantity}x {item.name}
                  {item.type === 'offer' ? <span className="mr-2 rounded-full bg-omega-orange/10 px-2 py-0.5 text-[10px] text-omega-orange">عرض خاص</span> : null}
                </strong>
                {item.type === 'offer' && item.components?.length > 0 && (
                  <p className="mt-1 text-[11px] font-bold text-omega-text-muted">
                    {item.components.map(component => `${component.quantity}x ${component.name}`).join(' + ')}
                  </p>
                )}
              </div>
            </div>
          ))}
          <div className="mt-3 border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between text-sm font-bold text-omega-text-muted">
              <span>{formatCurrency(subtotal)}</span>
              <span>المجموع الفرعي</span>
            </div>
            {order.deliveryFee ? (
              <div className="mt-2 flex items-center justify-between text-sm font-bold text-omega-text-muted">
                <span>{formatCurrency(order.deliveryFee)}</span>
                <span>رسوم التوصيل</span>
              </div>
            ) : null}
            <div className="mt-3 flex items-center justify-between">
              <strong className="text-2xl font-black text-omega-red">{formatCurrency(order.totalPrice)}</strong>
              <strong className="text-xl font-black text-omega-text">الإجمالي</strong>
            </div>
          </div>
        </section>

        <section className="omega-card mb-4 p-4">
          <div className="omega-section-label mt-0">
            <span>{order.isDelivery ? 'معلومات التوصيل' : 'معلومات الزبون'}</span>
            <IoPersonOutline />
          </div>
          <div className="space-y-3 text-right">
            <p className="font-black text-omega-text">{order.customerName}</p>
            <p className="omega-meta-line justify-end" dir="ltr">
              {order.customerPhone}
              <IoCallOutline />
            </p>
            {order.isDelivery && order.customerAddress ? (
              <p className="omega-meta-line justify-end">
                {order.customerAddress}
                <IoLocationOutline />
              </p>
            ) : null}
          </div>
        </section>
      </main>
      <CustomerNav />
    </div>
  );
}
