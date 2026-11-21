import StatusIcon from './StatusIcon.jsx'

const CONFIG = {
  wait: { label: 'On-Wait', var: '--status-wait' },
  progress: { label: 'In-Progress', var: '--status-progress' },
  urgent: { label: 'Urgent', var: '--status-urgent' },
  completed: { label: 'Completed', var: '--status-completed' },
}

export default function StatusBadge({ status, className = '' }) {
  const cfg = CONFIG[status]
  if (!cfg) return null
  const color = `var(${cfg.var})`

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-1.5 pr-2.5 text-[11px] font-semibold whitespace-nowrap ${className}`}
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
    >
      <span className="w-3 h-3 flex-shrink-0">
        <StatusIcon status={status} spin />
      </span>
      {cfg.label}
    </span>
  )
}
