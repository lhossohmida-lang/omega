import { NavLink, useLocation } from 'react-router-dom';
import { IoHome, IoCart, IoReceipt, IoPerson } from 'react-icons/io5';

// شريط التنقل السفلي للزبون
export default function CustomerNav() {
  const location = useLocation();

  const links = [
    { to: '/', icon: IoHome, label: 'الرئيسية' },
    { to: '/cart', icon: IoCart, label: 'السلة' },
    { to: '/my-orders', icon: IoReceipt, label: 'طلباتي' },
    { to: '/profile', icon: IoPerson, label: 'حسابي' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
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
                  ? 'bg-omega-orange/20 text-omega-orange scale-110' 
                  : 'text-omega-text-muted hover:text-omega-orange'
              }`}>
                <Icon size={22} />
              </div>
              <span className={`text-[10px] font-medium transition-colors ${
                isActive ? 'text-omega-orange' : 'text-omega-text-muted'
              }`}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
