import { useEffect, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Field, { TextInput } from '../ui/Field.jsx'
import { failure } from '../../utils/actionStatus.js'

export default function JoinGroupModal({ open, onClose, onJoin }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    if (!open) {
      setCode('')
      setBusy(false)
      setError('')
      setJoined(false)
    }
  }, [open])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!code.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const group = await onJoin(code.trim())
      setJoined(true)
      setTimeout(() => onClose(), 900)
      return group
    } catch (err) {
      const f = failure(err)
      setError(f.message || 'That code could not be used.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth={400}>
      <div className="p-5">
        <div className="font-display text-[16px] font-bold mb-1">Join a group</div>
        <div className="text-[12px] text-textMuted mb-4">Enter a join code shared by a group owner or member.</div>

        {joined ? (
          <div className="text-[13px] font-semibold py-3 text-center" style={{ color: 'var(--mint)' }}>
            You joined the group.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Field label="Join code">
              <TextInput
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. DS-7F4Q"
                autoFocus
                className="font-mono tracking-widest uppercase"
                disabled={busy}
              />
            </Field>
            {error && <div className="rounded-md px-3 py-2">{error}</div>}
            <Button variant="primary" type="submit" disabled={!code.trim() || busy} className="justify-center w-full">
              {busy ? 'Joining…' : 'Join group'}
            </Button>
          </form>
        )}
      </div>
    </Modal>
  )
}
