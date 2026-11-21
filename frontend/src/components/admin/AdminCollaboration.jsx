import EmptyState from '../ui/EmptyState.jsx'

const KIND_LABEL = {
  group_invitation: 'Group invitation',
  assignment: 'Assignment',
  reminder: 'Reminder',
}

const STATUS_TONE = {
  pending: 'var(--warn)',
  approved: 'var(--mint)',
  declined: 'var(--danger)',
  accepted: 'var(--mint)',
  read: 'var(--mint)',
  unread: 'var(--warn)',
  cancelled: 'var(--text-muted)',
}

function timeAgo(ts) {
  if (!ts) return ''
  const sec = Math.max(1, Math.floor((Date.now() - ts) / 1000))
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

// Live collaboration feed read from the admin API — invitations, assignments
// and reminders merged server-side, newest first.
export default function AdminCollaboration({ collaboration }) {
  return (
    <section className="bg-surface border border-border rounded-lg">
      <header className="px-4 py-3 border-b border-border">
        <div className="text-[11px] uppercase tracking-wide text-textMuted font-semibold">Collaboration</div>
        <div className="text-[12px] text-textMuted mt-0.5">Recent invitations, assignment requests and reminders across groups.</div>
      </header>
      {collaboration.length === 0 ? (
        <EmptyState title="Nothing yet" description="Group invitations, assignments and reminders will appear here." />
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {collaboration.map((row) => (
            <div key={`${row.kind}-${row.id}`} className="px-4 py-2.5 flex items-start gap-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold truncate">
                  {KIND_LABEL[row.kind] || row.kind}
                  {row.title && <span className="text-textMuted font-normal"> — {row.title}</span>}
                </div>
                <div className="text-[11px] text-textMuted mt-0.5 truncate">
                  {row.actor || '—'} → {row.target || '—'}
                  {row.group ? ` in ${row.group}` : ''}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span
                  className="text-[9.5px] font-bold uppercase tracking-wide"
                  style={{ color: STATUS_TONE[row.status] || 'var(--text-muted)' }}
                >
                  {row.status}
                </span>
                <span className="text-[10px] font-mono text-textMuted">{timeAgo(row.time)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
