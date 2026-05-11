import { NavLink, useLocation } from 'react-router-dom';
import { IoHome, IoHomeOutline, IoCart, IoCartOutline, IoReceipt, IoReceiptOutline, IoPerson, IoPersonOutline } from 'react-icons/io5';
import { useEffect, useState } from 'react';

// شريط التنقل السفلي للزبون
export default function CustomerNav() {
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);

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
    { to: '/profile', iconActive: IoPerson, icon: IoPersonOutline, label: 'حسابي' },
    { to: '/my-orders', iconActive: IoReceipt, icon: IoReceiptOutline, label: 'طلباتي' },
    { to: '/cart', iconActive: IoCart, icon: IoCartOutline, label: 'السلة', badge: cartCount },
    { to: '/', iconActive: IoHome, icon: IoHomeOutline, label: 'الرئيسية' },
  ];

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-50 max-w-lg mx-auto">
      <div className="relative rounded-[1.75rem] bg-omega-dark/90 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/70">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-omega-orange/60 to-transparent" />

        <div className="flex items-center justify-around h-[68px] px-2">
          {links.map(({ to, icon: Icon, iconActive: IconActive, label, badge }) => {
            const isActive = location.pathname === to || (to === '/' && location.pathname === '/');
            const DisplayIcon = isActive ? IconActive : Icon;
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className="flex flex-col items-center gap-1 py-2 px-3 relative group min-w-[64px]"
              >
                <div className={`relative transition-all duration-300 ${
                  isActive ? 'text-omega-orange -translate-y-0.5' : 'text-white/50 group-hover:text-white'
                }`}>
                  <DisplayIcon size={24} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-omega-orange text-white text-[10px] font-black flex items-center justify-center border-2 border-omega-dark">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className={`relative text-[10px] font-bold transition-colors ${
                  isActive ? 'text-omega-orange' : 'text-white/50'
                }`}>
                  {label}
                </span>
                {isActive && (
                  <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-omega-orange shadow-[0_0_8px_rgba(255,107,0,0.8)]" />
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
