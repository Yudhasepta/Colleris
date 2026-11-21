import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useAdmin } from '../hooks/useAdmin.js'
import Button from '../components/ui/Button.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import AdminOverview from '../components/admin/AdminOverview.jsx'
import AdminUserStats from '../components/admin/AdminUserStats.jsx'
import AdminWebStatus from '../components/admin/AdminWebStatus.jsx'
import AdminConsole from '../components/admin/AdminConsole.jsx'
import AdminData from '../components/admin/AdminData.jsx'
import AdminCollaboration from '../components/admin/AdminCollaboration.jsx'

export default function AdminPage() {
  const { user, accounts, isAdmin, logout } = useAuth()
  const { overview, users, logs, status, statusSource, collaboration, addLog, clearLogs } = useAdmin()
  const [logoutOpen, setLogoutOpen] = useState(false)

  // Not explicitly guarded here because the route is wrapped in <RequireAdmin>,
  // but double-check so the page is inert even if mounted directly.
  if (!isAdmin) return null

  return (
    <section className="px-5 md:px-8 py-6 md:py-8 max-w-6xl mx-auto">
      <PageHeader
        index="04 / ADMIN"
        title="Operations"
        description="Administrator dashboard — live server overview and debug console."
        meta={
          <div className="flex items-center gap-2 text-[11px] font-mono text-textMuted">
            <span style={{ color: 'var(--accent)' }}>admin</span>
            <span className="text-border">│</span>
            <span>{logs.length} log entries</span>
          </div>
        }
        actions={
          <Button variant="danger" onClick={() => setLogoutOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Admin logout
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        <AdminOverview overview={overview} />
        <AdminCollaboration collaboration={collaboration} />
        <AdminUserStats users={users} accounts={accounts} />
        <AdminWebStatus status={status} source={statusSource} onClear={clearLogs} />
        <AdminConsole logs={logs} />
        <AdminData onLog={addLog} />
      </div>

      <ConfirmDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => {
          addLog('event', 'Admin logged out', user?.email)
          logout()
          setLogoutOpen(false)
        }}
        title="Log out of Admin?"
        description="You'll return to the guest view. Log in with the admin account to get back here."
        confirmLabel="Log out"
      />
    </section>
  )
}
