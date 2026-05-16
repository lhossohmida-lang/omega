import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder } from '../services/orderService';
import { formatCurrency } from '../utils/formatCurrency';
import {
  getGuestId,
  getCustomerInfo,
  saveCustomerInfo,
  addTrackedOrderId,
} from '../utils/guestStorage';
import CustomerNav from '../components/CustomerNav';
import {
  IoArrowForward, IoCheckmarkCircle, IoLocationOutline,
  IoCallOutline, IoChatbubbleEllipsesOutline, IoBagHandleOutline,
  IoPersonOutline, IoChevronBack, IoReceiptOutline,
} from 'react-icons/io5';
import toast from 'react-hot-toast';

function getCart() { try { return JSON.parse(localStorage.getItem('omega_cart') || '[]'); } catch { return []; } }
function clearCart() { localStorage.setItem('omega_cart', '[]'); }

export default function Checkout() {
  const navigate = useNavigate();
  const savedInfo = getCustomerInfo();
  const [form, setForm] = useState({
    customerName: savedInfo.name || '',
    customerPhone: savedInfo.phone || '',
    customerAddress: savedInfo.address || '',
    customerNote: '',
  });
  const [loading, setLoading] = useState(false);
  const [orderCreated, setOrderCreated] = useState(null);
  // طلب طاولة (داخل المطعم) أو توصيل
  const [orderType, setOrderType] = useState('delivery');

  const cart = getCart();
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const isDelivery = orderType === 'delivery';
  const deliveryFee = isDelivery ? 150 : 0;
  const finalTotal = total + deliveryFee;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerName?.trim()) { toast.error('يرجى إدخال الاسم'); return; }
    if (!form.customerPhone?.trim()) { toast.error('يرجى إدخال رقم الهاتف'); return; }
    if (isDelivery && !form.customerAddress?.trim()) { toast.error('يرجى إدخال عنوان التوصيل'); return; }
    if (cart.length === 0) { toast.error('السلة فارغة'); return; }

    setLoading(true);
    try {
      const orderId = await createOrder({
        customerId: getGuestId(),
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerAddress: isDelivery ? form.customerAddress : 'داخل المطعم',
        customerNote: form.customerNote,
        items: cart,
        totalPrice: finalTotal,
        orderType,
        deliveryFee,
      });

      // حفظ معلومات الزبون للاستخدام لاحقاً
      saveCustomerInfo({
        name: form.customerName,
        phone: form.customerPhone,
        address: form.customerAddress,
      });

      // تخزين الطلب محلياً لتتبعه لاحقاً
      addTrackedOrderId(orderId);

      clearCart();
      setOrderCreated(orderId);
      toast.success('تم إرسال طلبك بنجاح!');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'حدث خطأ في إرسال الطلب');
    }
    setLoading(false);
  };

  if (orderCreated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-omega-orange/10" />
        <div className="relative text-center animate-slide-up max-w-sm">
          <div className="relative inline-block mb-5">
            <div className="absolute inset-0 bg-emerald-500/30 blur-3xl rounded-full" />
            <div className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/40">
              <IoCheckmarkCircle className="text-white" size={56} />
            </div>
          </div>
          <h2 className="text-3xl font-black text-white mb-2">تم إرسال طلبك! 🎉</h2>
          <p className="text-omega-text-muted text-sm mb-1">رقم الطلب</p>
          <p className="gradient-text text-2xl font-black mb-4">#{orderCreated.slice(-6).toUpperCase()}</p>
          <p className="text-omega-text-muted text-sm mb-6">احتفظ برقم الطلب لتتبّع حالة التحضير</p>
          <div className="space-y-2">
            <button onClick={() => navigate(`/track/${orderCreated}`)}
              className="btn-primary w-full">
              تتبع الطلب
            </button>
            <button onClick={() => navigate('/')}
              className="w-full py-3 rounded-2xl bg-white/[0.05] border border-white/10 text-white font-bold hover:bg-white/[0.08] transition-colors">
              العودة للرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-40 relative overflow-hidden bg-omega-black">

      {/* Sticky header */}
      <div className="sticky top-0 z-30 backdrop-blur-2xl bg-omega-dark/80 border-b border-white/8">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors active:scale-95">
            <IoArrowForward size={20} />
          </button>
          <div>
            <h1 className="text-white font-black text-lg">إتمام الطلب</h1>
            <p className="text-omega-text-dim text-[11px]">{itemCount} منتج • {formatCurrency(total)}</p>
          </div>
        </div>
      </div>

      <div className="relative max-w-lg mx-auto px-4 pt-4 space-y-3.5">
        {/* ===== Order summary ===== */}
        <div className="rounded-xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 backdrop-blur p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-black text-base flex items-center gap-2">
              <IoReceiptOutline className="text-omega-orange" size={18} /> ملخص الطلب
            </h3>
            <span className="text-omega-text-muted text-xs">{itemCount} منتج</span>
          </div>

          <div className="space-y-2.5 mb-4">
            {cart.map(item => (
              <div key={item.productId} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="w-12 h-12 rounded-xl bg-omega-gray/40 overflow-hidden flex items-center justify-center text-2xl flex-shrink-0">
                  {item.image
                    ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    : '🍽️'
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate">{item.name}</p>
                  <p className="text-omega-text-dim text-[11px]">{formatCurrency(item.price)} × {item.quantity}</p>
                </div>
                <span className="text-omega-orange font-black text-sm flex-shrink-0">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-sm text-white/70">
              <span>المجموع</span>
              <span>{formatCurrency(total)}</span>
            </div>
            {isDelivery && (
              <div className="flex items-center justify-between text-sm text-omega-orange">
                <span>رسوم التوصيل</span>
                <span>+ {formatCurrency(deliveryFee)}</span>
              </div>
            )}
            <div className="bg-gradient-to-l from-omega-orange/15 to-transparent border border-omega-orange/25 rounded-xl p-3.5 flex items-center justify-between mt-2">
              <span className="text-white font-black text-base">الإجمالي</span>
              <span className="gradient-text font-black text-2xl">{formatCurrency(finalTotal)}</span>
            </div>
          </div>
        </div>

        {/* ===== Order Type ===== */}
        <div className="rounded-xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 backdrop-blur p-4 animate-fade-in" style={{ animationDelay: '40ms' }}>
          <h3 className="text-white font-black text-base mb-3">نوع الطلب</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setOrderType('delivery')}
              className={`py-3 rounded-xl font-bold transition-all ${isDelivery ? 'bg-omega-orange text-white ring-2 ring-omega-orange/50 shadow-lg shadow-omega-orange/20' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
            >
              🚗 توصيل (150 د.ج)
            </button>
            <button
              onClick={() => setOrderType('table')}
              className={`py-3 rounded-xl font-bold transition-all ${!isDelivery ? 'bg-omega-orange text-white ring-2 ring-omega-orange/50 shadow-lg shadow-omega-orange/20' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
            >
              🍽️ في المطعم
            </button>
          </div>
        </div>

        {/* ===== Customer info ===== */}
        <form onSubmit={handleSubmit}
          className="rounded-xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 backdrop-blur p-4 space-y-3.5 animate-fade-in"
          style={{ animationDelay: '80ms' }}
        >
          <h3 className="text-white font-black text-base flex items-center gap-2 mb-1">
            <IoLocationOutline className="text-omega-orange" size={18} /> معلومات الاتصال
          </h3>

          <div>
            <label className="text-omega-text-muted text-[12px] block mb-1.5 mr-1 flex items-center gap-1.5">
              <IoPersonOutline size={13} /> الاسم *
            </label>
            <input type="text" name="customerName" value={form.customerName} onChange={handleChange}
              placeholder="اسمك"
              className="w-full px-4 py-3.5 rounded-2xl bg-omega-dark/60 border border-white/10 text-white text-sm placeholder-omega-text-dim focus:outline-none focus:border-omega-orange/50 focus:bg-omega-dark/80 transition-all" />
          </div>

          <div>
            <label className="text-omega-text-muted text-[12px] block mb-1.5 mr-1 flex items-center gap-1.5">
              <IoCallOutline size={13} /> رقم الهاتف *
            </label>
            <input type="tel" name="customerPhone" value={form.customerPhone} onChange={handleChange}
              placeholder="0555 12 34 56" dir="ltr"
              className="w-full px-4 py-3.5 rounded-2xl bg-omega-dark/60 border border-white/10 text-white text-sm placeholder-omega-text-dim focus:outline-none focus:border-omega-orange/50 focus:bg-omega-dark/80 transition-all" />
          </div>

          {isDelivery && (
            <div>
              <label className="text-omega-text-muted text-[12px] block mb-1.5 mr-1 flex items-center gap-1.5">
                <IoLocationOutline size={13} /> عنوان التوصيل *
              </label>
              <input type="text" name="customerAddress" value={form.customerAddress} onChange={handleChange}
                placeholder="الحي، الشارع، رقم العمارة..."
                className="w-full px-4 py-3.5 rounded-2xl bg-omega-dark/60 border border-white/10 text-white text-sm placeholder-omega-text-dim focus:outline-none focus:border-omega-orange/50 focus:bg-omega-dark/80 transition-all" />
              <p className="text-omega-text-dim text-[10px] mt-1.5 mr-1">كن دقيقاً ليصل الطلب بسرعة</p>
            </div>
          )}

          <div>
            <label className="text-omega-text-muted text-[12px] block mb-1.5 mr-1 flex items-center gap-1.5">
              <IoChatbubbleEllipsesOutline size={13} /> ملاحظة (اختياري)
            </label>
            <textarea name="customerNote" value={form.customerNote} onChange={handleChange} rows="2"
              placeholder="مثال: بدون بصل، الطابق الثالث..."
              className="w-full px-4 py-3.5 rounded-2xl bg-omega-dark/60 border border-white/10 text-white text-sm placeholder-omega-text-dim focus:outline-none focus:border-omega-orange/50 focus:bg-omega-dark/80 transition-all resize-none" />
          </div>
        </form>
      </div>

      <div className="fixed bottom-24 left-3 right-3 z-40 max-w-lg mx-auto">
        <div className="bg-omega-dark/95 backdrop-blur-2xl border border-white/10 rounded-xl p-2 flex items-center gap-2 shadow-2xl shadow-black/80">
          <div className="flex items-center gap-2 px-3">
            <IoBagHandleOutline className="text-omega-orange" size={22} />
            <div>
              <p className="text-omega-text-dim text-[10px] leading-tight">الإجمالي</p>
              <p className="text-white font-black text-sm leading-tight">{formatCurrency(finalTotal)}</p>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-gradient-to-l from-omega-orange via-omega-orange-dark to-omega-red text-white font-black text-sm rounded-xl py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-omega-orange/35 active:scale-95 transition-transform disabled:opacity-60"
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <>
                  <span>اطلب الآن</span>
                  <IoChevronBack size={16} />
                </>
            }
          </button>
        </div>
      </div>

      <CustomerNav />
    </div>
  );
}
