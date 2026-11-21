// Registered users & visitors panel, fed by the live /admin/users endpoint.
export default function AdminUserStats({ users, accounts }) {
  // Accounts signed in on this device aren't visitor analytics — present them
  // separately and honestly label the visitor figures as mock.
  const deviceSessions = accounts.length

  return (
    <section className="bg-surface border border-border rounded-lg">
      <header className="px-4 py-3 border-b border-border">
        <div className="text-[11px] uppercase tracking-wide text-textMuted font-semibold">Users &amp; visitors</div>
        <div className="text-[12px] text-textMuted mt-0.5">Live user directory; visitor analytics are not tracked yet.</div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border-b border-border">
        {[
          { label: 'Visitors now (mock)', value: '—' },
          { label: 'Visitors today (mock)', value: '—' },
          { label: 'Visitors week (mock)', value: '—' },
          { label: 'Device sessions', value: deviceSessions },
        ].map((st) => (
          <div key={st.label} className="bg-surface px-4 py-3">
            <div className="text-[11px] text-textMuted truncate">{st.label}</div>
            <div className="mt-0.5 font-display text-[17px] font-bold" style={{ color: 'var(--accent)' }}>
              {st.value}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-wide text-textMuted">
              <th className="px-4 py-2 font-semibold">Name</th>
              <th className="px-4 py-2 font-semibold">User ID</th>
              <th className="px-4 py-2 font-semibold hidden sm:table-cell">Email</th>
              <th className="px-4 py-2 font-semibold text-right hidden md:table-cell">Projects</th>
              <th className="px-4 py-2 font-semibold text-right">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-surface2/50">
                <td className="px-4 py-2 font-medium">{u.name}</td>
                <td className="px-4 py-2 text-textMuted font-mono text-[11.5px]">{u.userId || '—'}</td>
                <td className="px-4 py-2 text-textMuted hidden sm:table-cell">{u.email}</td>
                <td className="px-4 py-2 text-textMuted text-right hidden md:table-cell">{u.projects}</td>
                <td className="px-4 py-2 text-right">
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase"
                    style={{
                      color: u.role === 'admin' ? 'var(--warn)' : 'var(--text-muted)',
                      backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                    }}
                  >
                    {u.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="px-4 py-3 text-[12px] text-textMuted">No users loaded.</div>}
      </div>
    </section>
  )
}
