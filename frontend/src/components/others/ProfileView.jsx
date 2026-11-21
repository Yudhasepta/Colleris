import { useEffect, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Avatar from '../ui/Avatar.jsx'
import { TextArea } from '../ui/Field.jsx'
import { useNotifications } from '../../context/NotificationsContext.jsx'
import { useFeedback } from '../../hooks/useFeedback.js'
import { failure } from '../../utils/actionStatus.js'

export default function ProfileView({ open, onClose, profile, loading, isConnected, canSendReminder, onDisconnect }) {
  const { sendReminder } = useNotifications()
  const { sendFeedback } = useFeedback()
  const [message, setMessage] = useState('')
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  // The server only sends `projects` when it is allowed by the profile's
  // visibility rule, so the client trusts the payload instead of re-deriving
  // access here.
  const projects = profile?.projects || null

  useEffect(() => {
    if (!open) {
      setMessage('')
      setFeedbackMsg('')
      setBusy(false)
      setNotice(null)
    }
  }, [open])

  if (!profile) return null

  async function send() {
    setBusy(true)
    setNotice(null)
    try {
      await sendReminder(profile.id, message.trim() || `Reminder from your connection — please follow up on our latest project.`)
      setNotice({ tone: 'ok', text: 'Reminder sent.' })
    } catch (err) {
      const f = failure(err)
      setNotice({ tone: 'err', text: f.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth={440}>
      <div className="p-5">
        <div className="flex items-center gap-3">
          <Avatar initials={loading ? '··' : profile.initials || '··'} size="lg" />
          <div className="min-w-0">
            <div className="font-display text-[17px] font-bold truncate">{profile.name}</div>
            <div className="text-[11px] text-textMuted font-mono truncate">
              {profile.userId || '—'} · {profile.connections} connections
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-[10.5px] uppercase tracking-wide text-textMuted font-semibold mb-2.5">Projects</div>
          {projects ? (
            <div className="flex flex-col gap-1.5">
              {projects.length === 0 && (
                <div className="text-[12.5px] text-textMuted bg-surface2 rounded-md px-3 py-2.5">No public projects.</div>
              )}
              {projects.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-surface2 rounded-md px-3 py-2">
                  <span className="text-[12.5px] font-medium truncate">{p.title}</span>
                  <span className="text-[11px] text-textMuted font-mono flex-shrink-0">{p.progress}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[12.5px] text-textMuted bg-surface2 rounded-md px-3 py-2.5">
              {profile.visibilityLabel || 'Projects are not visible to you'}
            </div>
          )}
        </div>

        {canSendReminder && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-[10.5px] uppercase tracking-wide text-textMuted font-semibold mb-2">Send a reminder</div>
            <TextArea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Nudge ${profile.name} about a project…`}
              className="min-h-[70px]"
              disabled={busy}
            />
            {notice && (
              <div className="text-[11.5px] mt-2" style={{ color: notice.tone === 'ok' ? 'var(--mint)' : 'var(--danger)' }}>
                {notice.text}
              </div>
            )}
            <Button className="w-full justify-center mt-2.5" disabled={busy} onClick={send}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {busy ? 'Sending…' : message.trim() ? 'Send reminder' : 'Send nudge'}
            </Button>
          </div>
        )}

        {isConnected && !profile.isMine && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-[10.5px] uppercase tracking-wide text-textMuted font-semibold mb-2">
              Send feedback
            </div>
            <TextArea
              value={feedbackMsg}
              onChange={(e) => setFeedbackMsg(e.target.value)}
              placeholder={`Share constructive feedback with ${profile.name}…`}
              className="min-h-[70px]"
              disabled={busy}
            />
            {notice && (
              <div className="text-[11.5px] mt-2" style={{ color: notice.tone === 'ok' ? 'var(--mint)' : 'var(--danger)' }}>
                {notice.text}
              </div>
            )}
            <Button
              variant="default"
              className="w-full justify-center mt-2.5"
              disabled={busy || !feedbackMsg.trim()}
              onClick={async () => {
                setBusy(true)
                setNotice(null)
                try {
                  await sendFeedback(profile.id, feedbackMsg.trim())
                  setNotice({ tone: 'ok', text: 'Feedback sent.' })
                  setFeedbackMsg('')
                } catch (err) {
                  setNotice({ tone: 'err', text: failure(err).message })
                } finally {
                  setBusy(false)
                }
              }}
            >
              {busy ? 'Sending…' : 'Send feedback'}
            </Button>
          </div>
        )}

        {isConnected && !profile.isMine && onDisconnect && (
          <div className="mt-3 pt-3 border-t border-border">
            <Button variant="default" className="w-full justify-center" onClick={() => onDisconnect(profile.id)}>
              Disconnect
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
