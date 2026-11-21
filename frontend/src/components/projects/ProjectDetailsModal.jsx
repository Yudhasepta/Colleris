import { useState } from 'react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'
import ProgressBar from './ProgressBar.jsx'
import TaskList from './TaskList.jsx'
import GuideEditor from './GuideEditor.jsx'

export default function ProjectDetailsModal({
  open,
  onClose,
  project,
  onAddTask,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks,
  onComplete,
  onReopen,
  onEdit,
  onDelete,
  onUpdateGuide,
  hasGuidePermission,
}) {
  const [completeError, setCompleteError] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  if (!project) return null

  const tasks = project.tasks || []
  const total = tasks.length
  const completed = tasks.filter((t) => t.completed).length
  const progress = total > 0 ? Math.floor((completed / total) * 100) : (project.progress ?? 0)
  const isCompleted = project.status === 'completed'
  const canComplete = total > 0 && completed === total && !isCompleted
  // Once completed, tasks become read-only until reopened — no edits, adds, or deletes allowed.
  const locked = isCompleted
  const canAddTasks = !locked
  const canManageTasks = !locked
  const completeDisabledReason =
    total === 0 ? 'Create tasks before completion.' : completed !== total ? `${total - completed} tasks remain.` : null

  async function handleComplete() {
    setCompleteError(null)
    setCompleting(true)
    try {
      await onComplete(project.id)
    } catch (e) {
      setCompleteError(e.message || e.errors?.project?.[0] || 'Completion requires all tasks done.')
    } finally {
      setCompleting(false)
    }
  }
  async function handleReopen() {
    setCompleteError(null)
    try {
      await onReopen(project.id)
    } catch (e) {
      setCompleteError(e.message)
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} maxWidth={520}>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <StatusBadge status={project.status} />
            {isCompleted && (
              <span className="rounded-md bg-mint text-white">Completed</span>
            )}
          </div>
          <div className="font-display text-[18px] font-bold mt-3 leading-tight tracking-tight">{project.title}</div>
          <div className="text-[12px] text-textMuted font-mono mt-1 flex items-center gap-2 flex-wrap">
            <span>{project.due || 'No due date'}</span>
            {project.tags && project.tags.length > 0 ? (
              project.tags.map((t, i) => (
                <span key={i}>
                  <span className="text-border">·</span>
                  <span className="ml-1 text-accent">{typeof t === 'string' ? t : t.name}</span>
                </span>
              ))
            ) : project.tag ? (
              <>
                <span className="text-border">·</span>
                <span className="ml-1 text-accent">{project.tag}</span>
              </>
            ) : null}
          </div>

          {/* Guide preview */}
          {project.guide_text && (
            <div className="rounded-md border border-border bg-surface2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10.5px] font-mono uppercase tracking-wide text-textMuted">Guide note</span>
                <Button variant="ghost" className="!px-2 !py-0.5 !text-[11px]" onClick={() => setGuideOpen(true)}>
                  Edit guide
                </Button>
              </div>
              <div className="text-[12.5px] text-textMuted whitespace-pre-wrap max-h-32 overflow-y-auto">{project.guide_text}</div>
            </div>
          )}

          {/* Derived progress — read-only */}
          <div className="mt-5">
            {total === 0 ? (
              <div className="text-[11px] text-textMuted font-mono py-1">No tasks yet — create tasks to make progress measurable.</div>
            ) : (
              <>
                <ProgressBar progress={progress} completed={completed} total={total} status={project.status} />
                <div className="mt-2 flex items-center gap-2 text-[11px] font-mono">
                  <span className={isCompleted ? 'text-mint' : 'text-textMuted'}>
                    {isCompleted ? 'Project completed — progress locked at 100%' : 'Progress derived from tasks'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Tasks — primary surface */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[12px] font-mono uppercase tracking-[0.14em] text-textMuted">Tasks</h3>
              <span className="text-[11px] font-mono text-textMuted">
                {completed}/{total}
              </span>
            </div>
            <TaskList
              tasks={tasks}
              onAdd={canAddTasks ? (title) => onAddTask(project.id, title) : undefined}
              onToggle={(id) => onToggleTask(id)}
              onUpdate={canManageTasks ? (id, data) => onUpdateTask(id, data) : undefined}
              onDelete={canManageTasks ? (id) => onDeleteTask(id) : undefined}
              onReorder={canManageTasks ? (orderedIds) => onReorderTasks?.(project.id, orderedIds) : undefined}
              canAdd={canAddTasks}
              canEdit={canManageTasks}
              canDelete={canManageTasks}
            />
          </div>

          {/* Complete / Reopen */}
          <div className="mt-6 flex flex-col gap-2">
            {!isCompleted ? (
              <>
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  disabled={!canComplete || completing}
                  onClick={handleComplete}
                  title={completeDisabledReason || undefined}
                >
                  {completing ? 'Completing…' : 'Complete Project'}
                </Button>
                {completeDisabledReason && <div className="text-[11px] font-mono text-amber-600">{completeDisabledReason}</div>}
              </>
            ) : (
              <Button variant="default" className="w-full justify-center" onClick={handleReopen}>
                Reopen Project
              </Button>
            )}
            {completeError && (
              <div className="rounded-md px-3 py-2">
                {completeError}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
            <Button className="flex-1 justify-center" onClick={() => onEdit(project)}>
              Edit details
            </Button>
            <Button variant="danger" className="flex-1 justify-center" onClick={() => onDelete(project)}>
              Archive
            </Button>
          </div>
          <div className="text-[10.5px] text-textMuted text-center mt-1">Archived projects can be restored later.</div>
        </div>
      </Modal>

      <GuideEditor
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        project={project}
        onSave={(text) => onUpdateGuide(project.id, text)}
        hasGuidePermission={hasGuidePermission}
      />
    </>
  )
}
