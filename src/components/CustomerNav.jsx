import { NavLink, useLocation } from 'react-router-dom';
import { IoHome, IoCart, IoReceipt, IoPerson } from 'react-icons/io5';
import { useEffect, useState } from 'react';

// شريط التنقل السفلي للزبون
export default function CustomerNav() {
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);

  // Sync cart count from localStorage
  useEffect(() => {
    const sync = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('omega_cart') || '[]');
        setCartCount(cart.reduce((s, i) => s + (i.quantity || 0), 0));
      } catch { setCartCount(0); }
    };
    sync();
    window.addEventListener('storage', sync);
    const interval = setInterval(sync, 1000);
    return () => { window.removeEventListener('storage', sync); clearInterval(interval); };
  }, []);

  const links = [
    { to: '/', icon: IoHome, label: 'الرئيسية' },
    { to: '/cart', icon: IoCart, label: 'السلة', badge: cartCount },
    { to: '/my-orders', icon: IoReceipt, label: 'طلباتي' },
    { to: '/profile', icon: IoPerson, label: 'حسابي' },
  ];

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-50 max-w-md mx-auto">
      <div className="relative rounded-3xl bg-omega-dark/85 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/60">
        {/* glow */}
        <div className="absolute inset-x-0 -top-1 h-px bg-gradient-to-r from-transparent via-omega-orange/40 to-transparent" />

        <div className="flex items-center justify-around h-16 px-2">
          {links.map(({ to, icon: Icon, label, badge }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center gap-0.5 py-1 px-3 relative group"
              >
                {/* active pill background */}
                {isActive && (
                  <span className="absolute inset-0 bg-gradient-to-br from-omega-orange/15 to-omega-red/10 rounded-2xl border border-omega-orange/20 animate-scale-in" />
                )}

                <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'text-omega-orange -translate-y-0.5'
                    : 'text-omega-text-muted group-hover:text-omega-orange group-hover:-translate-y-0.5'
                }`}>
                  <Icon size={22} />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-br from-omega-red to-omega-red-light text-white text-[10px] font-black flex items-center justify-center border-2 border-omega-dark animate-scale-in">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className={`relative text-[10px] font-bold transition-colors ${
                  isActive ? 'text-omega-orange' : 'text-omega-text-muted'
                }`}>
                  {label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
