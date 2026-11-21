// Settings panel chrome — the original pulseboard panel design:
// bordered card with a titled header row and a padded body.
export default function Panel({ className = '', children }) {
  return <div className={`bg-surface border border-border rounded-lg overflow-hidden ${className}`}>{children}</div>
}

export function PanelHead({ title, description, action }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap px-5 py-4 border-b border-border">
      <div className="min-w-0">
        <h2 className="font-display text-[15px] font-semibold leading-tight tracking-tight">{title}</h2>
        {description && <p className="text-[11.5px] text-textMuted mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function PanelBody({ className = '', children }) {
  return <div className={`p-5 ${className}`}>{children}</div>
}
