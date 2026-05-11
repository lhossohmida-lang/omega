import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  IoApps, IoClipboard, IoRestaurant, IoArchive, IoCar,
  IoBulb, IoSettings, IoTrendingUp, IoLogOut, IoClose, IoMenu,
  IoPersonCircle
} from 'react-icons/io5';
import { useState } from 'react';

// شريط التنقل الجانبي للإدارة
export default function AdminNav() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { logout, userData } = useAuth();

  const sections = [
    {
      title: 'الرئيسية',
      links: [
        { to: '/admin', icon: IoApps, label: 'لوحة التحكم' },
        { to: '/admin/orders', icon: IoClipboard, label: 'الطلبات' },
      ]
    },
    {
      title: 'إدارة',
      links: [
        { to: '/admin/products', icon: IoRestaurant, label: 'المنتجات' },
        { to: '/admin/inventory', icon: IoArchive, label: 'المخزون' },
        { to: '/admin/drivers', icon: IoCar, label: 'السائقون' },
      ]
    },
    {
      title: 'الذكاء والتقارير',
      links: [
        { to: '/admin/ai', icon: IoBulb, label: 'الذكاء الاصطناعي' },
        { to: '/admin/reports', icon: IoTrendingUp, label: 'التقارير' },
        { to: '/admin/settings', icon: IoSettings, label: 'الإعدادات' },
      ]
    }
  ];

  return (
    <>
      {/* زر القائمة للهاتف */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2.5 rounded-xl bg-omega-gray/80 backdrop-blur-md text-omega-orange border border-white/10 shadow-lg shadow-black/40 hover:scale-105 active:scale-95 transition-transform"
      >
        <IoMenu size={22} />
      </button>

      {/* الخلفية المعتمة */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 z-40 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* القائمة الجانبية */}
      <aside className={`fixed top-0 right-0 h-full w-72 z-50
        bg-gradient-to-b from-omega-dark to-omega-black
        border-l border-white/8
        transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
        flex flex-col`}
      >
        {/* glow accent */}
        <div className="pointer-events-none absolute top-0 right-0 w-40 h-40 bg-omega-orange/10 blur-3xl rounded-full" />

        {/* الشعار */}
        <div className="relative flex items-center justify-between p-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-omega-orange via-omega-orange-dark to-omega-red flex items-center justify-center shadow-lg shadow-omega-orange/30">
              <span className="text-white font-black text-xl">Ω</span>
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20" />
            </div>
            <div>
              <h1 className="text-base font-black text-white tracking-tight">OMEGA</h1>
              <p className="text-[11px] text-omega-text-muted">لوحة الإدارة</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-omega-text-muted hover:text-white transition-colors">
            <IoClose size={24} />
          </button>
        </div>

        {/* الروابط */}
        <nav className="flex-1 p-3 overflow-y-auto no-scrollbar">
          {sections.map((section, si) => (
            <div key={si} className="mb-4">
              <p className="px-3 mb-1.5 text-[10px] font-bold text-omega-text-dim uppercase tracking-wider">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.links.map(({ to, icon: Icon, label }) => {
                  const isActive = location.pathname === to;
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/admin'}
                      onClick={() => setIsOpen(false)}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                        ${isActive
                          ? 'bg-gradient-to-l from-omega-orange/20 to-omega-orange/5 text-white border border-omega-orange/20'
                          : 'text-omega-text-muted hover:bg-white/5 hover:text-white border border-transparent'
                        }`}
                    >
                      {/* active indicator */}
                      {isActive && (
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-omega-orange to-omega-red rounded-l-full shadow-lg shadow-omega-orange/40" />
                      )}
                      <Icon size={19} className={isActive ? 'text-omega-orange' : 'group-hover:text-omega-orange transition-colors'} />
                      <span>{label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User profile + logout */}
        <div className="relative p-3 border-t border-white/8 space-y-2">
          {userData && (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-white/5 border border-white/5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-omega-orange to-omega-red flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {userData.name?.[0] || <IoPersonCircle size={20} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-bold truncate">{userData.name || 'المدير'}</p>
                <p className="text-omega-text-dim text-[10px] truncate">{userData.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-omega-red hover:bg-omega-red/10 transition-all border border-transparent hover:border-omega-red/15"
          >
            <IoLogOut size={19} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
