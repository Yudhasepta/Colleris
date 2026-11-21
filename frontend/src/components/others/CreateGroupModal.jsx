import { useEffect, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Field, { TextInput } from '../ui/Field.jsx'

export default function CreateGroupModal({ open, onClose, onCreate, currentUserId }) {
  const [name, setName] = useState('')
  const [hasSupervisor, setHasSupervisor] = useState(false)

  // Start clean on reopen instead of showing the abandoned draft.
  useEffect(() => {
    if (!open) {
      setName('')
      setHasSupervisor(false)
    }
  }, [open])

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onCreate({
      name,
      hasSupervisor,
      supervisorId: hasSupervisor ? currentUserId : null,
      members: [currentUserId],
      projects: [],
    })
    setName('')
    setHasSupervisor(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth={380}>
      <div className="p-5 pb-0 font-display text-[16px] font-bold">New group</div>
      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3.5">
        <Field label="Group name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Design Studio" required />
        </Field>
        <div>
          <div className="text-xs font-medium text-textMuted mb-2">Structure</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setHasSupervisor(false)}
              className={`flex-1 rounded-md border px-3 py-2.5 text-[12.5px] font-medium ${!hasSupervisor ? 'border-accent text-text bg-surface2' : 'border-border text-textMuted'}`}
            >
              All members
            </button>
            <button
              type="button"
              onClick={() => setHasSupervisor(true)}
              className={`flex-1 rounded-md border px-3 py-2.5 text-[12.5px] font-medium ${hasSupervisor ? 'border-accent text-text bg-surface2' : 'border-border text-textMuted'}`}
            >
              With supervisor (you)
            </button>
          </div>
        </div>
        <Button variant="primary" type="submit" className="justify-center w-full mt-1">
          Create group
        </Button>
      </form>
    </Modal>
  )
}
