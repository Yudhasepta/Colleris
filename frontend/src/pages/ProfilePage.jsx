import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Avatar from '../components/ui/Avatar.jsx'
import Button from '../components/ui/Button.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useConnections } from '../hooks/useConnections.js'
import { api } from '../api/client.js'
import { failure } from '../utils/actionStatus.js'

export default function ProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isGuest } = useAuth()
  const { connectionIds } = useConnections(user?.id)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState(null)
  const [reminderMsg, setReminderMsg] = useState('')

  // Redirect to own profile if "me" is requested
  const targetId = id === 'me' ? String(user?.id) : id
  const isSelfView = !!user && targetId === String(user.id)

  // For own profile, derive immediately from AuthContext to skip the extra API call.
  useEffect(() => {
    if (!targetId) return
    setLoading(true)
    setProfile(null)
    setError('')

    if (isSelfView) {
      setProfile({
        id: user.id,
        name: user.name,
        initials: user.initials || '··',
        userId: user.userId,
        connections: user.connections ?? 0,
        visibility: user.visibility ?? 'private',
        visibilityLabel: '—',
        isConnected: true,
        isMine: true,
      })
      setLoading(false)
      return
    }

    api(`/users/${targetId}`)
      .then((data) => setProfile(data.profile))
      .catch((err) => setError(err.message || 'Could not load profile.'))
      .finally(() => setLoading(false))
  }, [targetId, isSelfView, user])

  const isConnected = isSelfView || (profile ? connectionIds.includes(profile.id) : false)

  async function sendReminder() {
    if (!profile) return
    setSending(true)
    setNotice(null)
    try {
      await api(`/reminders/${profile.id}`, {
        method: 'POST',
        body: { message: reminderMsg.trim() || `Reminder from your connection — please follow up on our latest project.` },
      })
      setNotice({ tone: 'ok', text: 'Reminder sent.' })
      setReminderMsg('')
    } catch (err) {
      const f = failure(err)
      setNotice({ tone: 'err', text: f.message })
    } finally {
      setSending(false)
    }
  }

  async function handleDisconnect() {
    if (!profile) return
    try {
      await api(`/connections/${profile.id}`, { method: 'DELETE' })
      navigate(-1)
    } catch (err) {
      setError(failure(err).message)
    }
  }

  if (isGuest) {
    return (
      <section className="px-5 md:px-8 py-6 max-w-2xl mx-auto">
        <PageHeader index="PROFILE" title="Sign in required" description="You need to be logged in to view profiles." />
        <EmptyState title="Authentication required" description="Log in or register to view other users' profiles." />
      </section>
    )
  }

  if (loading) {
    return (
      <section className="px-5 md:px-8 py-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-center h-40 text-textMuted font-mono text-sm">Loading profile…</div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="px-5 md:px-8 py-6 max-w-2xl mx-auto">
        <PageHeader index="PROFILE" title="Not found" description={error} />
        <Button variant="default" onClick={() => navigate('/others')}>← Back to directory</Button>
      </section>
    )
  }

  if (!profile) return null

  const projects = profile.projects || null
  const canRemind = isConnected && !profile.isMine

  return (
    <section className="px-5 md:px-8 py-6 max-w-2xl mx-auto">
      <PageHeader
        index="PROFILE"
        title="User profile"
        description={profile.userId ? `Public profile · ${profile.visibilityLabel || ''}` : 'Profile'}
        meta={
          profile.isMine
            ? <span className="text-[11px] font-mono text-textMuted">Your profile</span>
            : isConnected
              ? <span className="text-[11px] font-mono text-textMuted">Connected</span>
              : null
        }
      />

      <div className="rounded-md p-5">
        <div className="flex items-center gap-4">
          <Avatar initials={profile.initials || '··'} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="font-display text-[18px] font-bold truncate">{profile.name}</div>
            <div className="text-[11px] text-textMuted font-mono mt-0.5">
              {profile.userId || '—'} · {profile.connections} connections · {profile.visibilityLabel || 'private'}
            </div>
          </div>
          {!profile.isMine && (
            <div className="flex gap-2 flex-shrink-0">
              {isConnected ? (
                <Button variant="default" onClick={handleDisconnect}>Disconnect</Button>
              ) : (
                <Button variant="primary" onClick={() => navigate('/others')}>Connect via Others</Button>
              )}
            </div>
          )}
        </div>

        {/* Projects */}
        <div className="mt-5 pt-4 border-t border-border">
          <div className="text-[10.5px] uppercase tracking-wide text-textMuted font-semibold mb-2.5">Projects</div>
          {projects ? (
            <div className="flex flex-col gap-1.5">
              {projects.length === 0 && (
                <div className="rounded-md px-3 py-2.5">No public projects.</div>
              )}
              {projects.map((p) => (
                <div key={p.id} className="rounded-md px-3 py-2">
                  <span className="text-[12.5px] font-medium truncate">{p.title}</span>
                  <span className="text-[11px] text-textMuted font-mono flex-shrink-0">{p.progress}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md px-3 py-2.5">
              {profile.visibilityLabel || 'Projects are not visible to you'}
            </div>
          )}
        </div>

        {/* Send reminder */}
        {canRemind && (
          <div className="mt-5 pt-4 border-t border-border">
            <div className="text-[10.5px] uppercase tracking-wide text-textMuted font-semibold mb-2">Send a nudge</div>
            <textarea
              value={reminderMsg}
              onChange={(e) => setReminderMsg(e.target.value)}
              placeholder={`Nudge ${profile.name} about a project…`}
              className="rounded-md border border-border bg-bg text-text text-[13px] min-h-[70px] resize-y focus:outline-none focus:border-accent transition-colors"
            />
            {notice && (
              <div className="text-[11.5px] mt-2" style={{ color: notice.tone === 'ok' ? 'var(--mint)' : 'var(--danger)' }}>
                {notice.text}
              </div>
            )}
            <Button
              className="w-full justify-center mt-2.5"
              disabled={sending}
              onClick={sendReminder}
            >
              {sending ? 'Sending…' : reminderMsg.trim() ? 'Send reminder' : 'Send nudge'}
            </Button>
          </div>
        )}

        {error && <div className="mt-3 text-[11.5px] text-danger">{error}</div>}
      </div>

      <div className="mt-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>← Back</Button>
      </div>
    </section>
  )
}
