import { useState } from 'react'
import Button from '../ui/Button.jsx'
import { Select } from '../ui/Field.jsx'
import Panel, { PanelHead, PanelBody } from '../ui/Panel.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

function formatRemaining(expiresAt) {
  if (!expiresAt) return null
  const ms = expiresAt - Date.now()
  if (ms <= 0) return 'Expired'
  const hours = Math.floor(ms / 3600000)
  const mins = Math.floor((ms % 3600000) / 60000)
  return hours > 0 ? `Expires in ${hours}h ${mins}m` : `Expires in ${mins}m`
}

export default function ProfileCodeSection() {
  const { user, generateProfileCode } = useAuth()
  const [duration, setDuration] = useState('24')
  const [copied, setCopied] = useState(false)

  function handleGenerate() {
    generateProfileCode(Number(duration))
    setCopied(false)
  }

  function handleCopy() {
    if (!user.profileCode) return
    navigator.clipboard?.writeText(user.profileCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const active = user.profileCode && user.profileCodeExpiresAt > Date.now()

  return (
    <Panel>
      <PanelHead title="Profile Code" description="Temporary code so someone can find you without a connection request." />
      <PanelBody>
        <div className="max-w-md">
          {active ? (
            <div className="rounded-md px-3 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-[14px] font-bold tracking-wider truncate">{user.profileCode}</div>
                <div className="text-[11px] text-textMuted mt-0.5">{formatRemaining(user.profileCodeExpiresAt)}</div>
              </div>
              <Button onClick={handleCopy} className="flex-shrink-0">
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          ) : (
            <div className="text-[12.5px] text-textMuted bg-surface2 rounded-md px-3 py-2.5">No active code.</div>
          )}

          <div className="flex gap-2 mt-2.5">
            <Select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-32">
              <option value="1">1 hour</option>
              <option value="24">24 hours</option>
              <option value="168">7 days</option>
            </Select>
            <Button variant="primary" onClick={handleGenerate}>
              Generate new code
            </Button>
          </div>
        </div>
      </PanelBody>
    </Panel>
  )
}
