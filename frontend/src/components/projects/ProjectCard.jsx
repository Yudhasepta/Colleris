import StatusBadge from '../ui/StatusBadge.jsx'
import ProgressBar from './ProgressBar.jsx'

function tagBadges(project) {
  const raw = project.tags || []
  if (raw.length > 0) {
    return Array.isArray(raw[0]) ? [] : raw
  }
  // Fallback for legacy single-string tag
  if (project.tag) {
    return project.tag.split(',').map((s) => ({ name: s.trim() })).filter(Boolean)
  }
  return []
}

export default function ProjectCard({ project, onOpen, onEdit, onDelete }) {
  const tasks = project.tasks || []
  const total = tasks.length
  const completed = tasks.filter((t) => t.completed).length
  const progress = total > 0 ? Math.floor((completed / total) * 100) : (project.progress ?? 0)
  const status = project.status
  const tags = tagBadges(project)

  return (
    <div
      onClick={() => onOpen(project)}
      className="group bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[var(--card-radius)] p-3.5 cursor-pointer hover:border-accentBorder hover:bg-surfaceHover hover:translate-y-[-1px] transition-[border-color,background,transform,box-shadow] duration-[var(--primitive-duration-normal)] ease-out focus-within:border-accentBorder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
      style={{ boxShadow: 'var(--card-top-highlight)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-[13.5px] font-semibold leading-snug tracking-tight line-clamp-2">{project.title}</div>
        <StatusBadge status={status} />
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {tags.map((t, i) => (
            <span
              key={i}
              className="rounded-md border border-border bg-surface2 text-textMuted"
            >
              {typeof t === 'string' ? t : t.name}
            </span>
          ))}
        </div>
      )}

      {/* Technical metadata — compact mono line. The task count lives in the
          progress caption below, so it is not repeated here. */}
      <div className="flex items-center gap-2 text-[11px] text-textMuted font-mono mb-3">
        {project.id && <span className="text-[10px] uppercase tracking-wide truncate">{String(project.id).slice(0, 8)}</span>}
        {project.due && (
          <>
            <span className="text-border">/</span>
            <span className="truncate">{project.due}</span>
          </>
        )}
      </div>

      {/* Progress — read-only derived bar */}
      {total === 0 ? (
        <div className="text-[11px] text-textMuted font-mono py-1">No tasks yet — add tasks to track progress</div>
      ) : (
        <ProgressBar progress={progress} completed={completed} total={total} status={status} compact={false} />
      )}

      <div className="flex items-center justify-end gap-0.5 mt-2 min-h-[22px]">
        <div className="flex gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onEdit(project)}
            aria-label="Edit project"
            className="w-6 h-6 p-1 rounded flex items-center justify-center text-textMuted hover:text-text hover:bg-surface2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(project)}
            aria-label="Delete project"
            className="w-6 h-6 p-1 rounded flex items-center justify-center text-textMuted hover:text-danger hover:bg-surface2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
