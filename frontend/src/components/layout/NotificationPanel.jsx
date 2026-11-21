import Button from '../ui/Button.jsx'
import Avatar from '../ui/Avatar.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { useNotifications } from '../../context/NotificationsContext.jsx'
import { failure } from '../../utils/actionStatus.js'
import { useState } from 'react'

const TYPE_LABEL = {
  connection: 'Connected',
  group_invite: 'Group invitation',
  assignment: 'Assignment',
  reminder: 'Reminder',
  group_activity: 'Group activity',
  supervised_complete: 'Supervisor marked complete',
  completion_vote_requested: 'Completion vote requested',
  completion_vote_rejected: 'Vote rejected',
  completion_vote_cancelled: 'Vote cancelled',
  completion_vote_approved: 'Unanimously approved',
  supervisor_task_override: 'Supervisor update',
}

function timeAgo(ts) {
  if (!ts) return ''
  const sec = Math.max(1, Math.floor((Date.now() - ts) / 1000))
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

export default function NotificationPanel({ onClose }) {
  const n = useNotifications()
  const [outcome, setOutcome] = useState({})
  const [busy, setBusy] = useState(null)
  const [tab, setTab] = useState('inbox')

  async function act(key, fn) {
    setBusy(key)
    setOutcome((prev) => ({ ...prev, [key]: null }))
    try {
      await fn()
      setOutcome((prev) => ({ ...prev, [key]: 'ok' }))
    } catch (err) {
      setOutcome((prev) => ({ ...prev, [key]: failure(err).message }))
    } finally {
      setBusy(null)
    }
  }

  const pendingAssignment = (payload) => {
    const a = n.assignments.received.find((x) => String(x.id) === String(payload.assignment_id))
    return a?.status === 'pending' ? a : null
  }

  const reminderRead = (payload) => {
    const r = n.reminders.find((x) => String(x.id) === String(payload.reminder_id))
    return r ? !!r.read : true
  }

  const myVoteFor = (gpId) => {
    const p = (n.groups || []).flatMap((g) => g.projects || []).find((proj) => String(proj.id) === String(gpId))
    if (!p || !p.votes) return null
    return p.votes.find((v) => String(v.userId) === String(n.user?.id)) ?? null
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-[16px] font-bold">Notifications</div>
        {n.unreadCount > 0 && (
          <span
            className="rounded-md bg-accent-soft-gradient"
            style={{ color: 'var(--on-accent)' }}
          >
            {n.unreadCount} unread
          </span>
        )}
      </div>

      <div className="flex gap-1 mb-4 border-b border-border">
        <button
          onClick={() => setTab('inbox')}
          className={`px-3 py-1.5 text-[12px] font-semibold transition-colors ${tab === 'inbox' ? 'border-b-2 border-accent text-text' : 'text-textMuted hover:text-textMuted'}`}
        >
          Inbox
        </button>
        <button
          onClick={() => setTab('sent')}
          className={`px-3 py-1.5 text-[12px] font-semibold transition-colors ${tab === 'sent' ? 'border-b-2 border-accent text-text' : 'text-textMuted hover:text-textMuted'}`}
        >
          Sent reminders · {n.sentReminders?.length ?? 0}
        </button>
      </div>

      {tab === 'inbox' && (
        <>
          {n.loading && !n.notifications.length && <div className="text-[12.5px] text-textMuted py-6 text-center">Loading…</div>}

          {!n.loading && n.notifications.length === 0 && (
            <EmptyState
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              }
              title="All caught up"
              description="Invites, assignment requests and reminders will land here."
            />
          )}

          <div className="flex flex-col">
            {n.notifications.map((item) => {
              const assign = pendingAssignment(item.payload || {})
              const isReminderUnread = item.type === 'reminder' && !reminderRead(item.payload || {})
              const key = `n${item.id}`
              const res = outcome[key]
              const isBusy = busy === key

              return (
                <div key={item.id} className="border-b border-border last:border-b-0 py-2.5">
                  <div className="flex items-start gap-2.5">
                    <Avatar initials={item.actor?.initials || '··'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold" style={{ color: 'var(--accent)' }}>
                          {TYPE_LABEL[item.type] || item.type}
                        </span>
                        {!item.read && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--warn)' }} />}
                        <span className="text-[10px] font-mono text-textMuted ml-auto flex-shrink-0">{timeAgo(item.createdAt)}</span>
                      </div>
                      {item.type === 'reminder' ? (
                        <>
                          <div className="text-[12.5px] text-textMuted mt-1">{item.payload?.message}</div>
                          {item.payload?.detail && <div className="text-[11px] text-textMuted mt-0.5">{item.payload.detail}</div>}
                        </>
                      ) : (
                        <div className="text-[12.5px] text-textMuted mt-1">
                          {item.payload?.detail || `${item.actor?.name} did something`}
                        </div>
                      )}

                      {item.type === 'group_invite' && item.payload?.invitation_id && (
                        <div className="flex gap-1.5 mt-2">
                          {res === 'ok' ? (
                            <span className="text-[11px] font-semibold" style={{ color: 'var(--mint)' }}>
                              Responded
                            </span>
                          ) : (
                            <>
                              <Button
                                className="!px-2.5 !py-1 !text-[11px]"
                                disabled={isBusy}
                                onClick={() => act(key, () => n.respondInvitation(item.payload.invitation_id, 'accepted'))}
                              >
                                Accept
                              </Button>
                              <Button
                                variant="ghost"
                                className="!px-2.5 !py-1 !text-[11px]"
                                disabled={isBusy}
                                onClick={() => act(key, () => n.respondInvitation(item.payload.invitation_id, 'declined'))}
                              >
                                Decline
                              </Button>
                            </>
                          )}
                          {res && res !== 'ok' && <span className="text-[11px] text-danger">{res}</span>}
                        </div>
                      )}

                      {item.type === 'assignment' && assign && (
                        <div className="flex gap-1.5 mt-2">
                          {res === 'ok' ? (
                            <span className="text-[11px] font-semibold" style={{ color: 'var(--mint)' }}>
                              Responded
                            </span>
                          ) : (
                            <>
                              <Button
                                className="!px-2.5 !py-1 !text-[11px]"
                                disabled={isBusy}
                                onClick={() => act(key, () => n.respondAssignment(assign.id, 'approved'))}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="ghost"
                                className="!px-2.5 !py-1 !text-[11px]"
                                disabled={isBusy}
                                onClick={() => act(key, () => n.respondAssignment(assign.id, 'declined'))}
                              >
                                Decline
                              </Button>
                            </>
                          )}
                          {res && res !== 'ok' && <span className="text-[11px] text-danger">{res}</span>}
                        </div>
                      )}

                      {isReminderUnread && (
                        <div className="flex gap-1.5 mt-2">
                          {res === 'ok' ? (
                            <span className="text-[11px] font-semibold" style={{ color: 'var(--mint)' }}>
                              Marked read
                            </span>
                          ) : (
                            <Button
                              className="!px-2.5 !py-1 !text-[11px]"
                              disabled={isBusy}
                              onClick={() => act(key, () => n.markReminderRead(item.payload.reminder_id))}
                            >
                              Mark as read
                            </Button>
                          )}
                          {res && res !== 'ok' && <span className="text-[11px] text-danger">{res}</span>}
                        </div>
                      )}

                      {item.type === 'completion_vote_requested' && (
                        <div className="mt-2">
                          {res === 'ok' ? (
                            <span className="text-[11px] font-semibold" style={{ color: 'var(--mint)' }}>
                              Vote recorded
                            </span>
                          ) : (
                            (() => {
                              const v = myVoteFor(item.payload?.groupProjectId)
                              if (!v) {
                                return (
                                  <div className="flex gap-1.5">
                                    <Button
                                      className="!px-2.5 !py-1 !text-[11px]"
                                      disabled={isBusy}
                                      onClick={() => act(key, () => n.voteGroupComplete(item.payload.groupProjectId, true))}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className="!px-2.5 !py-1 !text-[11px]"
                                      disabled={isBusy}
                                      onClick={() => act(key, () => n.voteGroupComplete(item.payload.groupProjectId, false))}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                )
                              }
                              return (
                                <span className="text-[11px] text-textMuted">
                                  You already voted: <b>{v.vote}</b>
                                </span>
                              )
                            })()
                          )}
                        </div>
                      )}

                      {item.type === 'completion_vote_rejected' && (
                        <div className="mt-1">
                          {item.payload?.reason && <div className="text-[11px] text-textMuted italic">Reason: "{item.payload.reason}"</div>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'sent' && (
        <>
          {n.sentReminders?.length === 0 && (
            <EmptyState
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              }
              title="No sent reminders"
              description="Reminders you send will appear here."
            />
          )}
          <div className="flex flex-col">
            {(n.sentReminders || []).map((r) => (
              <div key={r.id} className="border-b border-border last:border-b-0 py-2.5">
                <div className="flex items-start gap-2.5">
                  <Avatar initials={r.recipient?.initials || '··'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold" style={{ color: 'var(--accent)' }}>
                        Sent reminder
                      </span>
                      <span className="text-[10px] font-mono text-textMuted ml-auto">{timeAgo(r.createdAt)}</span>
                    </div>
                    <div className="text-[12.5px] text-textMuted mt-1">{r.message}</div>
                    {r.recipient && (
                      <div className="text-[11px] text-textMuted mt-0.5">
                        to {r.recipient.name}
                        {r.groupName ? ` in "${r.groupName}"` : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-3 text-center">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}
