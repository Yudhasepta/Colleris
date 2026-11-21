import { useAuth } from '../../context/AuthContext.jsx'
import Panel, { PanelHead, PanelBody } from '../ui/Panel.jsx'

const ROWS = [
  { key: 'projectAssignment', label: 'Project Assignment', description: 'Others assigning a project directly to you.' },
  { key: 'guideUpload', label: 'Guide / File Upload', description: 'Others uploading guides or resources to your projects.' },
  { key: 'feedback', label: 'Feedback', description: 'Others leaving feedback on your project progress.' },
]

const STATES = [
  { value: 'allow', label: 'Allow' },
  { value: 'request', label: 'Request' },
  { value: 'decline', label: 'Decline' },
]

export default function PermissionsSection() {
  const { user, updatePermissions } = useAuth()

  return (
    <Panel>
      <PanelHead title="Permissions" description="What a supervisor or connection can do without asking first." />
      <PanelBody>
        <div className="max-w-md divide-y divide-border/60">
          {ROWS.map((row) => (
            <div key={row.key} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-medium">{row.label}</span>
                  <span className="block text-[11.5px] text-textMuted mt-0.5">{row.description}</span>
                </span>
                <span className="flex gap-1 flex-shrink-0" role="group" aria-label={row.label}>
                  {STATES.map((s) => {
                    const active = user.permissions[row.key] === s.value
                    const isDecline = s.value === 'decline'
                    return (
                      <button
                        key={s.value}
                        onClick={() => updatePermissions({ [row.key]: s.value })}
                        aria-pressed={active}
                        className={`rounded-md border px-2.5 py-1 text-[11.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] ${
                          active
                            ? isDecline
                              ? 'border-warnBorder bg-surface2 text-warn'
                              : 'border-accent bg-surface2 text-text'
                            : 'border-border text-textMuted hover:bg-surface2 hover:text-text'
                        }`}
                      >
                        {s.label}
                      </button>
                    )
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </PanelBody>
    </Panel>
  )
}
