import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, getUserData } from '../services/authService';
import toast from 'react-hot-toast';
import { IoEye, IoEyeOff, IoFlash } from 'react-icons/io5';

// شاشة تسجيل الدخول للإدارة والمطبخ فقط (الزبون لا يحتاج تسجيل).
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }
    setLoading(true);
    try {
      const user = await loginUser(email, password);
      const userData = await getUserData(user.uid);

      toast.success(`مرحباً ${userData?.name || ''}!`);

      if (userData?.role === 'admin') navigate('/admin');
      else if (userData?.role === 'worker') navigate('/worker');
      else navigate('/');
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/invalid-credential') {
        toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else if (error.code === 'auth/user-not-found') {
        toast.error('لا يوجد حساب بهذا البريد');
      } else {
        toast.error('حدث خطأ في تسجيل الدخول');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-omega-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-white flex items-center justify-center mb-4 shadow-lg shadow-omega-orange/20">
            <img src="/logo.png" alt="OMEGA" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-black text-white mb-1">OMEGA</h1>
          <p className="text-omega-text-muted text-sm">دخول الإدارة والمطبخ</p>
        </div>

        <div className="glass rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 text-center">تسجيل الدخول</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-omega-text-muted mb-2">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-omega-dark/50 border border-white/10 text-white placeholder-omega-text-muted focus:outline-none focus:border-omega-orange/50 focus:ring-1 focus:ring-omega-orange/30 transition-all"
                  placeholder="••••••••"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-omega-text-muted hover:text-white transition-colors"
                >
                  {showPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-l from-omega-orange to-omega-orange-dark text-white font-bold text-base hover:shadow-lg hover:shadow-omega-orange/25 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <IoFlash />
                  <span>دخول</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-omega-orange hover:text-omega-orange-light text-sm font-medium transition-colors"
            >
              العودة لواجهة الزبائن →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
