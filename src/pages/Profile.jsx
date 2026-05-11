import { useAuth } from '../hooks/useAuth';
import CustomerNav from '../components/CustomerNav';
import { IoLogOut, IoPerson, IoCall, IoMail } from 'react-icons/io5';

export default function Profile() {
  const { userData, logout } = useAuth();

  return (
    <div className="min-h-screen bg-omega-dark pb-safe">
      <div className="sticky top-0 z-30 glass">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-white">حسابي</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-6">
        {/* معلومات الحساب */}
        <div className="glass rounded-2xl p-6 text-center mb-4 animate-slide-up">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-omega-orange to-omega-red flex items-center justify-center mb-4">
            <span className="text-white text-3xl font-black">{userData?.name?.[0] || 'U'}</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{userData?.name}</h2>
          <span className="text-omega-orange text-xs font-medium px-3 py-1 rounded-full bg-omega-orange/10">
            {userData?.role === 'customer' ? 'زبون' : userData?.role === 'driver' ? 'سائق' : 'مدير'}
          </span>
        </div>

        <div className="glass rounded-2xl overflow-hidden mb-4">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
            <IoMail className="text-omega-orange" size={18} />
            <div>
              <p className="text-omega-text-muted text-xs">البريد الإلكتروني</p>
              <p className="text-white text-sm" dir="ltr">{userData?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <IoCall className="text-omega-orange" size={18} />
            <div>
              <p className="text-omega-text-muted text-xs">رقم الهاتف</p>
              <p className="text-white text-sm" dir="ltr">{userData?.phone}</p>
            </div>
          </div>
        </div>

        <button onClick={logout}
          className="w-full py-3 rounded-xl bg-omega-red/10 text-omega-red font-bold hover:bg-omega-red/20 transition-colors flex items-center justify-center gap-2">
          <IoLogOut size={20} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
      <CustomerNav />
    </div>
  );
}
