import { NavLink, useLocation } from 'react-router-dom';
import { IoList, IoCheckmarkDone, IoStatsChart, IoPerson, IoDownloadOutline } from 'react-icons/io5';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import toast from 'react-hot-toast';

export default function DriverNav() {
  const location = useLocation();
  const { canInstall, isIOS, install } = useInstallPrompt();

  const handleInstall = async () => {
    if (isIOS) {
      toast('لتثبيت التطبيق: اضغط زر المشاركة ← أضف إلى الشاشة الرئيسية', { duration: 5000, icon: '📱' });
      return;
    }
    await install();
  };

  const links = [
    { to: '/driver', icon: IoList, label: 'المتاحة' },
    { to: '/driver/my-orders', icon: IoCheckmarkDone, label: 'طلباتي' },
    { to: '/driver/stats', icon: IoStatsChart, label: 'إحصائياتي' },
    { to: '/driver/profile', icon: IoPerson, label: 'حسابي' },
  ];

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-lg glass border border-black/8 shadow-xl">
      <div className="flex h-16 items-center justify-around px-2">
        {links.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-300"
            >
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-omega-orange/15 text-omega-orange scale-110'
                  : 'text-omega-text-muted hover:text-omega-orange'
              }`}>
                <Icon size={22} />
              </div>
              <span className={`text-[10px] font-medium transition-colors ${
                isActive ? 'text-omega-orange' : 'text-omega-text-muted'
              }`}>{label}</span>
            </NavLink>
          );
        })}

        {(canInstall || isIOS) && (
          <button
            onClick={handleInstall}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-300 active:scale-95"
          >
            <div className="p-1.5 rounded-xl bg-omega-orange/15 text-omega-orange">
              <IoDownloadOutline size={22} />
            </div>
            <span className="text-[10px] font-bold text-omega-orange">تثبيت</span>
          </button>
        )}
      </div>
    </nav>
  );
}
