import { useState } from 'react'
import Button from '../ui/Button.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import Avatar from '../ui/Avatar.jsx'
import AuthModal from './AuthModal.jsx'
import SwitchAccountModal from './SwitchAccountModal.jsx'
import Panel, { PanelHead, PanelBody } from '../ui/Panel.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

export default function AccountSection() {
  const { isGuest, user, logout } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [switchOpen, setSwitchOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)

  return (
    <Panel>
      <PanelHead title="Account" description={isGuest ? "You're browsing as a guest." : `Signed in as ${user.email}`} />
      <PanelBody>
        {isGuest ? (
          <Button variant="primary" onClick={() => setAuthOpen(true)}>
            Log in / Register
          </Button>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3.5">
              <Avatar initials={user.initials} size="lg" />
              <div className="min-w-0">
                <div className="text-[14px] font-bold truncate">{user.name}</div>
                <div className="text-[12px] text-textMuted truncate">{user.email}</div>
              </div>
            </div>
            <div className="flex gap-2.5 flex-wrap">
              <Button onClick={() => setSwitchOpen(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path d="M17 1l4 4-4 4" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <path d="M7 23l-4-4 4-4" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                Switch account
              </Button>
              <Button variant="danger" onClick={() => setLogoutOpen(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                Log out
              </Button>
            </div>
          </div>
        )}
      </PanelBody>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <SwitchAccountModal open={switchOpen} onClose={() => setSwitchOpen(false)} />
      <ConfirmDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => {
          logout()
          setLogoutOpen(false)
        }}
        title="Log out?"
        description="You'll need to sign in again to see your projects."
        confirmLabel="Log out"
      />
    </Panel>
  )
}
