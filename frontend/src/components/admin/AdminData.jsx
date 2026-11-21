import { useState } from 'react'
import Button from '../ui/Button.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'

// User data lives in the Laravel database; this panel manages the *device
// cache* only — the localStorage keys used for device sessions (pb_accounts,
// pb_active_account) and theme preferences. Clearing them never touches
// server data; worst case you have to log in again.
function collectKeys() {
  if (typeof window === 'undefined') return []
  const keys = []
  for (let i = 0; i < window.localStorage.length; i++) keys.push(window.localStorage.key(i))
  return keys.filter((k) => k == null || String(k).startsWith('pb_'))
}

export default function AdminData({ onLog }) {
  const [keys, setKeys] = useState(collectKeys)
  const [confirm, setConfirm] = useState(null)

  function refresh() {
    setKeys(collectKeys())
  }

  function wipeAll() {
    keys.forEach((k) => window.localStorage.removeItem(k))
    onLog && onLog('warn', 'Cleared device cache', `${keys.length} localStorage keys removed`)
    refresh()
  }

  return (
    <section className="bg-surface border border-border rounded-lg">
      <header className="px-4 py-3 border-b border-border">
        <div className="text-[11px] uppercase tracking-wide text-textMuted font-semibold">Device cache</div>
        <div className="text-[12px] text-textMuted mt-0.5">
          Browser-only session keys. All project/connection data lives in the server database.
        </div>
      </header>

      <div className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-[12px] text-textMuted">
            {keys.length} localStorage key{keys.length === 1 ? '' : 's'}
          </div>
          <Button variant="danger" onClick={() => setConfirm('wipe')} disabled={keys.length === 0}>
            Clear device cache
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5 min-h-[20px]">
          {keys.length === 0 && <span className="text-[11.5px] text-textMuted">No Colleris keys present.</span>}
          {keys.map((k) => (
            <code key={k} className="rounded-md bg-surface2 text-textMuted font-mono">
              {k}
            </code>
          ))}
        </div>

        <p className="text-[11px] text-textMuted mt-3">
          Removing these keys forgets device sessions (you'll need to log in again) and resets theme preferences, but never deletes server
          data.
        </p>
      </div>

      <ConfirmDialog
        open={confirm === 'wipe'}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null)
          wipeAll()
        }}
        title="Clear the device cache?"
        description="You'll be logged out on this browser and theme preferences reset. Server data is untouched."
        confirmLabel="Clear cache"
      />
    </section>
  )
}
