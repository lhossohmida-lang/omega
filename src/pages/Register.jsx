import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/authService';
import toast from 'react-hot-toast';
import { IoEye, IoEyeOff, IoPersonAdd } from 'react-icons/io5';

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'customer',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.password) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }
    if (form.password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setLoading(true);
    try {
      await registerUser({
        email: form.email,
        password: form.password,
        name: form.name,
        phone: form.phone,
        role: form.role,
      });
      toast.success('تم إنشاء الحساب بنجاح!');
      if (form.role === 'admin') navigate('/admin');
      else if (form.role === 'driver') navigate('/driver');
      else navigate('/');
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('هذا البريد الإلكتروني مستخدم بالفعل');
      } else {
        toast.error('حدث خطأ في إنشاء الحساب');
      }
    }
    setLoading(false);
  };

  const roles = [
    { value: 'customer', label: '🛒 زبون', desc: 'اطلب وجباتك المفضلة' },
    { value: 'driver', label: '🚗 سائق', desc: 'قم بتوصيل الطلبات' },
    { value: 'admin', label: '👨‍💼 مدير', desc: 'إدارة المطعم' },
  ];

  return (
    <div className="min-h-screen bg-omega-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* الشعار */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-omega-orange to-omega-red flex items-center justify-center mb-3 shadow-lg shadow-omega-orange/20">
            <span className="text-white font-black text-2xl">Ω</span>
          </div>
          <h1 className="text-2xl font-black text-white">إنشاء حساب</h1>
          <p className="text-omega-text-muted text-sm">انضم إلى عائلة OMEGA</p>
        </div>

        <div className="glass rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleRegister} className="space-y-4">
            {/* اختيار الدور */}
            <div>
              <label className="block text-sm font-medium text-omega-text-muted mb-2">نوع الحساب</label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm({ ...form, role: r.value })}
                    className={`p-3 rounded-xl text-center transition-all duration-200 border ${
                      form.role === r.value
                        ? 'bg-omega-orange/15 border-omega-orange/40 text-omega-orange'
                        : 'bg-omega-dark/30 border-white/10 text-omega-text-muted hover:border-white/20'
                    }`}
                  >
                    <div className="text-lg mb-1">{r.label.split(' ')[0]}</div>
                    <div className="text-[11px] font-medium">{r.label.split(' ')[1]}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-omega-text-muted mb-2">الاسم الكامل</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-omega-dark/50 border border-white/10 text-white placeholder-omega-text-muted focus:outline-none focus:border-omega-orange/50 focus:ring-1 focus:ring-omega-orange/30 transition-all"
                placeholder="أدخل اسمك"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-omega-text-muted mb-2">رقم الهاتف</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-omega-dark/50 border border-white/10 text-white placeholder-omega-text-muted focus:outline-none focus:border-omega-orange/50 focus:ring-1 focus:ring-omega-orange/30 transition-all"
                placeholder="0555123456"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-omega-text-muted mb-2">البريد الإلكتروني</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-omega-dark/50 border border-white/10 text-white placeholder-omega-text-muted focus:outline-none focus:border-omega-orange/50 focus:ring-1 focus:ring-omega-orange/30 transition-all"
                placeholder="example@email.com"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-omega-text-muted mb-2">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-omega-dark/50 border border-white/10 text-white placeholder-omega-text-muted focus:outline-none focus:border-omega-orange/50 focus:ring-1 focus:ring-omega-orange/30 transition-all"
                  placeholder="6 أحرف على الأقل"
                  dir="ltr"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-omega-text-muted hover:text-white">
                  {showPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-omega-text-muted mb-2">تأكيد كلمة المرور</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-omega-dark/50 border border-white/10 text-white placeholder-omega-text-muted focus:outline-none focus:border-omega-orange/50 focus:ring-1 focus:ring-omega-orange/30 transition-all"
                placeholder="أعد كتابة كلمة المرور"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-l from-omega-orange to-omega-orange-dark text-white font-bold hover:shadow-lg hover:shadow-omega-orange/25 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <IoPersonAdd />
                  <span>إنشاء حساب</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-omega-text-muted text-sm">
              لديك حساب بالفعل؟{' '}
              <Link to="/login" className="text-omega-orange hover:text-omega-orange-light font-medium transition-colors">
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
