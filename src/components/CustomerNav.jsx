import { NavLink } from 'react-router-dom';
import {
  IoBagHandleOutline,
  IoGridOutline,
  IoHomeOutline,
  IoListOutline,
  IoPersonOutline,
} from 'react-icons/io5';

const links = [
  { to: '/', icon: IoHomeOutline, label: 'الرئيسية', end: true },
  { to: '/my-orders', icon: IoListOutline, label: 'الطلبات' },
  { to: '/cart', icon: IoBagHandleOutline, label: 'السلة' },
  { to: '/profile', icon: IoPersonOutline, label: 'حسابي' },
  { to: '/', icon: IoGridOutline, label: 'القائمة', end: true },
];

export default function CustomerNav() {
  return (
    <nav className="omega-bottom-nav-app" style={{ '--omega-nav-count': links.length }}>
      <div className="omega-bottom-nav-inner">
        {links.map(({ to, icon: Icon, label, end }, index) => (
          <NavLink
            key={`${to}-${label}-${index}`}
            to={to}
            end={end}
            className={({ isActive }) => `omega-bottom-nav-link${isActive && index !== 4 ? ' active' : ''}`}
          >
            <Icon size={24} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
