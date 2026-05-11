import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createOrder } from '../services/orderService';
import { formatCurrency } from '../utils/formatCurrency';
import CustomerNav from '../components/CustomerNav';
import { IoArrowForward, IoCheckmarkCircle, IoLocation, IoCall, IoChatbubble } from 'react-icons/io5';
import toast from 'react-hot-toast';

function getCart() { try { return JSON.parse(localStorage.getItem('omega_cart') || '[]'); } catch { return []; } }
function clearCart() { localStorage.setItem('omega_cart', '[]'); }

export default function Checkout() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    customerName: userData?.name || '',
    customerPhone: userData?.phone || '',
    customerAddress: '',
    customerNote: '',
  });
  const [loading, setLoading] = useState(false);
  const [orderCreated, setOrderCreated] = useState(null);

  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerAddress) {
      toast.error('يرجى إدخال العنوان');
      return;
    }
    if (cart.length === 0) {
      toast.error('السلة فارغة');
      return;
    }
    setLoading(true);
    try {
      const orderId = await createOrder({
        customerId: userData.uid,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerAddress: form.customerAddress,
        customerNote: form.customerNote,
        items: cart,
        totalPrice: total,
      });
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
      <div className="min-h-screen bg-omega-dark flex items-center justify-center p-4">
        <div className="text-center animate-slide-up max-w-sm">
          <div className="w-20 h-20 mx-auto rounded-full bg-omega-success/20 flex items-center justify-center mb-4">
            <IoCheckmarkCircle className="text-omega-success" size={48} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">تم إرسال طلبك! 🎉</h2>
          <p className="text-omega-text-muted text-sm mb-2">رقم الطلب: #{orderCreated.slice(-6)}</p>
          <p className="text-omega-text-muted text-sm mb-6">سيتم إعلامك عندما يقبل السائق طلبك</p>
          <div className="space-y-3">
            <button onClick={() => navigate(`/track/${orderCreated}`)}
              className="w-full py-3 rounded-xl bg-omega-orange text-white font-bold hover:bg-omega-orange-light transition-colors">
              تتبع الطلب
            </button>
            <button onClick={() => navigate('/')}
              className="w-full py-3 rounded-xl bg-omega-gray text-white font-medium hover:bg-omega-gray-light transition-colors">
              العودة للرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-omega-dark pb-safe">
      <div className="sticky top-0 z-30 glass">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-omega-text-muted hover:text-white transition-colors">
            <IoArrowForward size={22} />
          </button>
          <h1 className="text-lg font-bold text-white">إتمام الطلب</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4 space-y-4">
        {/* ملخص الطلب */}
        <div className="glass rounded-2xl p-4">
          <h3 className="text-white font-bold mb-3">ملخص الطلب ({cart.length} منتج)</h3>
          {cart.map(item => (
            <div key={item.productId} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-omega-text-muted text-sm">×{item.quantity}</span>
                <span className="text-white text-sm">{item.name}</span>
              </div>
              <span className="text-omega-orange text-sm font-bold">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-white/10 mt-2 pt-3 flex justify-between">
            <span className="text-white font-bold">الإجمالي</span>
            <span className="text-omega-orange font-black text-lg">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* معلومات التوصيل */}
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-4 space-y-4">
          <h3 className="text-white font-bold">معلومات التوصيل</h3>
          
          <div>
            <label className="flex items-center gap-2 text-sm text-omega-text-muted mb-2">
              <IoCall size={14} /> رقم الهاتف
            </label>
            <input type="tel" name="customerPhone" value={form.customerPhone} onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-omega-dark/50 border border-white/10 text-white text-sm focus:outline-none focus:border-omega-orange/50 transition-all"
              placeholder="0555123456" dir="ltr" />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-omega-text-muted mb-2">
              <IoLocation size={14} /> العنوان *
            </label>
            <input type="text" name="customerAddress" value={form.customerAddress} onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-omega-dark/50 border border-white/10 text-white text-sm focus:outline-none focus:border-omega-orange/50 transition-all"
              placeholder="حي، شارع، رقم العمارة..." />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-omega-text-muted mb-2">
              <IoChatbubble size={14} /> ملاحظة (اختياري)
            </label>
            <textarea name="customerNote" value={form.customerNote} onChange={handleChange} rows="2"
              className="w-full px-4 py-3 rounded-xl bg-omega-dark/50 border border-white/10 text-white text-sm focus:outline-none focus:border-omega-orange/50 transition-all resize-none"
              placeholder="مثال: بدون بصل، الطابق الثالث..." />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-l from-omega-orange to-omega-orange-dark text-white font-bold hover:shadow-lg hover:shadow-omega-orange/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>اطلب الآن • {formatCurrency(total)}</span>}
          </button>
        </form>
      </div>
      <CustomerNav />
    </div>
  );
}
