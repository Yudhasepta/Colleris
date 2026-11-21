// Device session: which accounts carry tokens on this browser and which one
// is active. This is the *only* place that reads the token; components and
// hooks get it via `activeToken()`. localStorage keys keep the legacy `pb_`
// prefix required by the project conventions.
const ACCOUNTS_KEY = 'pb_accounts'
const ACTIVE_KEY = 'pb_active_account'

export function readAccounts() {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function writeAccounts(accounts) {
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  } catch {
    /* storage unavailable — ignore */
  }
}

export function readActiveAccountId() {
  try {
    return window.localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

export function writeActiveAccountId(id) {
  try {
    if (id == null) window.localStorage.removeItem(ACTIVE_KEY)
    else window.localStorage.setItem(ACTIVE_KEY, String(id))
  } catch {
    /* ignore */
  }
}

export function activeToken() {
  const id = readActiveAccountId()
  if (!id) return null
  const account = readAccounts().find((a) => String(a.id) === String(id))
  return account?.token || null
}

// Development-only diagnostics: logs every API call (endpoint, method, status,
// elapsed ms) and a sanitised error to the browser console. Never logs request
// bodies, passwords, bearer tokens or response payloads. Only active in DEV.
const DEBUG = import.meta.env.DEV

function devLog(payload) {
  if (!DEBUG) return
  const line = [`%capi ${payload.method} ${payload.path}`, 'color:#6f6b60']
  if (payload.status !== undefined) line.push(`→ ${payload.status}`)
  if (payload.elapsedMs !== undefined) line.push(`(${payload.elapsedMs}ms)`)
  if (payload.error) line.push(`err=${payload.error}`)
  if (payload.network) line.push('network=unreachable')
  console.log(line.join(' '))
}

// Minimal fetch wrapper for the Laravel API. All calls go through here so
// the architecture stays: components → hooks/context → API. If no explicit
// token is passed, the active device session's token is attached.
export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const useToken = token ?? activeToken()
  if (useToken) headers.Authorization = `Bearer ${useToken}`

  const start = performance.now()
  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    // The server could not be reached at all (proxy down / backend off).
    devLog({ method, path, network: true, elapsedMs: Math.round(performance.now() - start) })
    const err = new Error('Network error — the Colleris API is unreachable.')
    err.status = 0
    err.network = true
    throw err
  }

  const elapsedMs = Math.round(performance.now() - start)
  let data = null
  try {
    data = await res.json()
  } catch {
    /* no body */
  }

  if (!res.ok) {
    // The request reached the server but was rejected (401/403/404/422/500).
    // Prefer the server's structured message (e.g. "These credentials do not
    // match our records.") so a real auth/validation failure is never masked
    // as a generic network error.
    const serverMessage = data?.message
    const fallback = `Request failed (${res.status})`
    devLog({ method, path, status: res.status, elapsedMs, error: serverMessage || fallback })
    const err = new Error(serverMessage || fallback)
    err.status = res.status
    err.errors = data?.errors
    err.network = false
    throw err
  }

  devLog({ method, path, status: res.status, elapsedMs })
  return data
}
