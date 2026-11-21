import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../api/client.js'
import { notifyGroupsChanged } from '../utils/events.js'
import { useAuth } from './AuthContext.jsx'

const NotificationsContext = createContext(null)

// Lightweight notification source (database-backed): the inbox feed, reminders
// and assignment requests all live in Laravel and are read through this single
// context so the global bell, profile reminders and admin can share one source.
export function NotificationsProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [reminders, setReminders] = useState([])
  const [sentReminders, setSentReminders] = useState([])
  const [assignments, setAssignments] = useState({ received: [], sent: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      setReminders([])
      setSentReminders([])
      setAssignments({ received: [], sent: [] })
      setLoading(false)
      setError('')
      return
    }

    setLoading(true)
    setError('')
    try {
      const [n, r, s, a] = await Promise.all([api('/notifications'), api('/reminders'), api('/reminders/sent'), api('/assignments')])
      setNotifications(n.notifications || [])
      setUnreadCount(n.unreadCount || 0)
      setReminders(r.reminders || [])
      setSentReminders(s.reminders || [])
      setAssignments({ received: a.received || [], sent: a.sent || [] })
    } catch {
      setError('Notifications are unavailable right now.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  // A collaborator can create an assignment while this tab is already open.
  // Re-read on focus and on a slow interval so the bell never stays stale.
  useEffect(() => {
    if (!userId) return undefined

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    const interval = window.setInterval(refreshWhenVisible, 45000)

    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [userId, load])

  async function markRead(id) {
    try {
      const res = await api(`/notifications/${id}`, { method: 'PATCH', body: { read: true } })
      if (res.unreadCount !== undefined) setUnreadCount(res.unreadCount)
      setNotifications((prev) => prev.map((nn) => (nn.id === id ? { ...nn, read: true } : nn)))
      return res
    } catch (err) {
      throw err
    }
  }

  async function respondInvitation(invitationId, status) {
    await api(`/groups/invitations/${invitationId}`, { method: 'PATCH', body: { status } })
    if (status === 'accepted') notifyGroupsChanged()
    await load()
  }

  async function respondAssignment(assignmentId, status) {
    await api(`/assignments/${assignmentId}`, { method: 'PATCH', body: { status } })
    notifyGroupsChanged()
    await load()
  }

  async function markReminderRead(id) {
    await api(`/reminders/${id}`, { method: 'PATCH', body: { read: true } })
    await load()
  }

  async function sendReminder(userId, message) {
    const res = await api(`/reminders/${userId}`, { method: 'POST', body: { message } })
    await load()
    return res
  }

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        reminders,
        sentReminders,
        assignments,
        loading,
        error,
        user,
        refresh: load,
        markRead,
        respondInvitation,
        respondAssignment,
        markReminderRead,
        sendReminder,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>')
  return ctx
}
