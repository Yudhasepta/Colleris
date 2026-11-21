import { useEffect, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Avatar from '../ui/Avatar.jsx'
import { TextInput } from '../ui/Field.jsx'
import { failure } from '../../utils/actionStatus.js'

// Search the public directory and invite a user to a group. Invitation state
// (pending / accepted / declined / already a member) is shown inline — never
// silently dropped.
export default function InviteMemberModal({ open, onClose, group, onInvite }) {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState('userId')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [outcome, setOutcome] = useState({})
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setOutcome({})
      setBusy(null)
    }
  }, [open])

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setOutcome({})
    try {
      setResults(await onInvite.search(mode, query.trim()))
    } catch (err) {
      setOutcome({ search: failure(err).message })
    } finally {
      setSearching(false)
    }
  }

  const isMember = (id) => (group?.members || []).some((m) => String(m.id) === String(id))

  async function invite(id) {
    setBusy(id)
    setOutcome((prev) => ({ ...prev, [id]: null }))
    try {
      const res = await onInvite.invite(group.id, id)
      setOutcome((prev) => ({ ...prev, [id]: (res.invitation && `Invited — ${res.invitation.status}`) || 'ok' }))
      if (res.group) onInvite.updateGroup(res.group)
    } catch (err) {
      setOutcome((prev) => ({ ...prev, [id]: failure(err).message }))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth={440}>
      <div className="p-5">
        <div className="font-display text-[16px] font-bold mb-1">Invite to {group?.name}</div>
        <div className="text-[12px] text-textMuted mb-4">Find a user and send them an invitation to join.</div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="rounded-md border border-border bg-bg text-text text-[13px] focus:outline-none focus:border-accent"
          >
            <option value="userId">User ID</option>
            <option value="profileCode">Profile Code</option>
          </select>
          <div className="relative flex-1 min-w-0">
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Who do you want to invite?"
              className="w-full"
              disabled={searching}
            />
          </div>
          <Button type="submit" disabled={!query.trim() || searching} className="flex-shrink-0">
            {searching ? '…' : 'Search'}
          </Button>
        </form>

        {outcome.search && <div className="text-[12px] text-danger mt-3">{outcome.search}</div>}

        {results.length > 0 && (
          <div className="rounded-md divide-y divide-border">
            {results.map((r) => {
              const already = isMember(r.id)
              const res = outcome[r.id]
              return (
                <div key={r.id} className="flex items-center gap-2.5 px-3 py-2.5">
                  <Avatar initials={r.initials} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium truncate">{r.name}</div>
                    <div className="text-[10.5px] text-textMuted font-mono truncate">{r.userId}</div>
                  </div>
                  {res ? (
                    <span
                      className="text-[11px] font-semibold text-right max-w-[160px] truncate"
                      style={{ color: res.includes('Invited') ? 'var(--mint)' : 'var(--danger)' }}
                    >
                      {res}
                    </span>
                  ) : (
                    <Button
                      className="!px-2.5 !py-1 !text-[11px] flex-shrink-0"
                      variant={already ? 'default' : 'primary'}
                      disabled={already || busy === r.id}
                      onClick={() => invite(r.id)}
                    >
                      {already ? 'Member' : busy === r.id ? '…' : 'Invite'}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}
