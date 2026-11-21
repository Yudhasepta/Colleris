import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import { useState } from 'react'
import { failure } from '../../utils/actionStatus.js'

export default function GuideEditor({ open, onClose, project, onSave, hasGuidePermission }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!project) return null

  return (
    <Modal open={open} onClose={onClose} maxWidth={520}>
      <div className="p-5">
        <div className="font-display text-[16px] font-bold">Project guide</div>
        <div className="text-[11px] text-textMuted mt-0.5">
          Internal notes visible only to you — share context without cluttering tasks.
        </div>

        {!hasGuidePermission && (
          <div className="rounded-md px-3 py-2">
            Your account doesn't have guide-upload permission enabled in Settings.
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a guide note for this project…"
          rows={8}
          maxLength={2000}
          disabled={!hasGuidePermission || saving}
          className="rounded-md border border-border bg-bg text-text text-[13px] placeholder:text-textMuted focus:outline-none focus:border-accent focus:ring-2 focus:ring-[color:var(--focus-ring)] transition-[border-color,box-shadow] resize-y min-h-[90px] leading-relaxed mt-4"
        />
        <div className="text-[10px] font-mono text-textMuted mt-1 text-right">{text.length}/2000</div>

        {error && <div className="text-[11px] text-danger mt-2">{error}</div>}

        <div className="flex gap-2 mt-4 justify-end">
          <Button variant="ghost" className="!px-3 !py-1.5 !text-[12px]" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="!px-3 !py-1.5 !text-[12px]"
            disabled={saving || !hasGuidePermission}
            onClick={async () => {
              setSaving(true)
              setError('')
              try {
                await onSave(text.trim())
                onClose()
              } catch (e) {
                setError(failure(e).message)
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? 'Saving…' : 'Save guide'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
