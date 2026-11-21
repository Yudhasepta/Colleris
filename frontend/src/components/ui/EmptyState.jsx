export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {icon && <div className="w-10 h-10 rounded-full bg-surface2 flex items-center justify-center text-textMuted mb-3">{icon}</div>}
      <div className="font-display text-[14px] font-semibold">{title}</div>
      {description && <div className="text-[12.5px] text-textMuted mt-1 max-w-xs">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
