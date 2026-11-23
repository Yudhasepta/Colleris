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

// Authenticated binary download: fetches a PDF endpoint with the active device
// session token and saves it via an object URL. Prefers the server's
// Content-Disposition filename; falls back to the provided name. Throws an
// error shaped like `api()` failures on non-2xx responses.
export async function downloadPdf(path, fallbackFilename) {
  const token = activeToken()
  const headers = { Accept: 'application/pdf' }
  if (token) headers.Authorization = `Bearer ${token}`

  const start = performance.now()
  let res
  try {
    res = await fetch(`/api${path}`, { headers })
  } catch {
    devLog({ method: 'GET', path, network: true, elapsedMs: Math.round(performance.now() - start) })
    const err = new Error('Network error — the Colleris API is unreachable.')
    err.status = 0
    err.network = true
    throw err
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    const contentType = res.headers.get('Content-Type') || ''
    if (contentType.includes('application/json')) {
      try {
        const data = await res.json()
        message = data.message || message
      } catch {
        /* keep fallback message */
      }
    }
    devLog({ method: 'GET', path, status: res.status, elapsedMs: Math.round(performance.now() - start), error: message })
    const err = new Error(message)
    err.status = res.status
    err.network = false
    throw err
  }

  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = /filename="?([^";\n]+)"?/.exec(disposition)
  const filename = match?.[1] || fallbackFilename

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)

  devLog({ method: 'GET', path, status: res.status, elapsedMs: Math.round(performance.now() - start) })
}

// Small filename helper shared by the export hooks — mirrors the server's
// Str::slug for the Content-Disposition fallback path.
export function pdfSlug(text, fallback = 'export') {
  const slug = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || fallback
}
