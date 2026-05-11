export function OmegaMark({ small = false }) {
  return (
    <div
      className={`${small ? 'h-14 w-14 rounded-[1.3rem]' : 'h-20 w-20 rounded-[1.65rem]'} flex shrink-0 items-center justify-center border border-omega-orange/35 bg-omega-gray/80 text-omega-orange shadow-[0_0_30px_rgba(255,107,0,0.24)]`}
    >
      <span className={`${small ? 'text-3xl' : 'text-5xl'} font-black leading-none`}>Ω</span>
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
