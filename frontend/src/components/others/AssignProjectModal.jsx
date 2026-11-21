import { useEffect, useState } from 'react'
import Button from '../ui/Button.jsx'
import Modal from '../ui/Modal.jsx'
import Avatar from '../ui/Avatar.jsx'
import Field, { TextInput } from '../ui/Field.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { failure } from '../../utils/actionStatus.js'

export default function AssignProjectModal({ open, onClose, group, onAssign }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [memberId, setMemberId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const currentUserId = user?.id
  const isSupervised = !!group?.hasSupervisor
  const canAssignOthers = !isSupervised || !!group?.isOwner || !!group?.isSupervisor
  const assignableMembers = canAssignOthers
    ? group?.members || []
    : (group?.members || []).filter((m) => String(m.id) === String(currentUserId))
  const selectedSelf = String(memberId) === String(currentUserId)

  useEffect(() => {
    if (!open) return
    const preferred = assignableMembers.find((m) => String(m.id) !== String(currentUserId)) || assignableMembers[0]
    setTitle('')
    setMemberId(preferred?.id ?? null)
    setBusy(false)
    setError('')
    setResult(null)
    // assignableMembers and currentUserId are derived props; stable across re-renders with same group/user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group, user])

  if (!group) return null

  const resultCopy = {
    approved: {
      tone: 'var(--mint)',
      text: selectedSelf ? 'Assigned — the project was created for you.' : 'Assigned — the project was created for the member.',
    },
    pending: { tone: 'var(--warn)', text: 'Request sent — the member must approve it before the project is created.' },
    declined: { tone: 'var(--danger)', text: 'Declined — this member does not accept project assignment.' },
  }

  async function handleSubmit() {
    if (!title.trim() || !memberId) return
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const res = await onAssign(group.id, { title: title.trim(), recipientId: memberId })
      setResult({
        status: res.assignment?.status || 'pending',
        assignment: res.assignment,
        project: res.project,
      })
    } catch (err) {
      setError(failure(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth={440}>
      <div className="p-5">
        <div className="font-display text-[17px] font-bold mb-1">Assign a project</div>
        <div className="text-[11.5px] text-textMuted">
          From <span className="text-textMuted font-semibold">{group.name}</span>. Self-assignment is created immediately; assignments to
          other members follow their permission.
        </div>

        <div className="flex flex-col gap-3 mt-4">
          <Field label="Project / note title">
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Brand deck for pitch"
              autoFocus
              disabled={busy}
            />
          </Field>

          <Field label="Assign to">
            {assignableMembers.length === 0 ? (
              <div className=" rounded-md border border-dashed border-border bg-surface2 px-3 py-2.5 text-[12px] text-textMuted">
                You are not listed as a member of this group yet.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {assignableMembers.map((m) => {
                  const active = String(memberId) === String(m.id)
                  const self = String(m.id) === String(currentUserId)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`rounded-md px-2.5 py-1.5 text-[11.5px] transition-colors disabled:opacity-50 ${
                        active ? 'bg-accent-soft-gradient' : 'bg-surface2 hover:bg-surfaceHover'
                      }`}
                      style={{ border: active ? '1px solid var(--accent)' : '1px solid var(--border)' }}
                      disabled={busy}
                    >
                      <Avatar initials={m.initials} size="sm" />
                      <span className="truncate">
                        {m.name}
                        {self ? ' (you)' : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            {!canAssignOthers && (
              <div className="text-[11px] text-textMuted mt-2">Only the owner or supervisor can assign projects to other members.</div>
            )}
          </Field>
        </div>

        {result && (
          <div
            className=" rounded-md px-3 py-2.5 text-[12.5px]"
            style={{
              color: resultCopy[result.status]?.tone,
              background: 'color-mix(in srgb, var(--surface2) 60%, transparent)',
              border: `1px solid ${resultCopy[result.status]?.tone}`,
            }}
          >
            {resultCopy[result.status]?.text}
          </div>
        )}
        {error && <div className="text-[11.5px] text-danger mt-3">{error}</div>}

        <div className="flex justify-between gap-2 mt-5">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" disabled={!title.trim() || !memberId || busy} onClick={handleSubmit}>
            {busy ? 'Creating…' : selectedSelf ? 'Assign to myself' : 'Assign / request'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
