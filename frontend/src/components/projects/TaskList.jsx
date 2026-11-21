import { useState } from 'react'
import TaskItem from './TaskItem.jsx'
import Button from '../ui/Button.jsx'
import { TextInput } from '../ui/Field.jsx'

export default function TaskList({
  tasks = [],
  onAdd,
  onToggle,
  onUpdate,
  onDelete,
  onReorder,
  disabled = false,
  canAdd = true,
  canToggle = true,
  canEdit = true,
  canDelete = true,
}) {
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)
  const [reordering, setReordering] = useState(false)

  const total = tasks.length
  const completed = tasks.filter((t) => t.completed).length

  async function handleAdd(e) {
    e.preventDefault()
    const t = newTitle.trim()
    if (!t || !canAdd) return
    setAdding(true)
    setError(null)
    try {
      await onAdd(t)
      setNewTitle('')
    } catch (err) {
      setError(err.errors?.title?.[0] || err.message || 'Failed to add task')
    } finally {
      setAdding(false)
    }
  }

  async function move(index, dir) {
    if (!onReorder || reordering || !canEdit) return
    const next = [...tasks]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    setReordering(true)
    setError(null)
    try {
      await onReorder(next.map((t) => t.id))
    } catch (err) {
      setError(err.message || 'Failed to reorder tasks')
    } finally {
      setReordering(false)
    }
  }

  if (!tasks) return <div className="text-sm text-textMuted font-mono">Loading tasks…</div>

  return (
    <div className="flex flex-col gap-3">
      {/* Derived progress is shown by parent ProgressBar; here we just list */}
      {total === 0 ? (
        <div className="rounded-md p-4 text-center">
          <div className="text-[13px] font-medium text-textMuted">No tasks yet</div>
          <div className="text-[12px] text-textMuted mt-1">
            Create tasks to make progress measurable. Completion is validated on the server.
          </div>
        </div>
      ) : (
        <div className="rounded-md divide-y divide-border/40">
          {tasks.map((t, idx) => (
            <TaskItem
              key={t.id}
              task={t}
              index={idx}
              total={total}
              onToggle={onToggle}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onMove={onReorder && canEdit ? move : undefined}
              moving={reordering}
              canToggle={canToggle}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}

      {canAdd ? (
        <form onSubmit={handleAdd} className="flex gap-2">
          <TextInput
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add task — e.g. Draft wireframes"
            disabled={disabled || adding}
            className="flex-1"
          />
          <Button type="submit" variant="primary" disabled={disabled || adding || !newTitle.trim()} className="shrink-0">
            {adding ? 'Adding…' : 'Add'}
          </Button>
        </form>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-surface2/60 px-3 py-2 text-[11.5px] text-textMuted">
          Only the project admin can add, rename, reorder, or delete tasks. You can still complete tasks; progress updates automatically.
        </div>
      )}
      {error && <div className="text-[12px] text-danger font-mono">{error}</div>}
      {total > 0 && (
        <div className="text-[11px] font-mono text-textMuted">
          {completed}/{total} tasks complete — progress is derived, not manual.
        </div>
      )}
    </div>
  )
}
