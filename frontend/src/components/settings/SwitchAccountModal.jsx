import { useState } from 'react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Avatar from '../ui/Avatar.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import AuthModal from './AuthModal.jsx'

export default function SwitchAccountModal({ open, onClose }) {
  const { accounts, user, switchAccount } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)

  async function handleSwitch(id) {
    if (user?.id === id) return onClose()
    const result = await switchAccount(id)
    if (result === 'needs-login') {
      setAuthOpen(true)
    } else {
      onClose()
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} maxWidth={380}>
        <div className="p-5 pb-0 font-display text-[16px] font-bold">Switch account</div>
        <div className="p-5 flex flex-col gap-1.5">
          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => handleSwitch(a.id)}
              className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] ${
                user?.id === a.id ? 'border-accent bg-surface2' : 'border-border hover:bg-surface2'
              }`}
            >
              <Avatar initials={a.initials} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold truncate">{a.name}</div>
                <div className="text-[11px] text-textMuted truncate">{a.email}</div>
              </div>
              {user?.id === a.id && (
                <span className="text-[10.5px] font-semibold" style={{ color: 'var(--accent)' }}>
                  Active
                </span>
              )}
            </button>
          ))}
          <Button
            onClick={() => {
              onClose()
              setAuthOpen(true)
            }}
            className="justify-center mt-1"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add account
          </Button>
        </div>
      </Modal>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
