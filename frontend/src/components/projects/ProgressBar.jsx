// Read-only derived progress — server is source of truth (project_tasks)
// Shows bar, percentage, and a single task-completion caption. No draggable thumb.
export default function ProgressBar({ progress = 0, completed = 0, total = 0, status = 'wait', compact = false }) {
  const fill = `var(--status-${status})`
  const showCaption = total > 0 && !compact
  return (
    <div className={compact ? '' : 'pt-2.5 border-t border-border'}>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-textMuted">Progress</span>
        <span className="text-[11px] font-mono font-semibold tabular-nums" style={{ color: fill }}>
          {progress}%
        </span>
      </div>
      <div className={`w-full bg-surface2 rounded-full border border-border overflow-hidden ${compact ? 'h-[6px]' : 'h-[8px]'}`}>
        <div className="h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%`, background: fill }} />
      </div>
      {showCaption && (
        <div className="mt-1 text-[11px] font-mono text-textMuted tabular-nums">
          {completed} of {total} tasks complete
        </div>
      )}
    </div>
  )
}
