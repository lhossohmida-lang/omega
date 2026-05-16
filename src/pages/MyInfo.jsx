import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomerInfo, saveCustomerInfo } from '../utils/guestStorage';
import CustomerNav from '../components/CustomerNav';
import {
  IoArrowBack,
  IoPersonOutline,
  IoCallOutline,
  IoLocationOutline,
  IoCheckmarkCircleOutline,
  IoTrashOutline,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5';
import toast from 'react-hot-toast';

// صفحة معلومات الزبون — اختيارية، تُحفظ محلياً لتعبئة الـ checkout تلقائياً.
export default function MyInfo() {
  const navigate = useNavigate();
  const saved = getCustomerInfo();
  const [form, setForm] = useState({
    name: saved.name || '',
    phone: saved.phone || '',
    address: saved.address || '',
  });
  const [savedAt, setSavedAt] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = (e) => {
    e.preventDefault();
    saveCustomerInfo({
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
    });
    setSavedAt(Date.now());
    toast.success('تم حفظ معلوماتك ✓');
  };

  const handleClear = () => {
    if (!confirm('سيتم حذف معلوماتك المحفوظة من هذا الجهاز. متابعة؟')) return;
    saveCustomerInfo({});
    setForm({ name: '', phone: '', address: '' });
    toast('تم المسح', { icon: '🗑️' });
  };

  const hasAny = form.name || form.phone || form.address;

  return (
    <div className="min-h-screen pb-32 bg-omega-black">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-omega-dark/70 border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
            <IoArrowBack size={20} />
          </button>
          <div className="text-right">
            <h1 className="text-lg font-black text-white">معلوماتي</h1>
            <p className="text-omega-text-dim text-[11px]">للاستخدام عند الطلب</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-omega-orange/15 border border-omega-orange/30 flex items-center justify-center text-omega-orange">
            <IoPersonOutline size={20} />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4 space-y-3.5">
        {/* Privacy note */}
        <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-3.5 flex items-start gap-2.5">
          <IoShieldCheckmarkOutline className="text-emerald-400 mt-0.5 flex-shrink-0" size={18} />
          <div>
            <p className="text-emerald-300 font-bold text-sm">معلوماتك تبقى على جهازك</p>
            <p className="text-emerald-200/70 text-xs mt-1">
              نحفظها محلياً لتعبئة الطلب تلقائياً. الحقول كلها اختيارية ولا تُرسَل إلا مع الطلب.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="rounded-xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 backdrop-blur p-4 space-y-3.5">
          <div>
            <label className="text-omega-text-muted text-[12px] block mb-1.5 mr-1 flex items-center gap-1.5">
              <IoPersonOutline size={13} /> الاسم
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="اسمك (اختياري)"
              className="w-full px-4 py-3.5 rounded-2xl bg-omega-dark/60 border border-white/10 text-white text-sm placeholder-omega-text-dim focus:outline-none focus:border-omega-orange/50 focus:bg-omega-dark/80 transition-all"
            />
          </div>

          <div>
            <label className="text-omega-text-muted text-[12px] block mb-1.5 mr-1 flex items-center gap-1.5">
              <IoCallOutline size={13} /> رقم الهاتف
            </label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="0555 12 34 56"
              dir="ltr"
              className="w-full px-4 py-3.5 rounded-2xl bg-omega-dark/60 border border-white/10 text-white text-sm placeholder-omega-text-dim focus:outline-none focus:border-omega-orange/50 focus:bg-omega-dark/80 transition-all"
            />
          </div>

          <div>
            <label className="text-omega-text-muted text-[12px] block mb-1.5 mr-1 flex items-center gap-1.5">
              <IoLocationOutline size={13} /> العنوان
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              rows="2"
              placeholder="الحي، الشارع، رقم العمارة..."
              className="w-full px-4 py-3.5 rounded-2xl bg-omega-dark/60 border border-white/10 text-white text-sm placeholder-omega-text-dim focus:outline-none focus:border-omega-orange/50 focus:bg-omega-dark/80 transition-all resize-none"
            />
            <p className="text-omega-text-dim text-[10px] mt-1.5 mr-1">يُستخدم العنوان فقط في طلبات التوصيل</p>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-l from-omega-orange via-omega-orange-dark to-omega-red text-white font-black text-sm shadow-lg shadow-omega-orange/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <IoCheckmarkCircleOutline size={18} />
            <span>حفظ المعلومات</span>
          </button>

          {hasAny && (
            <button
              type="button"
              onClick={handleClear}
              className="w-full py-3 rounded-xl bg-white/[0.04] border border-white/10 text-omega-red font-bold text-sm hover:bg-white/[0.08] transition-colors flex items-center justify-center gap-2"
            >
              <IoTrashOutline size={16} />
              <span>مسح المعلومات المحفوظة</span>
            </button>
          )}

          {savedAt && (
            <p className="text-center text-emerald-400 text-xs font-bold animate-fade-in">
              تم الحفظ ✓
            </p>
          )}
        </form>
      </div>

      <CustomerNav />
    </div>
  );
}
