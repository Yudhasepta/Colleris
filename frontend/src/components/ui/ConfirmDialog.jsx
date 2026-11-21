import Modal from './Modal.jsx'
import Button from './Button.jsx'

export default function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Delete' }) {
  return (
    <Modal open={open} onClose={onClose} maxWidth={360}>
      <div className="p-5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center mb-3.5"
          style={{ background: 'color-mix(in srgb, var(--danger) 15%, transparent)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.2" className="w-[18px] h-[18px]">
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.3 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.7 3.86a2 2 0 0 0-3.4 0z" />
          </svg>
        </div>
        <div className="font-display text-[15.5px] font-bold">{title}</div>
        {description && <div className="text-[12.5px] text-textMuted mt-1">{description}</div>}
        <div className="flex gap-2 mt-5">
          <Button className="flex-1 justify-center" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" className="flex-1 justify-center" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
