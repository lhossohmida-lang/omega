import { NavLink } from 'react-router-dom';
import { IoGridOutline, IoPersonOutline, IoRestaurantOutline } from 'react-icons/io5';

const links = [
  { to: '/worker', icon: IoRestaurantOutline, label: 'المطبخ', end: true },
  { to: '/worker/profile', icon: IoPersonOutline, label: 'حسابي' },
  { to: '/worker', icon: IoGridOutline, label: 'الرئيسية', end: true },
];

export default function WorkerNav() {
  return (
    <nav className="omega-bottom-nav-app" style={{ '--omega-nav-count': links.length }}>
      <div className="omega-bottom-nav-inner">
        {links.map(({ to, icon: Icon, label, end }, index) => (
          <NavLink
            key={`${to}-${label}-${index}`}
            to={to}
            end={end}
            className={({ isActive }) => `omega-bottom-nav-link${isActive && index === 0 ? ' active' : ''}`}
          >
            <Icon size={24} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
