import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subscribeToOrder } from '../services/orderService';
import { formatCurrency } from '../utils/formatCurrency';
import { timeAgo } from '../utils/formatDate';
import CustomerNav from '../components/CustomerNav';
import { IoArrowForward, IoCheckmarkCircle, IoTime, IoCar, IoRestaurant, IoRocket } from 'react-icons/io5';

const statusSteps = [
  { key: 'pending', label: 'تم إرسال الطلب', icon: IoTime, color: 'text-yellow-500' },
  { key: 'accepted_by_driver', label: 'السائق قبل الطلب', icon: IoCar, color: 'text-blue-500' },
  { key: 'preparing', label: 'يتم التحضير', icon: IoRestaurant, color: 'text-orange-500' },
  { key: 'on_the_way', label: 'في الطريق', icon: IoRocket, color: 'text-purple-500' },
  { key: 'delivered', label: 'تم التوصيل', icon: IoCheckmarkCircle, color: 'text-green-500' },
];

export default function TrackOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToOrder(id, setOrder);
    return () => unsub();
  }, [id]);

  if (!order) return (
    <div className="min-h-screen bg-omega-dark flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-omega-orange border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const currentStepIdx = statusSteps.findIndex(s => s.key === order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-omega-dark pb-safe">
      <div className="sticky top-0 z-30 glass">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-omega-text-muted hover:text-white"><IoArrowForward size={22} /></button>
          <h1 className="text-lg font-bold text-white">تتبع الطلب</h1>
          <span className="text-omega-text-muted text-xs mr-auto">#{id?.slice(-6)}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-6 space-y-4">
        {isCancelled ? (
          <div className="glass rounded-2xl p-6 text-center animate-fade-in">
            <div className="text-4xl mb-3">❌</div>
            <h3 className="text-omega-red font-bold text-lg mb-2">تم إلغاء الطلب</h3>
            <p className="text-omega-text-muted text-sm">{timeAgo(order.cancelledAt)}</p>
          </div>
        ) : (
          /* خطوات التتبع */
          <div className="glass rounded-2xl p-5 animate-slide-up">
            <h3 className="text-white font-bold mb-6">حالة الطلب</h3>
            <div className="space-y-0">
              {statusSteps.map((step, idx) => {
                const isCompleted = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const Icon = step.icon;

                return (
                  <div key={step.key} className="flex gap-4">
                    {/* الخط والأيقونة */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                        isCurrent ? 'bg-omega-orange/20 ring-2 ring-omega-orange scale-110' :
                        isCompleted ? 'bg-omega-success/20' : 'bg-omega-gray/50'
                      }`}>
                        <Icon size={18} className={isCurrent ? 'text-omega-orange' : isCompleted ? 'text-omega-success' : 'text-omega-text-muted'} />
                      </div>
                      {idx < statusSteps.length - 1 && (
                        <div className={`w-0.5 h-12 transition-all ${isCompleted ? 'bg-omega-success/30' : 'bg-omega-gray/30'}`} />
                      )}
                    </div>
                    {/* النص */}
                    <div className="pt-2 pb-6">
                      <p className={`font-bold text-sm ${isCurrent ? 'text-omega-orange' : isCompleted ? 'text-white' : 'text-omega-text-muted'}`}>
                        {step.label}
                      </p>
                      {isCurrent && <p className="text-omega-text-muted text-xs mt-0.5">الحالة الحالية</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* تفاصيل الطلب */}
        <div className="glass rounded-2xl p-4">
          <h3 className="text-white font-bold mb-3">تفاصيل الطلب</h3>
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-omega-text text-sm">×{item.quantity} {item.name}</span>
              <span className="text-omega-orange text-sm font-bold">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-white/10 mt-2 pt-3 flex justify-between">
            <span className="text-white font-bold">الإجمالي</span>
            <span className="text-omega-orange font-black">{formatCurrency(order.totalPrice)}</span>
          </div>
        </div>

        {/* معلومات السائق */}
        {order.driverName && (
          <div className="glass rounded-2xl p-4 animate-fade-in">
            <h3 className="text-white font-bold mb-2">السائق</h3>
            <p className="text-omega-text text-sm">🚗 {order.driverName}</p>
            <p className="text-omega-text-muted text-sm mt-1">📞 {order.driverPhone}</p>
          </div>
        )}
      </div>
      <CustomerNav />
    </div>
  );
}
