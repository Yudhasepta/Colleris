import { useTheme } from '../../context/ThemeContext.jsx'
import StatusIcon from '../ui/StatusIcon.jsx'
import Panel, { PanelHead, PanelBody } from '../ui/Panel.jsx'

const STATUS_LEGEND = [
  { status: 'wait', label: 'On wait — neutral, not started' },
  { status: 'urgent', label: 'Urgent — needs attention now' },
  { status: 'progress', label: 'In progress — active work' },
  { status: 'completed', label: 'Completed — locked until reopened' },
]

export default function ThemeSection({ isGuest }) {
  const { mode, setMode, preset, setPreset, presets } = useTheme()

  return (
    <Panel>
      <PanelHead title="Appearance" description={`For this device${isGuest ? '' : ' plus custom presets, stored on your account'}.`} />
      <PanelBody className="flex flex-col gap-5">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-textMuted font-semibold mb-2">Mode</div>
          <div className="relative flex items-center gap-1.5 bg-bg border border-border rounded-full p-1 max-w-[220px]" role="group" aria-label="Theme mode">
            <div
              className="absolute top-1 bottom-1 rounded-full bg-text transition-transform"
              style={{ width: 'calc(50% - 4px)', left: 4, transform: mode === 'light' ? 'translateX(100%)' : 'translateX(0%)' }}
            />
            {['dark', 'light'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`relative z-[1] flex-1 py-[9px] rounded-full text-[12.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] ${
                  mode === m ? 'text-bg' : 'text-textMuted'
                }`}
              >
                {m === 'dark' ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[13px] h-[13px]">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[13px] h-[13px]">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                  </svg>
                )}
                {m === 'dark' ? 'Dark' : 'Light'}
              </button>
            ))}
          </div>
        </div>

        {isGuest ? (
          <div className="text-[12px] text-textMuted bg-surface2 rounded-md px-3 py-2.5">
            Log in to unlock custom themes and import ones shared by other users.
          </div>
        ) : (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-textMuted font-semibold mb-1.5">Theme</div>
            {(() => {
              const defaults = presets.filter((p) => !p.special)
              const specials = presets.filter((p) => p.special)
              return (
                <>
                  <PresetRows presets={defaults} current={preset} onPick={(id) => setPreset(id)} />
                  {specials.length > 0 && (
                    <div className="mt-4">
                      <div className="text-[11px] uppercase tracking-wide text-textMuted font-semibold mb-1.5">Special theme</div>
                      <PresetRows presets={specials} current={preset} onPick={(id) => setPreset(id)} />
                      <div className="text-[11px] text-textMuted mt-2">
                        Special themes change font and colour together — a preview of the personality a user-imported theme could bring.
                      </div>
                    </div>
                  )}
                  <div className="text-[11px] text-textMuted mt-3">
                    Importing themes shared by other users isn't available yet — your presets are stored on your Colleris account.
                  </div>
                </>
              )
            })()}
          </div>
        )}

        <div>
          <div className="text-[11px] uppercase tracking-wide text-textMuted font-semibold mb-2">Status colours (fixed)</div>
          <div className="flex flex-col gap-2">
            {STATUS_LEGEND.map(({ status, label }) => (
              <div key={status} className="flex items-center gap-2.5 text-[12px] text-textMuted">
                <span className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `var(--status-${status})` }}>
                  <StatusIcon status={status} className="w-full h-full" />
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </PanelBody>
    </Panel>
  )
}

function PresetRows({ presets, current, onPick }) {
  return (
    <div className="flex flex-col">
      {presets.map((p) => (
        <button
          key={p.id}
          onClick={() => onPick(p.id)}
          className={`flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] ${
            current === p.id ? 'bg-surface2' : 'hover:bg-surface2/60'
          }`}
        >
          <span className="flex gap-1 flex-shrink-0" aria-hidden="true">
            {p.preview.map((hex, i) => (
              <span key={i} className="w-3 h-3 rounded-full border border-black/10" style={{ background: hex }} />
            ))}
          </span>
          <span className="text-[12.5px] font-medium flex-1 min-w-0 truncate" style={{ fontFamily: p.font || "'Inter', sans-serif" }}>
            {p.name}
          </span>
          {current === p.id && (
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" className="w-3.5 h-3.5 flex-shrink-0">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </button>
      ))}
    </div>
  )
}
