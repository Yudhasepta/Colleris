import { useState } from 'react'

export default function TaskItem({
  task,
  index = 0,
  total = 1,
  onToggle,
  onUpdate,
  onDelete,
  onMove,
  moving = false,
  canToggle = true,
  canEdit = true,
  canDelete = true,
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)

  function save() {
    if (!canEdit) return
    const t = title.trim()
    if (!t || t === task.title) {
      setEditing(false)
      setTitle(task.title)
      return
    }
    onUpdate(task.id, { title: t })
    setEditing(false)
  }

  const number = typeof task.position === 'number' ? task.position + 1 : index + 1

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <button
        type="button"
        onClick={() => onToggle(task.id)}
        disabled={!canToggle}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        aria-pressed={task.completed}
        className={`w-[18px] h-[18px] rounded-full border flex-shrink-0 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] disabled:opacity-40 disabled:cursor-not-allowed ${
          task.completed
            ? 'bg-statusCompleted border-statusCompleted text-bg'
            : 'bg-transparent border-border text-textMuted hover:border-statusCompleted'
        }`}
      >
        {task.completed && (
          <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2.5 6l2 2 4.5-4.5" />
          </svg>
        )}
      </button>
      {editing ? (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') {
              setEditing(false)
              setTitle(task.title)
            }
          }}
          autoFocus
          aria-label="Edit task title"
          className="flex-1 min-w-0 rounded-md px-2 py-1 text-[13px] bg-surface2 border border-accent focus:outline-none"
        />
      ) : (
        <span
          onClick={() => {
            if (canEdit) setEditing(true)
          }}
          className={`flex-1 min-w-0 text-[13px] leading-snug truncate ${canEdit ? 'cursor-text' : 'cursor-default'} ${
            task.completed ? 'line-through text-textMuted' : 'text-text'
          }`}
          title={task.title}
        >
          {task.title}
        </span>
      )}
      <span className="font-mono text-[10px] text-textMuted w-5 text-right flex-shrink-0">#{number}</span>
      {!editing && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {onMove && total > 1 && (
            <span className="flex flex-col gap-0.5 mr-0.5">
              <button
                type="button"
                onClick={() => onMove(index, -1)}
                disabled={moving || index === 0}
                aria-label="Move up"
                className="w-5 h-3.5 flex items-center justify-center text-[9px] text-textMuted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => onMove(index, 1)}
                disabled={moving || index === total - 1}
                aria-label="Move down"
                className="w-5 h-3.5 flex items-center justify-center text-[9px] text-textMuted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ▼
              </button>
            </span>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit task"
              className="w-6 h-6 rounded-md flex items-center justify-center text-textMuted hover:text-text hover:bg-surface2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
            >
              ✎
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              aria-label="Delete task"
              className="w-6 h-6 rounded-md flex items-center justify-center text-textMuted hover:text-danger hover:bg-surface2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  )
}
