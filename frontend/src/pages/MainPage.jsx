import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useProjects } from '../hooks/useProjects.js'
import { api } from '../api/client.js'
import { useSSE } from '../hooks/useSSE.js'
import Button from '../components/ui/Button.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import StatGrid from '../components/projects/StatGrid.jsx'
import ProjectCard from '../components/projects/ProjectCard.jsx'
import ProjectFormModal from '../components/projects/ProjectFormModal.jsx'
import ProjectDetailsModal from '../components/projects/ProjectDetailsModal.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import GuestLock from '../components/ui/GuestLock.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import AuthModal from '../components/settings/AuthModal.jsx'

export default function MainPage() {
  const { user, isGuest } = useAuth()
  const {
    projects,
    archived,
    loading,
    loadingArchived,
    addProject,
    updateProject,
    deleteProject,
    restoreProject,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    reorderTasks,
    completeProject,
    reopenProject,
    updateGuide,
    exportProjectPdf,
    refresh,
    refreshArchived,
  } = useProjects(user?.id)

  // SSE: when group events arrive, refresh the main page to stay in sync
  useSSE(() => {
    refresh()
  })

  const [tab, setTab] = useState('active')
  const [formOpen, setFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [detailsProject, setDetailsProject] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [activeTag, setActiveTag] = useState(null)
  const [allTags, setAllTags] = useState([])

  // Load available tags once on mount (authenticated — the route requires Sanctum)
  useEffect(() => {
    if (isGuest) return
    api('/tags')
      .then((data) => setAllTags(data.tags || []))
      .catch(() => {})
  }, [isGuest])

  function openAdd() {
    setEditingProject(null)
    setFormOpen(true)
  }
  function openEdit(project) {
    setEditingProject(project)
    setDetailsProject(null)
    setFormOpen(true)
  }
  function handleSave(project) {
    if (editingProject) updateProject(project)
    else addProject(project)
  }
  function handleDelete(project) {
    setDeleteTarget(project)
    setDetailsProject(null)
  }
  function confirmDelete() {
    deleteProject(deleteTarget.id)
    setDeleteTarget(null)
  }
  function handleRestore(projectId) {
    restoreProject(projectId)
    refreshArchived()
  }

  // Guests see an empty locked workspace — real data loads once signed in.
  const displayProjects = isGuest ? [] : tab === 'archived' ? archived : projects
  const isLoading = tab === 'archived' ? loadingArchived : loading

  const activeProjects = activeTag
    ? displayProjects.filter((p) => {
        const tags = p.tags || []
        return tags.some((t) => (typeof t === 'string' ? t : t.name) === activeTag)
      })
    : displayProjects

  // Keep the details modal in sync with the store — otherwise progress
  // updates save correctly but the open modal keeps its stale snapshot.
  const liveDetails = isGuest ? null : activeProjects.find((p) => p.id === detailsProject?.id) || null

  const activeCount = activeProjects.filter((p) => p.status === 'progress').length
  const completedCount = activeProjects.filter((p) => p.status === 'completed').length

  return (
    <section className="px-5 md:px-8 py-6 md:py-8 max-w-6xl mx-auto relative">
      <PageHeader
        index="01 / MAIN"
        title={isGuest ? 'Workspace' : `${user.name.split(' ')[0]}'s workspace`}
        description="Your personal project workspace — status, progress, and priorities at a glance."
        atmosphere
        meta={
          <div className="flex items-center gap-2 text-[11px] font-mono text-textMuted">
            <span>{activeProjects.length} projects</span>
            {tab === 'active' && (
              <>
                <span className="text-border">│</span>
                <span style={{ color: 'var(--status-progress)' }}>{activeCount} in progress</span>
                <span className="text-border">│</span>
                <span style={{ color: 'var(--status-completed)' }}>{completedCount} completed</span>
              </>
            )}
          </div>
        }
        actions={
          !isGuest &&
          tab === 'active' && (
            <Button variant="primary" onClick={openAdd}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" style={{ stroke: 'var(--on-accent)' }} className="w-3.5 h-3.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add project
            </Button>
          )
        }
      />

      {/* Tab nav */}
      {!isGuest && (
        <div className="flex gap-1 mb-5 border-b border-border">
          <button
            onClick={() => setTab('active')}
            className={`px-4 py-2 text-[12.5px] font-semibold transition-colors ${
              tab === 'active' ? 'border-b-2 border-accent text-text' : 'text-textMuted hover:text-textMuted'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => {
              setTab('archived')
              refreshArchived()
            }}
            className={`px-4 py-2 text-[12.5px] font-semibold transition-colors ${
              tab === 'archived' ? 'border-b-2 border-accent text-text' : 'text-textMuted hover:text-textMuted'
            }`}
          >
            Archived · {archived.length}
          </button>
        </div>
      )}

      <div className="relative">
        {/* Overview — compact data strip */}
        {tab === 'active' && <StatGrid projects={activeProjects} />}

        {/* Editorial section marker before the primary workspace */}
        <div className="flex items-center gap-3 mb-4 mt-2">
          <span className="font-mono text-[11px] tracking-[0.14em] text-textMuted">02</span>
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[11px] tracking-[0.14em] text-textMuted uppercase">
            {tab === 'active' ? 'Active workspace' : 'Archive'}
          </span>
        </div>

        {isLoading && <div className="text-[12px] text-textMuted py-8 text-center">Loading…</div>}

        {!isGuest && tab === 'active' && allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            {allTags.map((t) => (
              <span key={t.name} className={`text-[10px] font-mono uppercase tracking-wide text-textMuted mr-1 rounded-md border transition-colors ${
                    activeTag === t.name
                      ? 'border-accent bg-accent/10 text-text'
                      : 'border-border bg-surface2 text-textMuted hover:border-accentBorder'
                  }`}>
                {t.name}
              </span>
            ))}
          </div>
        )}
{!isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {activeProjects.map((p) => (
              <ProjectCard key={p.id} project={p} onOpen={setDetailsProject} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}

        {!isGuest && tab === 'active' && !isLoading && activeProjects.length === 0 && (
          <EmptyState
            title="No projects yet"
            description="Add your first project to start tracking status and progress."
            action={
              <Button variant="primary" onClick={openAdd}>
                Add project
              </Button>
            }
          />
        )}

        {!isGuest && tab === 'archived' && !isLoading && archived.length === 0 && (
          <EmptyState title="Nothing archived" description="Deleted projects appear here until permanently removed." />
        )}

        {isGuest && tab === 'active' && (
          <GuestLock onLogin={() => setAuthOpen(true)} description="Create or manage your own projects once you're signed in." />
        )}
      </div>

      {!isGuest && (
        <>
          <ProjectFormModal open={formOpen} onClose={() => setFormOpen(false)} onSave={handleSave} editingProject={editingProject} />
          <ProjectDetailsModal
            open={!!liveDetails}
            onClose={() => setDetailsProject(null)}
            project={liveDetails}
            onAddTask={addTask}
            onToggleTask={toggleTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onReorderTasks={reorderTasks}
            onComplete={completeProject}
            onReopen={reopenProject}
            onEdit={openEdit}
            onDelete={handleDelete}
            onExportPdf={exportProjectPdf}
            onUpdateGuide={updateGuide}
            hasGuidePermission={user?.permissions?.guide_upload !== 'decline'}
          />
          {tab === 'active' && (
            <ConfirmDialog
              open={!!deleteTarget}
              onClose={() => setDeleteTarget(null)}
              onConfirm={confirmDelete}
              title={`Archive "${deleteTarget?.title}"?`}
              description="This moves the project to the archive. You can restore it later."
              confirmLabel="Archive"
            />
          )}
          {tab === 'archived' && deleteTarget && (
            <ConfirmDialog
              open
              onClose={() => setDeleteTarget(null)}
              onConfirm={() => {
                handleRestore(deleteTarget.id)
                setDeleteTarget(null)
              }}
              title={`Restore "${deleteTarget?.title}"?`}
              description="This restores the project to your active workspace."
              confirmLabel="Restore"
            />
          )}
        </>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </section>
  )
}
