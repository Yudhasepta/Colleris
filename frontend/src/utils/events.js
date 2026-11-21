// Tiny cross-hook event bus so the notification bell can tell the Others page
// group list (useConnections) to refresh after it accepts/declines an invite.
const GROUPS_CHANGED = 'colleris:groups-changed'

export function notifyGroupsChanged() {
  window.dispatchEvent(new Event(GROUPS_CHANGED))
}

export function onGroupsChanged(fn) {
  window.addEventListener(GROUPS_CHANGED, fn)
  return () => window.removeEventListener(GROUPS_CHANGED, fn)
}
