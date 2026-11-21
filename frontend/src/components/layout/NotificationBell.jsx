import { useState } from 'react'
import Modal from '../ui/Modal.jsx'
import NotificationPanel from './NotificationPanel.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useNotifications } from '../../context/NotificationsContext.jsx'

// Global, app-shell-level notification entry point. A floating bell above the
// mobile bottom nav / desktop bottom-right; guests have no mailbox.
export default function NotificationBell() {
  const { isGuest } = useAuth()
  const { unreadCount, refresh } = useNotifications()
  const [open, setOpen] = useState(false)

  if (isGuest) return null

  return (
    <>
      <button
        onClick={() => {
          setOpen(true)
          refresh()
        }}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        className="fixed z-40 bottom-[76px] right-4 md:bottom-6 md:right-6 w-11 h-11 rounded-full border border-border bg-surface shadow-panel hover:bg-surfaceHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] transition-colors flex items-center justify-center"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-textMuted">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: 'var(--accent-bg)', color: 'var(--on-accent)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} maxWidth={400}>
        <NotificationPanel onClose={() => setOpen(false)} />
      </Modal>
    </>
  )
}
