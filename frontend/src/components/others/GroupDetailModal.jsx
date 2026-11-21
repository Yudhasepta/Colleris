import { useEffect, useState } from 'react'
import StatusBadge from '../ui/StatusBadge.jsx'
import Button from '../ui/Button.jsx'
import Modal from '../ui/Modal.jsx'
import Avatar from '../ui/Avatar.jsx'
import ProgressBar from '../projects/ProgressBar.jsx'
import TaskList from '../projects/TaskList.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { failure } from '../../utils/actionStatus.js'
import { api } from '../../api/client.js'

const ROLE_LABEL = { owner: 'Owner', supervisor: 'Supervisor', member: 'Member' }

export default function GroupDetailModal({
  open,
  onClose,
  group,
  onAssign,
  onInvite,
  onRemoveMember,
  onLeave,
  onUpdateProject,
  onAddTask,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks,
  onComplete,
  onReopen,
  onRequestComplete,
  onVote,
  onCancelVote,
}) {
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [actionError, setActionError] = useState('')
  const [projectView, setProjectView] = useState('active')
  const [archivedProjects, setArchivedProjects] = useState([])
  const [loadingArchived, setLoadingArchived] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editAssignee, setEditAssignee] = useState(null)
  const [savingProject, setSavingProject] = useState(false)

  const memberCount = group?.members?.length ?? 0
  const groupTypeLabel = group?.groupTypeLabel || (group?.hasSupervisor ? 'Supervised Projects' : 'Collaborating Team Projects')
  const isCollaborating = !group?.hasSupervisor
  const isSupervised = !!group?.hasSupervisor
  const canManage = group?.isOwner || (group?.hasSupervisor && group.supervisorId === user?.id)
  const isOwnerWithOthers = group?.isOwner && memberCount > 1

  useEffect(() => {
    if (!group) return
    const timer = setTimeout(() => window.dispatchEvent(new Event('colleris-groups-changed')), 600)
    return () => clearTimeout(timer)
  }, [group])

  useEffect(() => {
    if (!group || projectView !== 'archived') return
    setLoadingArchived(true)
    api(`/groups/${group.id}/archived-projects`)
      .then((data) => setArchivedProjects(data.archivedProjects || []))
      .catch(() => setArchivedProjects([]))
      .finally(() => setLoadingArchived(false))
  }, [group, projectView])

  async function handleArchive(projectId) {
    try {
      await api(`/group-projects/${projectId}/archive`, { method: 'POST' })
      setActionError('')
      setProjectView('active')
    } catch (err) {
      setActionError(failure(err).message)
    }
  }

  async function handleRestore(projectId) {
    try {
      await api(`/group-projects/${projectId}/restore`, { method: 'POST' })
      setArchivedProjects((prev) => prev.filter((p) => p.id !== projectId))
      setActionError('')
    } catch (err) {
      setActionError(failure(err).message)
    }
  }

  function copyCode() {
    if (!group.joinCode) return
    navigator.clipboard?.writeText(group.joinCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function removeMember(memberId) {
    setRemoving(memberId)
    setActionError('')
    try {
      await onRemoveMember(group.id, memberId)
    } catch (err) {
      setActionError(failure(err).message)
    } finally {
      setRemoving(null)
    }
  }

  async function runTask(fn) {
    setActionError('')
    try {
      await fn()
    } catch (err) {
      setActionError(failure(err).message)
    }
  }

  function startEditProject(p) {
    setEditingProjectId(p.id)
    setEditTitle(p.title)
    setEditAssignee(p.assigneeId ?? null)
  }

  async function saveProjectEdit(p) {
    setSavingProject(true)
    setActionError('')
    const body = { title: editTitle.trim() || p.title }
    if (editAssignee != null && String(editAssignee) !== String(p.assigneeId ?? '')) {
      body.assigned_user_id = Number(editAssignee)
    }
    try {
      await onUpdateProject(p.id, body)
      setEditingProjectId(null)
    } catch (err) {
      setActionError(failure(err).message)
    } finally {
      setSavingProject(false)
    }
  }

  if (!group || !open) return null

  const activeProjectCards = (group.projects || []).map((p) => {
    const isMyAssigned = p.assigneeId != null && String(p.assigneeId) === String(user?.id)
    const canManageGroupTasks = isSupervised ? canManage : canManage || isMyAssigned
    const canEditProject = isSupervised ? canManage || isMyAssigned : true
    const canReassignUi = isSupervised ? canManage : true
    const locked = p.status === 'completed'
    const canTaskCrud = !locked && canManageGroupTasks
    const tasks = p.tasks || []
    const completedTasks = tasks.filter((t) => t.completed).length
    const votePending = (p.voteStatus ?? p.vote_status) === 'pending'
    const votes = p.votes || []
    const voteApproved = votes.filter((v) => v.vote === 'approved').length
    const voteTotal = p.voteCounts?.total ?? votes.length
    const showEditForm = editingProjectId === p.id

    return (
      <div key={p.id} className="rounded-md border border-border bg-surface px-3 py-2.5 mb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium truncate">{p.title}</div>
            {p.tags && p.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {p.tags.map((t, i) => (
                  <span key={i} className="rounded-md border border-border bg-surface text-textMuted text-[10px] px-1 py-0.5">
                    {typeof t === 'string' ? t : t.name}
                  </span>
                ))}
              </div>
            )}
            {p.assigneeName && (
              <div className="text-[10.5px] font-mono text-textMuted mt-0.5">assigned to {p.assigneeName}</div>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!locked && !showEditForm && canEditProject && (
              <Button size="sm" variant="ghost" className="!px-2 !py-0.5 !text-[10.5px]" onClick={() => startEditProject(p)}>
                Edit
              </Button>
            )}
            <StatusBadge status={p.status} />
          </div>
        </div>

        {showEditForm && (
          <div className="mt-2 rounded-md border border-accentBorder/40 bg-surface2 p-2.5 flex flex-col gap-2">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              aria-label="Project title"
              className="rounded-md px-2.5 py-1.5 text-[12.5px] bg-bg border border-border focus:outline-none focus:border-accent"
            />
            <div className="flex items-center gap-2 flex-wrap">
              {canReassignUi ? (
                <select
                  value={editAssignee ?? ''}
                  onChange={(e) => setEditAssignee(e.target.value ? Number(e.target.value) : null)}
                  aria-label="Assign to"
                  className="rounded-md px-2.5 py-1.5 text-[12px] bg-bg border border-border focus:outline-none focus:border-accent"
                >
                  <option value="">Unassigned</option>
                  {group.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-[11px] text-textMuted flex-1">Assignee is set by the supervisor.</span>
              )}
              <div className="flex gap-1.5 ml-auto">
                <Button size="sm" onClick={() => saveProjectEdit(p)} disabled={savingProject}>
                  {savingProject ? 'Saving…' : 'Save'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingProjectId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-2.5">
          <ProgressBar progress={p.progress ?? 0} completed={completedTasks} total={tasks.length} status={p.status} compact />
        </div>

        {locked && (
          <div className="mt-2 rounded-md border border-warnBorder bg-surface2 px-2.5 py-1.5 text-[11px] text-warn">
            Completed — tasks are read-only until the project is reopened.
          </div>
        )}

        <div className="mt-2">
          <TaskList
            tasks={tasks}
            onAdd={canTaskCrud ? (t) => runTask(() => onAddTask(p.id, t)) : undefined}
            onToggle={(id) => runTask(() => onToggleTask(id))}
            onUpdate={canTaskCrud ? (id, data) => runTask(() => onUpdateTask(id, data)) : undefined}
            onDelete={canTaskCrud ? (id) => runTask(() => onDeleteTask(id)) : undefined}
            onReorder={canTaskCrud ? (ids) => runTask(() => onReorderTasks(p.id, ids)) : undefined}
            canAdd={canTaskCrud}
            canToggle
            canEdit={canTaskCrud}
            canDelete={canTaskCrud}
          />
        </div>

        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {votePending && (
            <span className="text-[10.5px] font-mono text-textMuted">Completion vote {voteApproved}/{voteTotal} approved</span>
          )}
          {!locked ? (
            isCollaborating ? (
              <Button size="sm" variant="primary" onClick={() => runTask(() => onRequestComplete(p.id))}>
                Request completion
              </Button>
            ) : (
              canManage && (
                <Button size="sm" variant="primary" onClick={() => runTask(() => onComplete(p.id))}>
                  Complete project
                </Button>
              )
            )
          ) : (
            canManage && (
              <>
                <Button size="sm" onClick={() => runTask(() => onReopen(p.id))}>
                  Reopen
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleArchive(p.id)}>
                  Archive
                </Button>
              </>
            )
          )}
        </div>

        {votePending && (
          <div className="mt-2 rounded-md border border-statusInfo/40 bg-surface2 px-3 py-2.5">
            <div className="text-[11.5px] font-medium">Completion vote in progress</div>
            <div className="text-[10.5px] font-mono text-textMuted mt-0.5">
              {voteApproved} of {voteTotal} members approved — tasks stay editable until the vote finalises.
            </div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              <Button size="sm" variant="primary" onClick={() => runTask(() => onVote(p.id, true))}>
                Approve
              </Button>
              <Button size="sm" onClick={() => runTask(() => onVote(p.id, false))}>
                Reject
              </Button>
              <Button size="sm" variant="ghost" onClick={() => runTask(() => onCancelVote(p.id))}>
                Cancel vote
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  })

  const archivedProjectCards = archivedProjects.map((p) => (
    <div key={p.id} className="rounded-md border border-border bg-surface/60 px-3 py-2.5 mb-2 opacity-70">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium truncate">{p.title}</span>
        <span className="text-[10px] font-mono text-textMuted flex-shrink-0">Archived {new Date(p.deleted_at).toLocaleDateString()}</span>
      </div>
      <div className="flex items-center justify-end gap-2 mt-2">
        <button onClick={() => handleRestore(p.id)} className="text-[11px] font-mono text-accent hover:text-text transition-colors">
          Restore
        </button>
      </div>
    </div>
  ))

  const memberCards = (group.members || []).map((m) => {
    const isMe = user && String(m.id) === String(user.id)
    const isOwner = m.role === 'owner'
    const showRemove = isSupervised ? canManage && !isOwner && !isMe : group.isOwner && !isOwner && !isMe
    return (
      <div key={m.id} className="flex items-center gap-2.5 rounded-md px-3 py-2">
        <Avatar initials={m.initials} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-medium truncate">
            {m.name}
            {isMe && <span className="text-[10.5px] text-textMuted font-normal"> (you)</span>}
          </div>
        </div>
        <span className="text-[9.5px] font-mono uppercase tracking-wide text-textMuted flex-shrink-0">{ROLE_LABEL[m.role] || 'Member'}</span>
        {showRemove && (
          <button
            aria-label={`Remove ${m.name}`}
            onClick={() => removeMember(m.id)}
            disabled={removing === m.id}
            className="w-6 h-6 rounded-md flex items-center justify-center text-textMuted hover:text-danger hover:bg-surface2 flex-shrink-0 disabled:opacity-50 transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    )
  })

  return (
    <Modal open={open} onClose={onClose} maxWidth={600}>
      <div className="p-5 pr-12">
        <div className="flex items-center justify-between gap-2">
          <div className={`font-display text-[17px] font-bold tracking-tight rounded-md px-2 py-0.5 flex-shrink-0 ${isSupervised ? 'bg-accent text-onAccent' : 'bg-statusInfo text-onStatusInfo'}`}>
            {groupTypeLabel}
          </div>
        </div>
        {group.hasSupervisor ? (
          <div className="text-[11px] text-textMuted mt-1">Supervised — the owner/supervisor manages task CRUD &amp; completion (audited); members can complete tasks.</div>
        ) : (
          <div className="text-[11px] text-textMuted mt-1">
            Collaborating — any member can add/edit tasks &amp; request completion; needs <b>unanimous</b> vote, tasks stay editable
          </div>
        )}
        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          {group.joinCode && (
            <button
              onClick={copyCode}
              className="rounded-md border border-dashed border-accentBorder bg-surface2 px-2.5 py-1 font-mono text-[12px] tracking-wider hover:border-accent transition-colors"
              title="Copy join code"
            >
              {group.joinCode}
              <span className="text-[10px] font-sans text-textMuted">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          )}
          {group.supervisor && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-textMuted">
              <Avatar initials={group.supervisor.initials} size="sm" />
              Supervised by {group.supervisor.name}
            </span>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10.5px] uppercase tracking-wide text-textMuted font-semibold">Members — {memberCount}</span>
            {(isCollaborating || canManage) && (
              <Button className="!px-2.5 !py-1 !text-[11px]" onClick={() => onInvite(group)}>
                Invite
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-1.5">{memberCards}</div>
          {actionError && <div className="text-[11.5px] text-danger mt-2">{actionError}</div>}
          {isCollaborating && <div className="text-[11px] text-textMuted mt-2">Join with a shared code or an invite. Direct add is disabled.</div>}
        </div>
        <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-surface2 rounded-md p-0.5">
              <button
                onClick={() => setProjectView('active')}
                className={`px-3 py-1 text-[11.5px] font-semibold rounded transition-colors ${
                  projectView === 'active' ? 'bg-surface text-text shadow-sm' : 'text-textMuted hover:text-text'
                }`}
              >
                Active{group.projects.length > 0 ? ` · ${group.projects.length}` : ''}
              </button>
              {canManage && (
                <button
                  onClick={() => setProjectView('archived')}
                  className={`px-3 py-1 text-[11.5px] font-semibold rounded transition-colors ${
                    projectView === 'archived' ? 'bg-surface text-text shadow-sm' : 'text-textMuted hover:text-text'
                  }`}
                >
                  Archived{archivedProjects.length > 0 ? ` · ${archivedProjects.length}` : ''}
                </button>
              )}
            </div>
          </div>
          {group.projects.length === 0 && (
            <div className="text-[12.5px] text-textMuted bg-surface2 rounded-md px-3 py-2.5">No projects yet. Assign a project to get started.</div>
          )}
          {activeProjectCards}
          {projectView === 'archived' && (
            <div>
              {loadingArchived && <div className="text-[12px] text-textMuted py-4 text-center">Loading...</div>}
              {!loadingArchived && archivedProjects.length === 0 && <div className="rounded-md px-3 py-2.5">No archived projects.</div>}
              {archivedProjectCards}
            </div>
          )}
        </div>
        <Button variant="primary" className="w-full justify-center mt-4" onClick={() => onAssign(group)}>
          Assign a project
        </Button>
        <div className="text-[11px] text-textMuted text-center mt-2">
          {isSupervised
            ? canManage
              ? 'Supervised: owner/supervisor can assign to anyone; members can assign to themselves — completion notifies all'
              : 'Members can assign a project to themselves; the owner/supervisor can assign to anyone.'
            : 'Collaborating: any member can assign via request — self-assignment is immediate — unanimous vote to complete'}
        </div>
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
          <Button variant="default" className="w-full justify-center" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-3 pt-3 border-t border-border">
          {group?.isOwner ? (
            <Button
              variant="ghost"
              className="w-full justify-center text-danger hover:bg-danger/10"
              disabled={isOwnerWithOthers || leaving}
              onClick={async () => {
                setLeaving(true)
                setActionError('')
                try {
                  await onLeave(group.id)
                  onClose()
                } catch (err) {
                  setActionError(failure(err).message)
                } finally {
                  setLeaving(false)
                }
              }}
            >
              Delete group
            </Button>
          ) : (
            <Button
              variant="danger"
              className="w-full justify-center"
              disabled={leaving}
              onClick={async () => {
                setLeaving(true)
                setActionError('')
                try {
                  await onLeave(group.id)
                  onClose()
                } catch (err) {
                  setActionError(failure(err).message)
                } finally {
                  setLeaving(false)
                }
              }}
            >
              Leave group
            </Button>
          )}
          {actionError && <div className="text-[11px] text-danger mt-2">{actionError}</div>}
        </div>
      </div>
    </Modal>
  )
}
