import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { subscribeToOrder } from '../services/orderService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatTime, timeAgo } from '../utils/formatDate';
import CustomerNav from '../components/CustomerNav';
import {
  IoArchiveOutline,
  IoArrowBack,
  IoBicycleOutline,
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
  { key: 'accepted_by_driver', label: 'جاهز للتوصيل', icon: IoArchiveOutline },
  { key: 'on_the_way', label: 'خرج للتوصيل', icon: IoBicycleOutline },
  { key: 'delivered', label: 'تم التسليم', icon: IoCheckmarkCircleOutline },
];

const statusIndex = {
  pending: 0,
  preparing: 1,
  accepted_by_driver: 2,
  on_the_way: 3,
  delivered: 4,
};

const statusLabel = {
  pending: 'جديد',
  preparing: 'قيد التجهيز',
  accepted_by_driver: 'جاهز',
  on_the_way: 'للتوصيل',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

export default function TrackOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!id) return undefined;
    return subscribeToOrder(id, setOrder);
  }, [id]);

  const currentStep = statusIndex[order?.status] ?? 0;
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
            <img src="/logo.png" alt="OMEGA" />
          </div>
        </header>

        <section className="omega-card mb-4 p-4">
          <div className="flex items-start justify-between gap-4">
            <span className={`omega-status-badge ${cancelled ? 'red' : order.status === 'delivered' ? 'green' : 'soft'}`}>
              {statusLabel[order.status] || order.status}
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
              <p className="text-sm font-bold text-omega-text-muted">عدد المنتجات</p>
              <strong className="text-2xl font-black text-omega-text">{order.items?.length || 0}</strong>
            </div>
          </div>
        </section>

        {!cancelled ? (
          <section className="omega-card mb-4 p-4">
            <div className="omega-section-label mt-0">
              <span>مسار الطلب</span>
              <IoCheckmarkCircleOutline />
            </div>
            <div className="grid grid-cols-5 gap-2">
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
              <strong className="text-omega-text">{item.quantity}x {item.name}</strong>
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
            <span>معلومات التوصيل</span>
            <IoPersonOutline />
          </div>
          <div className="space-y-3 text-right">
            <p className="font-black text-omega-text">{order.customerName}</p>
            <p className="omega-meta-line justify-end" dir="ltr">
              {order.customerPhone}
              <IoCallOutline />
            </p>
            <p className="omega-meta-line justify-end">
              {order.customerAddress}
              <IoLocationOutline />
            </p>
          </div>
        </section>
      </main>
      <CustomerNav />
    </div>
  );
}
