// Admin debug console rendered from server-persisted admin_logs entries.
const TONE = {
  info: 'var(--text-muted)',
  success: 'var(--accent)',
  warn: 'var(--warn)',
  error: 'var(--danger)',
  event: 'var(--text)',
}

function fmtTime(ts) {
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export default function AdminConsole({ logs }) {
  return (
    <section className="bg-surface border border-border rounded-lg overflow-hidden">
      <header className="px-4 py-3 border-b border-border">
        <div className="text-[11px] uppercase tracking-wide text-textMuted font-semibold">Debug console</div>
        <div className="text-[12px] text-textMuted mt-0.5">Server-side admin log ({logs.length} entries).</div>
      </header>

      <div className="bg-bg font-mono text-[11.5px] h-56 overflow-y-auto p-3 leading-relaxed">
        {logs.length === 0 && <div className="text-textMuted">No events logged yet.</div>}
        {logs.map((e) => (
          <div key={e.id} className="flex gap-2 py-0.5 break-words">
            <span className="text-textMuted flex-shrink-0">[{fmtTime(e.time)}]</span>
            <span className="flex-shrink-0 font-semibold" style={{ color: TONE[e.type] || 'var(--text-muted)' }}>
              {e.type}
            </span>
            <span className="text-text">{e.message}</span>
            {e.detail && <span className="text-textMuted">— {e.detail}</span>}
            {e.user && <span className="text-textMuted">({e.user})</span>}
          </div>
        ))}
      </div>
    </section>
  )
}
