import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  IoGrid, IoReceipt, IoFastFood, IoCube, IoCar, 
  IoSparkles, IoSettings, IoBarChart, IoLogOut, IoClose, IoMenu
} from 'react-icons/io5';
import { useState } from 'react';

// شريط التنقل الجانبي للإدارة
export default function AdminNav() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();

  const links = [
    { to: '/admin', icon: IoGrid, label: 'لوحة التحكم' },
    { to: '/admin/orders', icon: IoReceipt, label: 'الطلبات' },
    { to: '/admin/products', icon: IoFastFood, label: 'المنتجات' },
    { to: '/admin/inventory', icon: IoCube, label: 'المخزون' },
    { to: '/admin/drivers', icon: IoCar, label: 'السائقون' },
    { to: '/admin/ai', icon: IoSparkles, label: 'الذكاء الاصطناعي' },
    { to: '/admin/reports', icon: IoBarChart, label: 'التقارير' },
    { to: '/admin/settings', icon: IoSettings, label: 'الإعدادات' },
  ];

  return (
    <>
      {/* زر القائمة للهاتف */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 rounded-xl bg-omega-gray/80 backdrop-blur-md text-omega-orange border border-white/10 shadow-lg"
      >
        <IoMenu size={24} />
      </button>

      {/* الخلفية المعتمة */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* القائمة الجانبية */}
      <aside className={`fixed top-0 right-0 h-full w-72 bg-omega-dark border-l border-white/10 z-50 
        transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* الشعار */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-omega-orange to-omega-red flex items-center justify-center">
              <span className="text-white font-bold text-lg">Ω</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">OMEGA</h1>
              <p className="text-[11px] text-omega-text-muted">لوحة الإدارة</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-omega-text-muted">
            <IoClose size={24} />
          </button>
        </div>

        {/* الروابط */}
        <nav className="p-3 space-y-1 mt-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          {links.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/admin'}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-omega-orange/15 text-omega-orange border border-omega-orange/20' 
                    : 'text-omega-text-muted hover:bg-white/5 hover:text-white'
                  }`}
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* زر تسجيل الخروج */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/10">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-omega-red hover:bg-omega-red/10 transition-all"
          >
            <IoLogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
