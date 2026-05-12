export function OmegaMark({ small = false }) {
  return (
    <div
      className={`${small ? 'h-12 w-12' : 'h-16 w-16'} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_0_24px_rgba(255,107,0,0.22)]`}
    >
      <img src="/logo.png" alt="OMEGA Pizza" className="h-full w-full object-cover" />
    </div>
  );
}

export default function AdminHeader({ title = 'OMEGA', subtitle, accent }) {
  return (
    <header className="admin-header">
      <div className="min-w-0 flex-1 text-right">
        <h1 className="admin-title">
          {accent ? <span className="text-omega-orange">{accent}</span> : null}
          {accent ? ' ' : ''}
          {title}
        </h1>
        {subtitle && <p className="admin-subtitle">{subtitle}</p>}
      </div>
      <OmegaMark />
    </header>
  );
}
