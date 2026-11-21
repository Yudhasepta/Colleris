// Lightweight draft cache for unsaved task edits inside open modals.
// Keys are scoped per userId so switching accounts doesn't leak drafts.
// Stale entries (group id or project id no longer referenced) are pruned on load.

const PREFIX = 'pb_draft_'

function key(groupId, projectId) {
  return `${PREFIX}${groupId}_${projectId}`
}

/** Load cached drafts for a specific group+project. */
export function loadDrafts(groupId, projectId) {
  try {
    const raw = window.localStorage.getItem(key(groupId, projectId))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Save current tasks array as the draft for this scope. */
export function saveDraft(groupId, projectId, tasks) {
  try {
    window.localStorage.setItem(key(groupId, projectId), JSON.stringify(tasks))
  } catch {
    // storage full — ignore silently
  }
}

/** Clear draft when close is confirmed. */
export function clearDraft(groupId, projectId) {
  try {
    window.localStorage.removeItem(key(groupId, projectId))
  } catch {}
}
