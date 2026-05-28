export function OmegaMark({ small = false }) {
  return (
    <div className={`omega-mark${small ? ' omega-mark-small' : ''}`}>
      <img src="./logo.png?v=2" alt="OMEGA Burger" />
    </div>
  );
}

export default function AdminHeader({ title = 'OMEGA', subtitle, accent }) {
  return (
    <header className="admin-header omega-admin-header">
      <OmegaMark />
      <div className="omega-header-copy">
        <h1 className="admin-title omega-admin-title">
          {accent ? <span>{accent} </span> : null}
          {title}
        </h1>
        {subtitle ? <p className="admin-subtitle omega-admin-subtitle">{subtitle}</p> : null}
      </div>
    </header>
  );
}
