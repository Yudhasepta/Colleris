import StatusBadge from '../ui/StatusBadge.jsx'

export default function GroupCard({ group, onOpen }) {
  const urgentCount = group.projects.filter((p) => p.status === 'urgent').length

  const groupTypeLabel = group.groupTypeLabel || (group.hasSupervisor ? 'Supervised Projects' : 'Collaborating Team Projects')
  const isSupervised = !!group.hasSupervisor
  return (
    <div
      onClick={() => onOpen(group)}
      className="rounded-md p-3.5 cursor-pointer hover:border-accentBorder hover:bg-surfaceHover transition-colors focus-within:border-accentBorder"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="text-[13.5px] font-semibold truncate">{group.name}</div>
        <span
          className={`text-[9.5px] font-mono uppercase tracking-wide px-1.5 py-[3px] rounded-md flex-shrink-0 ${isSupervised ? 'bg-accent text-onAccent' : 'bg-statusInfo text-onStatusInfo'}`}
        >
          {groupTypeLabel}
        </span>
      </div>
      <div className="text-[11px] text-textMuted font-mono mb-2.5">
        {group.members.length} members · {group.projects.length} projects · {isSupervised ? 'supervised' : 'peer'}
      </div>
      <div className="flex items-center gap-2 min-h-[24px]">
        {urgentCount > 0 && <StatusBadge status="urgent" />}
        {urgentCount === 0 && group.projects.length > 0 && <StatusBadge status="progress" />}
      </div>
    </div>
  )
}
