import { useAuth } from '../../context/AuthContext.jsx'
import Panel, { PanelHead, PanelBody } from '../ui/Panel.jsx'

const OPTIONS = [
  { value: 'private', label: 'Private / No One', description: 'Nobody can see your projects or profile details.' },
  { value: 'connections', label: 'Connections', description: "Only people you've connected with can see your projects." },
  { value: 'supervisor', label: 'Supervisor', description: 'Only a group supervisor assigned over you can see your projects.' },
  { value: 'everyone', label: 'Everyone', description: 'Anyone who finds your profile can see your projects.' },
]

export default function VisibilitySection() {
  const { user, updateUser } = useAuth()

  return (
    <Panel>
      <PanelHead title="Visibility" description="Who can see your projects when they view your profile." />
      <PanelBody>
        <div className="max-w-md divide-y divide-border/60">
          {OPTIONS.map((opt) => {
            const selected = user.visibility === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => updateUser({ visibility: opt.value })}
                aria-pressed={selected}
                className={`w-full text-left flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] rounded-md ${
                  selected ? '' : 'hover:bg-surface2/40'
                }`}
              >
                <span className="min-w-0">
                  <span className={`block text-[12.5px] ${selected ? 'font-semibold text-text' : 'font-medium text-textMuted'}`}>{opt.label}</span>
                  <span className="block text-[11.5px] text-textMuted mt-0.5">{opt.description}</span>
                </span>
                {selected ? (
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--accent-bg)' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="3" style={{ stroke: 'var(--on-accent)' }} className="w-2.5 h-2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                ) : (
                  <span className="w-4 h-4 rounded-full border border-border flex-shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </PanelBody>
    </Panel>
  )
}
