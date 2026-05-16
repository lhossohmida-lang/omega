import { NavLink } from 'react-router-dom';
import {
  IoHomeSharp,
  IoHomeOutline,
  IoListSharp,
  IoListOutline,
  IoBagHandleSharp,
  IoBagHandleOutline,
  IoHeartSharp,
  IoHeartOutline,
  IoPersonSharp,
  IoPersonOutline,
} from 'react-icons/io5';

const LINKS = [
  { to: '/',           active: IoHomeSharp,         idle: IoHomeOutline,        label: 'الرئيسية', end: true  },
  { to: '/favorites',  active: IoHeartSharp,        idle: IoHeartOutline,       label: 'المفضلة',  end: false },
  { to: '/cart',       active: IoBagHandleSharp,    idle: IoBagHandleOutline,   label: 'السلة',    end: false, isCart: true },
  { to: '/my-orders',  active: IoListSharp,         idle: IoListOutline,        label: 'طلباتي',   end: false },
  { to: '/my-info',    active: IoPersonSharp,       idle: IoPersonOutline,      label: 'معلوماتي', end: false },
];

export default function CustomerNav({ cartCount = 0 }) {
  return (
    <nav className="ch-bottom-nav" aria-label="التنقل الرئيسي">
      <div className="ch-bottom-inner">
        {LINKS.map(({ to, active: ActiveIcon, idle: IdleIcon, label, end, isCart }, idx) => (
          <NavLink
            key={`${to}-${idx}`}
            to={to}
            end={end}
            className={({ isActive }) =>
              `ch-nav-link${isActive ? ' active' : ''}${isCart ? ' cart-link' : ''}`
            }
            aria-label={label}
          >
            {({ isActive }) => (
              <>
                {isCart ? (
                  <span className="ch-nav-cart-bubble">
                    {isActive ? <ActiveIcon size={26}/> : <IdleIcon size={26}/>}
                    {cartCount > 0 && (
                      <span className="ch-nav-cart-count">{cartCount > 9 ? '9+' : cartCount}</span>
                    )}
                  </span>
                ) : (
                  isActive ? <ActiveIcon size={24}/> : <IdleIcon size={24}/>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
