import { useAuth } from '../hooks/useAuth';
import {
  IoRestaurant,
  IoNotificationsOutline,
  IoListOutline,
  IoBarChartOutline,
  IoSettingsOutline,
  IoLogOutOutline,
} from 'react-icons/io5';

export default function WorkerSidebar({
  active = 'orders',
  onChangeTab,
  notifCount = 0,
}) {
  const { userData, logout } = useAuth();

  const items = [
    { id: 'orders', icon: IoRestaurant, label: 'الطلبات' },
    { id: 'notifs', icon: IoNotificationsOutline, label: 'الإشعارات', badge: notifCount || null },
    { id: 'menu', icon: IoListOutline, label: 'القائمة' },
    { id: 'reports', icon: IoBarChartOutline, label: 'التقارير' },
    { id: 'settings', icon: IoSettingsOutline, label: 'الإعدادات' },
  ];

  return (
    <aside className="kitchen-sidebar">
      <div className="kitchen-brand">
        <div className="kitchen-brand-icon">
          <IoRestaurant size={32} />
        </div>
        <div className="kitchen-brand-text">
          <h2>OMEGA</h2>
          <span>مطعم</span>
        </div>
      </div>

      <nav className="kitchen-nav">
        {items.map(({ id, icon: Icon, label, badge }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChangeTab?.(id)}
            className={`kitchen-nav-item${active === id ? ' active' : ''}`}
          >
            <span className="kitchen-nav-label">{label}</span>
            <span className="kitchen-nav-icon-wrap">
              <Icon size={20} />
              {badge ? <span className="kitchen-nav-badge">{badge}</span> : null}
            </span>
          </button>
        ))}
      </nav>

      <div className="kitchen-profile">
        <div className="kitchen-profile-card">
          <div className="kitchen-profile-info">
            <p className="kitchen-profile-name">
              الشيف {userData?.name?.split(' ')?.[0] || 'العامل'}
            </p>
            <span className="kitchen-profile-role">رئيس المطبخ</span>
          </div>
          <div className="kitchen-profile-avatar">
            {userData?.name?.[0] || '👨‍🍳'}
            <span className="kitchen-profile-online" />
          </div>
        </div>
        <button type="button" onClick={logout} className="kitchen-logout-btn">
          <span>تسجيل خروج</span>
          <IoLogOutOutline size={18} />
        </button>
      </div>
    </aside>
  );
}
