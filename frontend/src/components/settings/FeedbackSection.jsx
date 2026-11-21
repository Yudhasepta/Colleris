import { useAuth } from '../../context/AuthContext.jsx'
import Avatar from '../ui/Avatar.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import Panel, { PanelHead, PanelBody } from '../ui/Panel.jsx'
import { useFeedback } from '../../hooks/useFeedback.js'

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

export default function FeedbackSection({ className = '' }) {
  const { user } = useAuth()
  const { feedbacks, unreadCount, loading, markRead, markAllRead } = useFeedback()

  if (!user) return null

  return (
    <Panel className={className}>
      <PanelHead
        title="Feedback"
        description="Messages from connections about your projects."
        action={
          unreadCount > 0 ? (
            <span
              className="rounded-md bg-statusProgress/10 px-2 py-0.5 text-[11px] font-mono"
              style={{ color: 'var(--status-progress)' }}
            >
              {unreadCount} new
            </span>
          ) : undefined
        }
      />
      <PanelBody>
        {loading ? (
          <div className="text-[12px] text-textMuted py-2">Loading…</div>
        ) : feedbacks.length === 0 ? (
          <EmptyState title="No feedback yet" description="When someone sends you feedback, it will appear here." />
        ) : (
          <div className="flex flex-col gap-2.5">
            {unreadCount > 0 && (
              <div className="flex justify-end">
                <Button variant="ghost" onClick={markAllRead} className="!px-2 !py-0.5 !text-[11px]">
                  Mark all read
                </Button>
              </div>
            )}
            {(feedbacks || []).map((f) => (
              <div
                key={f.id}
                className={`flex flex-col gap-2 rounded-md border p-3 ${f.read ? 'border-transparent' : 'border-accentBorder/40 bg-accent/3'}`}
              >
                <div className="flex items-start gap-2.5">
                  <Avatar initials={f.sender?.initials || '··'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold">{f.sender?.name || 'Someone'}</span>
                      <span className="text-[10px] font-mono text-textMuted">{timeAgo(f.createdAt)}</span>
                      {!f.read && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--status-progress)' }} />}
                    </div>
                    {f.project && (
                      <div className="text-[10.5px] text-textMuted font-mono mt-0.5">
                        regarding "{f.project.title}"
                      </div>
                    )}
                    <div className="text-[12px] text-textMuted mt-1 leading-relaxed">{f.message}</div>
                  </div>
                  {!f.read && (
                    <button
                      onClick={() => markRead(f.id)}
                      aria-label="Mark as read"
                      className="text-[10px] text-textMuted hover:text-text flex-shrink-0 mt-0.5 transition-colors"
                    >
                      Read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </PanelBody>
    </Panel>
  )
}
