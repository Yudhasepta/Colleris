import { useCallback, useEffect, useRef, useState } from 'react'
import { api, downloadPdf, pdfSlug } from '../api/client.js'
import { onGroupsChanged } from '../utils/events.js'

// Connections, public directory search (guest-safe), groups, invitations and
// permission-aware assignments all come from Laravel. Search and profile view
// work without a session; every mutation throws on failure so the caller can
// surface the exact state (invalid code, already member, permission denied…).
export function useConnections(userId) {
  const [connectionIds, setConnectionIds] = useState([])
  const [groups, setGroups] = useState([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [connectionProfiles, setConnectionProfiles] = useState([])
  const optimisticId = useRef(0)

  const load = useCallback(async () => {
    if (!userId) {
      setConnectionIds([])
      setGroups([])
      setConnectionProfiles([])
      return
    }
    setLoadingGroups(true)
    try {
      const [connRes, groupRes, profileRes] = await Promise.all([
        api('/connections'),
        api('/groups'),
        api('/connections/profiles'),
      ])
      setConnectionIds(connRes.connectionIds || [])
      setGroups(groupRes.groups || [])
      setConnectionProfiles(profileRes.profiles || [])
    } catch {
      // Keep the previous data on transient/auth errors — zeroing it leaves the
      // directory and groups stuck empty until a manual reload.
    } finally {
      setLoadingGroups(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  // The bell accepts/declines invitations from anywhere; keep this list in sync.
  useEffect(() => {
    if (!userId) return undefined
    return onGroupsChanged(() => load())
  }, [userId, load])

  // ---- Public directory (guest + authed) ---------------------------------
  async function search(mode, query) {
    const res = await api(`/users/search?mode=${mode}&q=${encodeURIComponent(query)}`)
    return res.results || []
  }

  async function viewProfile(id) {
    const res = await api(`/users/${id}`)
    return res.profile
  }

  // ---- Connections --------------------------------------------------------
  async function addConnection(id) {
    await api(`/connections/${id}`, { method: 'POST' })
    const res = await api('/connections')
    setConnectionIds(res.connectionIds || [])
  }

  async function removeConnection(id) {
    try {
      await api(`/connections/${id}`, { method: 'DELETE' })
    } catch {
      /* ignore — list refreshes next load anyway */
    }
    const res = await api('/connections')
    setConnectionIds(res.connectionIds || [])
  }

  // ---- Groups -------------------------------------------------------------
  async function createGroup(group) {
    const localId = `local_${++optimisticId.current}`
    setGroups((prev) => [
      {
        id: localId,
        name: group.name,
        hasSupervisor: group.hasSupervisor,
        supervisorId: group.hasSupervisor ? userId : null,
        isSupervisor: group.hasSupervisor,
        isOwner: true,
        members: [{ id: userId, initials: 'YOU' }],
        projects: [],
      },
      ...prev,
    ])
    try {
      const res = await api('/groups', {
        method: 'POST',
        body: { name: group.name, has_supervisor: group.hasSupervisor },
      })
      setGroups((prev) => [res.group, ...prev.filter((g) => g.id !== localId)])
      return res.group
    } catch (err) {
      setGroups((prev) => prev.filter((g) => g.id !== localId))
      throw err
    }
  }

  async function joinGroup(code) {
    const res = await api('/groups/join', { method: 'POST', body: { join_code: code } })
    setGroups((prev) => [res.group, ...prev])
    return res.group
  }

  async function inviteMember(groupId, inviteeId) {
    const res = await api(`/groups/${groupId}/invite`, { method: 'POST', body: { user_id: inviteeId } })
    return res
  }

  async function respondInvitation(invitationId, status) {
    const res = await api(`/groups/invitations/${invitationId}`, { method: 'PATCH', body: { status } })
    return res
  }

  async function addMember(groupId, userIdToAdd) {
    const res = await api(`/groups/${groupId}/members`, { method: 'POST', body: { user_id: userIdToAdd } })
    setGroups((prev) => prev.map((g) => (g.id === groupId ? res.group : g)))
    return res.group
  }

  async function removeMember(groupId, memberId) {
    const res = await api(`/groups/${groupId}/members/${memberId}`, { method: 'DELETE' })
    setGroups((prev) => prev.map((g) => (g.id === groupId ? res.group : g)))
    return res.group
  }

  async function leaveGroup(groupId) {
    const res = await api(`/groups/${groupId}/leave`, { method: 'POST' })
    setGroups((prev) => prev.filter((g) => g.id !== groupId))
    return res
  }

  function updateGroup(updatedGroup) {
    setGroups((prev) => prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g)))
  }

  // ---- Permission-aware project/note assignment ---------------------------
  async function assignProject(groupId, { title, recipientId }) {
    const res = await api('/assignments', {
      method: 'POST',
      body: { group_id: groupId, recipient_id: recipientId, title },
    })
    await load()
    return res
  }

  // ---- Group project tasks (shared — same model, derived progress) --------
  async function updateGroupProject(groupProjectId, data) {
    const res = await api(`/group-projects/${groupProjectId}`, { method: 'PATCH', body: data })
    await load()
    return res.groupProject || res
  }
  async function addGroupTask(groupProjectId, title) {
    const res = await api(`/group-projects/${groupProjectId}/tasks`, { method: 'POST', body: { title } })
    await load()
    return res
  }
  async function toggleGroupTask(taskId) {
    const res = await api(`/tasks/${taskId}/complete`, { method: 'PATCH' })
    // Local optimistic update — mirrors useProjects pattern to avoid the full load() triad.
    const gp = res.groupProject || res.project
    if (gp?.id) {
      setGroups((prev) => prev.map((g) =>
        g.projects?.some((p) => p.id === gp.id)
          ? { ...g, projects: g.projects.map((p) => p.id === gp.id ? { ...p, ...gp } : p) }
          : g
      ))
    }
    return res
  }
  async function updateGroupTask(taskId, data) {
    const res = await api(`/tasks/${taskId}`, { method: 'PATCH', body: data })
    const gp = res.groupProject || res.project
    if (gp?.id) {
      setGroups((prev) => prev.map((g) =>
        g.projects?.some((p) => p.id === gp.id)
          ? { ...g, projects: g.projects.map((p) => p.id === gp.id ? { ...p, ...gp } : p) }
          : g
      ))
    }
    return res
  }
  async function deleteGroupTask(taskId) {
    const res = await api(`/tasks/${taskId}`, { method: 'DELETE' })
    const gp = res.groupProject || res.project
    if (gp?.id) {
      setGroups((prev) => prev.map((g) =>
        g.projects?.some((p) => p.id === gp.id)
          ? { ...g, projects: g.projects.map((p) => p.id === gp.id ? { ...p, ...gp } : p) }
          : g
      ))
    }
    return res
  }
  async function refreshAfter(request) {
    try {
      return await request()
    } finally {
      await load()
    }
  }
  async function completeGroupProject(groupProjectId) {
    return refreshAfter(() => api(`/group-projects/${groupProjectId}/complete`, { method: 'POST' }))
  }
  async function reopenGroupProject(groupProjectId) {
    return refreshAfter(() => api(`/group-projects/${groupProjectId}/reopen`, { method: 'POST' }))
  }
  async function reorderGroupTasks(groupProjectId, orderedIds) {
    const res = await api(`/group-projects/${groupProjectId}/tasks/reorder`, { method: 'POST', body: { ordered_ids: orderedIds } })
    await load()
    return res
  }
  // ---- Collaborating vote flow (unanimous, any member can initiate, tasks stay editable) ----
  async function requestGroupComplete(groupProjectId) {
    return refreshAfter(() => api(`/group-projects/${groupProjectId}/request-complete`, { method: 'POST' }))
  }
  async function voteGroupComplete(groupProjectId, approve, reason) {
    return refreshAfter(() => api(`/group-projects/${groupProjectId}/vote`, { method: 'POST', body: { approve, reason } }))
  }
  async function finalizeGroupVote(groupProjectId) {
    return refreshAfter(() => api(`/group-projects/${groupProjectId}/finalize-vote`, { method: 'POST' }))
  }
  async function cancelGroupVote(groupProjectId) {
    return refreshAfter(() => api(`/group-projects/${groupProjectId}/cancel-vote`, { method: 'POST' }))
  }

  // PDF export — server-rendered report; the caller passes the owning group
  // for the fallback filename (the server's Content-Disposition wins).
  async function exportGroupProjectPdf(groupProject, group) {
    const fallback = `colleris-${pdfSlug(group?.name, group?.id)}-${pdfSlug(groupProject?.title, groupProject?.id)}.pdf`
    await downloadPdf(`/group-projects/${groupProject.id}/pdf`, fallback)
  }

  return {
    connectionIds,
    groups,
    loadingGroups,
    connectionProfiles,
    search,
    viewProfile,
    addConnection,
    removeConnection,
    createGroup,
    joinGroup,
    inviteMember,
    respondInvitation,
    addMember,
    removeMember,
    leaveGroup,
    updateGroup,
    assignProject,
    updateGroupProject,
    addGroupTask,
    toggleGroupTask,
    updateGroupTask,
    deleteGroupTask,
    completeGroupProject,
    reopenGroupProject,
    reorderGroupTasks,
    requestGroupComplete,
    voteGroupComplete,
    finalizeGroupVote,
    cancelGroupVote,
    exportGroupProjectPdf,
    refresh: load,
  }
}
