import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

// Guards the Admin area: Guest and User are redirected to Main. Admin passes
// through. The Admin nav item is only rendered for admins, but direct URL
// access is blocked here too so the route stays unreachable without the role.
//
// While the session is still being verified against /api/me (`booting`), the
// cached role must not be trusted: a stale "admin" payload from the device
// store would otherwise render the admin UI and fire admin API calls before
// the server confirms the role. Show a verifying panel instead — the server's
// EnsureUserIsAdmin middleware remains the authoritative boundary (403).
export default function RequireAdmin({ children }) {
  const { isAdmin, booting } = useAuth()
  if (booting) {
    return (
      <div className="px-5 md:px-8 py-10 max-w-6xl mx-auto">
        <div className="text-[12px] font-mono text-textMuted">Verifying session…</div>
      </div>
    )
  }
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}
