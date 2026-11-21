import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client.js'

// Admin reads come from the Laravel admin endpoints protected by the
// EnsureUserIsAdmin middleware; the log is server-persisted (admin_logs).
export function useAdmin() {
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState([])
  const [statusSource, setStatusSource] = useState('offline')
  const [collaboration, setCollaboration] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [o, u, l, s, c] = await Promise.all([
        api('/admin/overview'),
        api('/admin/users'),
        api('/admin/logs'),
        api('/admin/status'),
        api('/admin/collaboration'),
      ])
      setOverview(o.overview || null)
      setUsers(u.users || [])
      setLogs(l.logs || [])
      setStatus(s.status || [])
      setStatusSource(s.source || 'offline')
      setCollaboration(c.collaboration || [])
    } catch {
      /* admin API unavailable — panels show empty/offline state */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function addLog(type, message, detail) {
    try {
      const res = await api('/admin/logs', { method: 'POST', body: { type, message, detail } })
      if (res.log) setLogs((prev) => [res.log, ...prev].slice(0, 200))
    } catch {
      /* transient failure — ignore */
    }
  }

  async function clearLogs() {
    try {
      await api('/admin/logs', { method: 'DELETE' })
      setLogs([])
    } catch {
      /* ignore */
    }
  }

  return { overview, users, logs, status, statusSource, collaboration, loading, load, addLog, clearLogs }
}
