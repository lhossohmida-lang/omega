import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { OmegaMark } from './AdminHeader';
import {
  IoArchiveOutline,
  IoBagHandleOutline,
  IoBarChartOutline,
  IoCarOutline,
  IoClose,
  IoCubeOutline,
  IoGridOutline,
  IoHomeOutline,
  IoLogOutOutline,
  IoMenu,
  IoSparklesOutline,
} from 'react-icons/io5';

const bottomTabs = [
  { to: '/admin', icon: IoGridOutline, label: 'الرئيسية', end: true },
  { to: '/admin/orders', icon: IoBagHandleOutline, label: 'الطلبات' },
  { to: '/admin/products', icon: IoCubeOutline, label: 'المنتجات' },
  { to: '/admin/reports', icon: IoBarChartOutline, label: 'التقارير' },
];

const menuLinks = [
  { to: '/admin', icon: IoHomeOutline, label: 'الرئيسية', end: true },
  { to: '/admin', icon: IoGridOutline, label: 'لوحة التحكم', end: true, featured: true },
  { to: '/admin/orders', icon: IoBagHandleOutline, label: 'الطلبات' },
  { to: '/admin/products', icon: IoCubeOutline, label: 'المنتجات' },
  { to: '/admin/inventory', icon: IoArchiveOutline, label: 'المخزون' },
  { to: '/admin/drivers', icon: IoCarOutline, label: 'السائقون' },
  { to: '/admin/ai', icon: IoSparklesOutline, label: 'الذكاء الاصطناعي', badge: 'جديد' },
  { to: '/admin/reports', icon: IoBarChartOutline, label: 'التقارير' },
];

export default function AdminNav() {
  const [open, setOpen] = useState(false);
  const [clickingTo, setClickingTo] = useState(null);
  const { logout, userData } = useAuth();
  const navigate = useNavigate();

  const handleNavClick = (e, to) => {
    e.preventDefault();
    if (clickingTo) return;
    setClickingTo(to);
    setTimeout(() => {
      setOpen(false);
      navigate(to);
      setClickingTo(null);
    }, 420);
  };

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-black/72 backdrop-blur-[3px]"
          onClick={() => setOpen(false)}
          aria-label="إغلاق القائمة"
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(31rem,calc(100vw-1rem))] flex-col border-r border-white/10 bg-[#0c1014]/96 px-5 py-6 shadow-[-24px_0_80px_-32px_rgba(0,0,0,0.95)] backdrop-blur-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="mb-7 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-omega-text-muted transition-colors hover:text-white"
            aria-label="إغلاق القائمة"
          >
            <IoClose size={22} />
          </button>

          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-3xl font-black text-omega-orange">OMEGA</p>
              <p className="mt-1 text-sm text-omega-text-muted">إدارة المطعم باحتراف</p>
            </div>
            <OmegaMark small />
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
          {menuLinks.map(({ to, icon: Icon, label, end, badge }) => {
            const isClicking = clickingTo === to;
            return (
              <NavLink
                key={`${label}-${to}`}
                to={to}
                end={end}
                onClick={(e) => handleNavClick(e, to)}
                className={() =>
                  `group relative flex items-center overflow-hidden border text-lg font-bold transition-all duration-[420ms] ease-out ${
                    isClicking
                      ? 'mx-auto h-16 w-16 justify-center rounded-full border-yellow-400/70 bg-yellow-400 text-black shadow-[0_0_32px_-4px_rgba(250,204,21,0.85)]'
                      : 'min-h-16 w-full justify-between gap-4 rounded-[1.35rem] border-white/8 bg-white/[0.035] px-5 text-omega-text hover:border-white/14 hover:bg-white/[0.055]'
                  }`
                }
              >
                <div className={`flex items-center gap-3 transition-opacity duration-150 ${isClicking ? 'opacity-0' : 'opacity-100'}`}>
                  {badge && (
                    <span className="rounded-full bg-omega-orange/16 px-3 py-1 text-xs font-black text-omega-orange">
                      {badge}
                    </span>
                  )}
                </div>
                <div className={`flex items-center gap-4 transition-opacity duration-150 ${isClicking ? 'opacity-0' : 'opacity-100'}`}>
                  <span>{label}</span>
                  <Icon className="text-omega-text-muted group-hover:text-omega-orange" size={27} />
                </div>
                {isClicking && (
                  <Icon className="absolute text-black" size={28} />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-6 space-y-3">
          {userData && (
            <div className="admin-glass flex items-center gap-4 rounded-[1.35rem] p-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-omega-orange/30 bg-omega-orange/12 text-omega-orange">
                <span className="text-2xl font-black">{userData.name?.[0] || 'أ'}</span>
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-lg font-black text-white" dir="ltr">{userData.name || 'admin'}</p>
                <p className="truncate text-sm text-omega-text-muted" dir="ltr">{userData.email}</p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={logout}
            className="flex min-h-16 w-full items-center justify-center gap-3 rounded-[1.35rem] border border-omega-red/25 bg-omega-red/10 text-lg font-bold text-omega-red transition-colors hover:bg-omega-red/15"
          >
            <IoLogOutOutline size={27} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <nav className="admin-bottom-nav fixed inset-x-4 bottom-4 z-40 rounded-[1.45rem] px-2 pb-[env(safe-area-inset-bottom,0px)] sm:inset-x-8 lg:left-1/2 lg:right-auto lg:w-[min(1060px,calc(100%_-_4rem))] lg:-translate-x-1/2">
        <div className="flex items-center justify-around py-2">
          {bottomTabs.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-bold transition-colors ${
                  isActive ? 'text-omega-orange' : 'text-omega-text-dim'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute -top-2 h-0.5 w-14 rounded-full bg-omega-orange shadow-[0_0_18px_rgba(255,107,0,0.9)]" />}
                  <Icon size={25} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-bold text-omega-text-dim transition-colors hover:text-omega-orange"
            aria-label="فتح القائمة"
          >
            <IoMenu size={25} />
            <span>القائمة</span>
          </button>
        </div>
      </nav>
    </>
  );
}
