import StatusIcon from '../ui/StatusIcon.jsx'

const ORDER = [
  { status: 'urgent', label: 'Urgent' },
  { status: 'wait', label: 'On-Wait' },
  { status: 'progress', label: 'In-Progress' },
  { status: 'completed', label: 'Completed' },
]

export default function StatGrid({ projects }) {
  const counts = projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border border-y border-border mb-6">
      {ORDER.map(({ status, label }) => (
        <div key={status} className="px-2 sm:px-3 py-3.5 flex flex-col gap-1.5 min-w-0 first:pl-0">
          <div className="flex items-center gap-1.5">
            <StatusIcon status={status} className="w-3 h-3 block text-textMuted shrink-0" />
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-textMuted truncate">{label}</span>
          </div>
          <span className="font-display text-[22px] font-bold leading-none tracking-tight" style={{ color: `var(--status-${status})` }}>
            {counts[status] || 0}
          </span>
        </div>
      ))}
    </div>
  )
}
