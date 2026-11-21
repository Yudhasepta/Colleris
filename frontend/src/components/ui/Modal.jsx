import { useEffect } from 'react'

// Prevents accidental dismissal. By default (closeOnOutside=false) users must
// click the ✕ button or call onClose() programmatically. Escape key is also
// blocked unless explicitly enabled. Pass onConfirmClose to run before the
// close fires — return true to allow, false to abort; null means always allow.
export default function Modal({
  open,
  onClose,
  maxWidth = 420,
  children,
  closeOnOutside = false,
  closeOnEscape = false,
  // If provided, runs before closing; returning false cancels the close.
  onConfirmClose,
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') {
        if (!closeOnEscape) return
        if (onConfirmClose) e.preventDefault()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, closeOnEscape, onConfirmClose])

  if (!open) return null

  async function handleBackdropClick(e) {
    if (!closeOnOutside || e.target !== e.currentTarget) return
    if (onConfirmClose) {
      const allow = await onConfirmClose()
      if (!allow) return
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim backdrop-blur-[2px] p-4 animate-[fadeIn_var(--primitive-duration-normal)_ease]"
      onClick={handleBackdropClick}
    >
      <div
        className="relative bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[var(--card-radius)] shadow-panel w-full max-h-[90vh] overflow-y-auto"
        style={{ maxWidth }}
      >
        <button
          onClick={async () => {
            if (onConfirmClose) {
              const allow = await onConfirmClose()
              if (!allow) return
            }
            onClose()
          }}
          aria-label="Close"
          className="absolute top-3 right-3 w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-textMuted hover:bg-surface2 hover:text-text transition-colors duration-[var(--primitive-duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}
