// Live "web status" — reports from GET /admin/status, computed server-side.
function StatusRow({ label, ok, meta, detail }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ok ? 'var(--accent)' : 'var(--danger)' }} />
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium">{label}</div>
        {detail && <div className="text-[11px] text-textMuted truncate">{detail}</div>}
      </div>
      <div className="text-[11px] font-semibold" style={{ color: ok ? 'var(--accent)' : 'var(--danger)' }}>
        {ok ? meta || 'Operational' : meta || 'Issue'}
      </div>
    </div>
  )
}

export default function AdminWebStatus({ status, source, onClear }) {
  const offline = status.length === 0
  const relevant = source === 'live' ? status : status.filter((r) => !r.label.toLowerCase().includes('api'))

  return (
    <section className="bg-surface border border-border rounded-lg">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-textMuted font-semibold">Web status</div>
          <div className="text-[12px] text-textMuted mt-0.5">
            {offline ? 'Status unavailable — admin API not reachable.' : 'Server-reported status.'}
          </div>
        </div>
        <button
          onClick={onClear}
          className="rounded-md px-2 py-1 hover:bg-surface2 transition-colors"
        >
          Clear logs
        </button>
      </header>
      <div className="divide-y divide-border">
        {offline && (
          <div className="px-4 py-3 text-[12px] text-textMuted">
            <StatusRow label="API connection" ok={false} meta="Offline" detail="Connection to the Colleris API could not be established." />
          </div>
        )}
        {relevant.map((r) => (
          <StatusRow key={r.label} {...r} />
        ))}
      </div>
    </section>
  )
}
