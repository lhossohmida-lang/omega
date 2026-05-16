import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { OmegaMark } from './AdminHeader';
import InstallAppButton from './InstallAppButton';
import {
  IoArchiveOutline,
  IoBagHandleOutline,
  IoBarChartOutline,
  IoClose,
  IoCubeOutline,
  IoHomeOutline,
  IoLogOutOutline,
  IoMenu,
  IoNotificationsOutline,
  IoPricetagOutline,
  IoSparklesOutline,
} from 'react-icons/io5';

const bottomTabs = [
  { to: '/admin', icon: IoHomeOutline, label: 'الرئيسية', end: true },
  { to: '/admin/orders', icon: IoBagHandleOutline, label: 'الطلبات' },
  { to: '/admin/products', icon: IoCubeOutline, label: 'المنتجات' },
  { to: '/admin/offers', icon: IoPricetagOutline, label: 'العروض' },
  { to: '/admin/reports', icon: IoBarChartOutline, label: 'التقارير' },
];

const menuLinks = [
  { to: '/admin', icon: IoHomeOutline, label: 'الرئيسية', end: true },
  { to: '/admin/orders', icon: IoBagHandleOutline, label: 'الطلبات' },
  { to: '/admin/products', icon: IoCubeOutline, label: 'المنتجات' },
  { to: '/admin/offers', icon: IoPricetagOutline, label: 'العروض الخاصة' },
  { to: '/admin/inventory', icon: IoArchiveOutline, label: 'المخزون' },
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
    }, 240);
  };

  return (
    <>
      <div className="admin-floating-actions">
        <button type="button" className="admin-alert-button" aria-label="الإشعارات">
          <IoNotificationsOutline size={25} />
          <span />
        </button>
        <button
          type="button"
          className="admin-menu-float"
          onClick={() => setOpen(true)}
          aria-label="فتح القائمة"
        >
          <IoMenu size={31} />
        </button>
      </div>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[3px]"
          onClick={() => setOpen(false)}
          aria-label="إغلاق القائمة"
        />
      ) : null}

      <aside className={`omega-side-menu ${open ? 'is-open' : ''}`}>
        <div className="omega-side-head">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="omega-side-close"
            aria-label="إغلاق القائمة"
          >
            <IoClose size={22} />
          </button>

          <div className="omega-side-brand">
            <div>
              <p>OMEGA</p>
              <span>إدارة المطعم</span>
            </div>
            <OmegaMark small />
          </div>
        </div>

        <nav className="omega-side-links">
          {menuLinks.map(({ to, icon: Icon, label, end, badge }) => {
            const isClicking = clickingTo === to;
            return (
              <NavLink
                key={`${label}-${to}`}
                to={to}
                end={end}
                onClick={(e) => handleNavClick(e, to)}
                className={({ isActive }) =>
                  `omega-side-link${isActive ? ' active' : ''}${isClicking ? ' clicking' : ''}`
                }
              >
                <div>
                  {badge ? <span className="omega-side-badge">{badge}</span> : null}
                  <span>{label}</span>
                </div>
                <Icon size={25} />
              </NavLink>
            );
          })}
        </nav>

        <div className="omega-side-footer">
          {userData ? (
            <div className="omega-user-card">
              <div>{userData.name?.[0] || 'أ'}</div>
              <section>
                <p dir="ltr">{userData.name || 'admin'}</p>
                <span dir="ltr">{userData.email}</span>
              </section>
            </div>
          ) : null}

          <InstallAppButton target="admin" className="omega-install-button" />

          <button type="button" onClick={logout} className="omega-logout-button">
            <IoLogOutOutline size={23} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <nav className="admin-bottom-nav omega-bottom-nav fixed inset-x-4 bottom-4 z-40 pb-[env(safe-area-inset-bottom,0px)] sm:inset-x-8 lg:left-1/2 lg:right-auto lg:w-[min(1060px,calc(100%_-_4rem))] lg:-translate-x-1/2">
        <div className="omega-bottom-inner">
          {bottomTabs.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `omega-bottom-link${isActive ? ' active' : ''}`}
            >
              <Icon size={25} />
              <span>{label}</span>
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="omega-bottom-link"
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
