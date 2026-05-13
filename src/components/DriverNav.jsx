import { NavLink } from 'react-router-dom';
import {
  IoBarChartOutline,
  IoCheckmarkDoneOutline,
  IoListOutline,
  IoNotificationsOutline,
  IoPersonOutline,
} from 'react-icons/io5';

const links = [
  { to: '/driver', icon: IoListOutline, label: 'المتاحة', end: true },
  { to: '/driver/my-orders', icon: IoCheckmarkDoneOutline, label: 'طلباتي' },
  { to: '/driver/stats', icon: IoBarChartOutline, label: 'التقارير' },
  { to: '/driver/profile', icon: IoPersonOutline, label: 'حسابي' },
  { to: '/driver', icon: IoNotificationsOutline, label: 'تنبيهات', end: true },
];

export default function DriverNav() {
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
