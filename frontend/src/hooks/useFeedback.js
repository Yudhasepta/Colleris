import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client.js'

export function useFeedback() {
  const [feedbacks, setFeedbacks] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const load = useCallback(async () => {
    try {
      const res = await api('/feedbacks')
      setFeedbacks(res.feedbacks || [])
      setUnreadCount(res.unreadCount ?? 0)
    } catch {
      setFeedbacks([])
      setUnreadCount(0)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function sendFeedback(userId, message) {
    const res = await api(`/feedbacks/${userId}`, { method: 'POST', body: { message } })
    await load()
    return res.feedback
  }

  async function markRead(id) {
    await api(`/feedbacks/${id}`, { method: 'PATCH', body: { read: true } })
    setFeedbacks((prev) => prev.map((f) => (f.id === id ? { ...f, read: true } : f)))
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  async function markAllRead() {
    const unreadIds = feedbacks.filter((f) => !f.read).map((f) => f.id)
    await Promise.all(unreadIds.map((id) => api(`/feedbacks/${id}`, { method: 'PATCH', body: { read: true } })))
    setFeedbacks((prev) => prev.map((f) => ({ ...f, read: true })))
    setUnreadCount(0)
  }

  return { feedbacks, unreadCount, load, sendFeedback, markRead, markAllRead }
}
