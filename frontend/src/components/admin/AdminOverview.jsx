// Overview + aggregate statistics read live from the Laravel API (admin role).
// Every number comes from the server — no mock data.
export default function AdminOverview({ overview }) {
  const s = overview || {}

  return (
    <section className="bg-surface border border-border rounded-lg">
      <header className="px-4 py-3 border-b border-border">
        <div className="text-[11px] uppercase tracking-wide text-textMuted font-semibold">Overview</div>
        <div className="text-[12px] text-textMuted mt-0.5">Aggregate statistics from the database.</div>
      </header>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        <Stat label="Registered users" value={s.registered ?? '—'} tone="var(--accent)" />
        <Stat label="Admin accounts" value={s.admins ?? '—'} tone="var(--warn)" />
        <Stat label="Total users" value={s.users ?? '—'} />
        <Stat label="Projects" value={s.projects ?? '—'} />
        <Stat label="In progress" value={s.inProgress ?? '—'} tone="var(--accent)" />
        <Stat label="Groups" value={s.groups ?? '—'} />
        <Stat label="Connections" value={s.connections ?? '—'} tone="var(--mint)" />
        <Stat label="Pending assignments" value={s.pendingAssignments ?? '—'} tone="var(--warn)" />
        <Stat label="Pending invitations" value={s.pendingInvitations ?? '—'} tone="var(--warn)" />
        <Stat label="Reminders sent" value={s.reminders ?? '—'} tone="var(--accent)" />
      </div>
    </section>
  )
}

function Stat({ label, value, tone = 'var(--text)' }) {
  return (
    <div className="bg-surface border border-border rounded-md px-3.5 py-3 min-w-0">
      <div className="text-[10.5px] uppercase tracking-wide text-textMuted font-semibold truncate">{label}</div>
      <div className="mt-1 font-display text-[19px] font-bold leading-none" style={{ color: tone }}>
        {value}
      </div>
    </div>
  )
}
