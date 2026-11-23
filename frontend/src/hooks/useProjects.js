import { useCallback, useEffect, useState } from 'react'
import { api, downloadPdf, pdfSlug } from '../api/client.js'

// Projects live in the Laravel database. Mutations optimistically update local
// state and reconcile with the server response.
export function useProjects(userId) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [archived, setArchived] = useState([])
  const [loadingArchived, setLoadingArchived] = useState(false)

  const fetcher = useCallback(async () => {
    if (!userId) {
      setProjects([])
      return
    }
    setLoading(true)
    try {
      const res = await api('/projects')
      setProjects(res.projects || [])
    } catch {
      // Keep the previous list on transient/auth errors — zeroing it leaves the
      // workspace stuck empty until a manual reload. A genuine guest switch is
      // handled by the !userId branch above.
    } finally {
      setLoading(false)
    }
  }, [userId])

  const fetchArchived = useCallback(async () => {
    if (!userId) {
      setArchived([])
      return
    }
    setLoadingArchived(true)
    try {
      const res = await api('/projects?archived=true')
      setArchived(res.projects || [])
    } catch {
      /* keep previous archived list on transient errors */
    } finally {
      setLoadingArchived(false)
    }
  }, [userId])

  useEffect(() => {
    fetcher()
  }, [fetcher])

  async function addProject(project) {
    const optimistic = { ...project, id: `local_${Date.now()}`, saving: true }
    setProjects((prev) => [optimistic, ...prev])
    try {
      const res = await api('/projects', {
        method: 'POST',
        body: {
          title: project.title,
          status: project.status,
          progress: project.progress,
          due: project.due || '',
          tags: (project.tags || [{ name: 'General' }]).map((t) => (typeof t === 'string' ? t : t.name)),
        },
      })
      setProjects((prev) => [res.project, ...prev.filter((p) => p.id !== optimistic.id)])
    } catch {
      setProjects((prev) => prev.filter((p) => p.id !== optimistic.id))
    }
  }

  async function updateProject(updated) {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? { ...updated, saving: true } : p)))
    try {
      const res = await api(`/projects/${updated.id}`, {
        method: 'PUT',
        body: {
          title: updated.title,
          status: updated.status,
          progress: updated.progress,
          due: updated.due || '',
          tags: (updated.tags || []).map((t) => (typeof t === 'string' ? t : t.name)),
        },
      })
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? res.project : p)))
    } catch {
      fetcher()
    }
  }

  async function updateGuide(projectId, guideText) {
    const res = await api(`/projects/${projectId}/guide`, {
      method: 'PATCH',
      body: { guide_text: guideText },
    })
    setProjects((prev) => prev.map((p) => (p.id === projectId ? res.project : p)))
    return res
  }

  async function reorderTasks(projectId, orderedIds) {
    const res = await api(`/projects/${projectId}/tasks/reorder`, { method: 'POST', body: { ordered_ids: orderedIds } })
    setProjects((prev) => prev.map((p) => (p.id === projectId ? res.project : p)))
    return res
  }

  async function addTask(projectId, title) {
    const res = await api(`/projects/${projectId}/tasks`, { method: 'POST', body: { title } })
    setProjects((prev) => prev.map((p) => (p.id === projectId ? res.project : p)))
    return res
  }

  async function updateTask(taskId, data) {
    const res = await api(`/tasks/${taskId}`, { method: 'PATCH', body: data })
    setProjects((prev) =>
      prev.map((p) => {
        if (res.project && p.id === res.project.id) return res.project
        // fallback: update task in place if project not returned
        if (p.tasks) {
          return {
            ...p,
            tasks: p.tasks.map((t) => (t.id === taskId ? res.task : t)),
            progress: res.project?.progress ?? p.progress,
            status: res.project?.status ?? p.status,
          }
        }
        return p
      })
    )
    return res
  }

  async function toggleTask(taskId) {
    const res = await api(`/tasks/${taskId}/complete`, { method: 'PATCH' })
    setProjects((prev) => prev.map((p) => (p.id === res.project?.id ? res.project : p)))
    return res
  }

  async function deleteTask(taskId) {
    const res = await api(`/tasks/${taskId}`, { method: 'DELETE' })
    if (res.project) {
      setProjects((prev) => prev.map((p) => (p.id === res.project.id ? res.project : p)))
    } else {
      // fallback refetch
      fetcher()
    }
    return res
  }

  async function completeProject(id) {
    const res = await api(`/projects/${id}/complete`, { method: 'POST' })
    setProjects((prev) => prev.map((p) => (p.id === id ? res.project : p)))
    return res
  }

  async function reopenProject(id) {
    const res = await api(`/projects/${id}/reopen`, { method: 'POST' })
    setProjects((prev) => prev.map((p) => (p.id === id ? res.project : p)))
    return res
  }

  async function deleteProject(id) {
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setArchived((prev) => prev.filter((p) => p.id !== id))
    try {
      await api(`/projects/${id}`, { method: 'DELETE' })
    } catch {
      fetcher()
    }
  }

  async function restoreProject(id) {
    const res = await api(`/projects/${id}/restore`, { method: 'POST' })
    setProjects((prev) => [res.project, ...prev])
    setArchived((prev) => prev.filter((p) => p.id !== id))
  }

  async function exportProjectPdf(project) {
    const fallback = `colleris-project-${pdfSlug(project?.title, project?.id)}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.pdf`
    await downloadPdf(`/projects/${project.id}/pdf`, fallback)
  }

  return {
    projects,
    loading,
    archived,
    loadingArchived,
    addProject,
    updateProject,
    updateGuide,
    reorderTasks,
    deleteProject,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    completeProject,
    reopenProject,
    restoreProject,
    exportProjectPdf,
    refresh: fetcher,
    refreshArchived: fetchArchived,
  }
}
