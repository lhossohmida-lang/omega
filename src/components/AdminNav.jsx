import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  IoMenu, IoClose, IoApps, IoClipboard, IoRestaurant, IoBulb,
  IoArchive, IoBarChart, IoSettings, IoCar, IoLogOut,
} from 'react-icons/io5';

const TABS = [
  { to: '/admin',          icon: IoApps,       label: 'الرئيسية' },
  { to: '/admin/orders',   icon: IoClipboard,  label: 'الطلبات'  },
  { to: '/admin/products', icon: IoRestaurant, label: 'المنتجات' },
  { to: '/admin/ai',       icon: IoBulb,       label: 'الذكاء'   },
];

const MENU_LINKS = [
  { to: '/admin',           icon: IoApps,       label: 'لوحة التحكم'       },
  { to: '/admin/orders',    icon: IoClipboard,  label: 'الطلبات'            },
  { to: '/admin/products',  icon: IoRestaurant, label: 'المنتجات والمخزون' },
  { to: '/admin/inventory', icon: IoArchive,    label: 'المواد الخام'       },
  { to: '/admin/drivers',   icon: IoCar,        label: 'السائقون'           },
  { to: '/admin/ai',        icon: IoBulb,       label: 'الذكاء الاصطناعي'  },
  { to: '/admin/reports',   icon: IoBarChart,   label: 'التقارير'           },
  { to: '/admin/settings',  icon: IoSettings,   label: 'الإعدادات'          },
];

export default function AdminNav() {
  const [open, setOpen] = useState(false);
  const { logout, userData } = useAuth();

  return (
    <>
      {/* Hamburger – fixed top-left */}
      <button
        onClick={() => setOpen(true)}
        className="fixed z-40 flex items-center justify-center w-10 h-10 rounded-2xl bg-omega-gray/80 backdrop-blur-md text-omega-text-muted active:scale-95 transition-transform"
        style={{ top: '3.5rem', left: '1rem' }}
      >
        <IoMenu size={20} />
      </button>

      {/* Ω brand – fixed top-right */}
      <div
        className="fixed z-40 flex items-center justify-center w-11 h-11 rounded-2xl shadow-lg shadow-omega-orange/30 pointer-events-none"
        style={{ top: '3.5rem', right: '1rem', background: 'linear-gradient(135deg, #ff6b00, #e53935)' }}
      >
        <span className="text-white font-black text-xl">Ω</span>
      </div>

      {/* Overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in menu from right (RTL start) */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-72 flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'linear-gradient(to bottom, #0f0f10, #0a0a0a)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-14 pb-5 border-b border-white/6">
          <button
            onClick={() => setOpen(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-omega-text-muted hover:text-white transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
          >
            <IoClose size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-white font-black text-base">OMEGA</p>
              <p className="text-omega-text-dim text-xs">لوحة الإدارة</p>
            </div>
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #ff6b00, #e53935)' }}
            >
              <span className="text-white font-black text-lg">Ω</span>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto no-scrollbar">
          {MENU_LINKS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mb-1 rounded-2xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-omega-orange/15 text-omega-orange'
                    : 'text-omega-text-muted hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="px-3 pb-8 pt-3 border-t border-white/6 space-y-2">
          {userData && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #ff6b00, #e53935)' }}
              >
                {userData.name?.[0] || 'أ'}
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold truncate">{userData.name || 'المدير'}</p>
                <p className="text-omega-text-dim text-[10px] truncate">{userData.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold text-omega-red hover:bg-omega-red/8 transition-all"
          >
            <IoLogOut size={18} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t border-white/6"
        style={{ backgroundColor: '#0a0a0a', paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}
      >
        <div className="flex items-center justify-around py-1">
          {TABS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 flex-1 py-1.5 transition-all duration-200 ${
                  isActive ? 'text-omega-orange' : 'text-omega-text-dim'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-omega-orange/15' : ''}`}>
                    <Icon size={22} />
                  </div>
                  <span className="text-[10px] font-bold">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
