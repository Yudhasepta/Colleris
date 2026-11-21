import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { api, activeToken, readAccounts, readActiveAccountId, writeAccounts, writeActiveAccountId } from '../api/client.js'

const AuthContext = createContext(null)

// The device session store already carries the last server user payload
// (upserted on login / boot / switch). Seed `user` from it so a logged-in
// user gets an instant first paint — data fetches fire in parallel with the
// /api/me verification instead of after it. The boot effect below still
// verifies against /api/me and freshens (or revokes) the session.
function seedInitialUser() {
  const account = readAccounts().find((a) => String(a.id) === String(readActiveAccountId()))
  if (!account?.token || !account.id) return null
  const { token, schemaVersion, ...cachedUser } = account
  return cachedUser
}

// Authentication is server-driven (Laravel + Sanctum tokens). The `accounts`
// list is the *device session store* — every account signed into this browser
// keeps its own token so "Switch account" only picks between sessions that
// were authorised on this device. No plaintext passwords are ever stored,
// roles always come from the server payload.
export function AuthProvider({ children }) {
  const [accounts, setAccounts] = useLocalStorage('pb_accounts', [])
  const [activeAccountId, setActiveAccountId] = useLocalStorage('pb_active_account', null)
  const [booting, setBooting] = useState(true)
  const [user, setUser] = useState(seedInitialUser)

  // Boot: validate the stored active session against /api/me, then use the
  // server's user payload as the source of truth. `user` is already optimistically
  // seeded from the device store (see seedInitialUser), so this verifies +
  // freshens rather than blocks first paint; `booting` stays true until it
  // settles. Also verify that the database schema hasn't changed since this
  // token was issued — a migrate:fresh reassigns user IDs so old tokens become
  // invalid silently. If the schema version differs we log the user out
  // immediately instead of leaving them as a broken guest.
  useEffect(() => {
    let cancelled = false

    async function boot() {
      const account = readAccounts().find((a) => String(a.id) === String(readActiveAccountId()))
      if (!account?.token) {
        if (!cancelled) setBooting(false)
        return
      }
      try {
        const res = await api('/me', { token: account.token })
        if (cancelled) return
        // Schema drift: a fresh migration reassigns IDs and invalidates this
        // token. Force-clear device sessions so the user must log in again.
        const storedVersion = account.schemaVersion
        const currentVersion = res.schemaVersion
        if (
          storedVersion &&
          currentVersion &&
          (storedVersion.total !== currentVersion.total ||
            storedVersion.latestBatch !== currentVersion.latestBatch)
        ) {
          setAccounts([])
          setActiveAccountId(null)
          setUser(null)
          setBooting(false)
          return
        }
        upsertAccount({ ...account, ...res.user, schemaVersion: currentVersion })
        writeActiveAccountId(res.user.id)
        setUser(res.user)
      } catch {
        // Token invalid/expired — the session stays listed, just not active.
        if (!cancelled) {
          setActiveAccountId(null)
          setUser(null)
        }
      } finally {
        if (!cancelled) setBooting(false)
      }
    }

    boot()
    return () => {
      cancelled = true
    }
    // Boot once on mount; upsertAccount is stable below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function upsertAccount(account) {
    setAccounts((prev) => {
      const idx = prev.findIndex((a) => String(a.id) === String(account.id))
      const next = idx === -1 ? [...prev, account] : prev.map((a, i) => (i === idx ? { ...a, ...account } : a))
      // Synchronously persist the device-session store. The React state effect in
      // useLocalStorage flushes on the next tick — child effects (project/group
      // fetches fired right after login) read `activeToken()` from localStorage
      // BEFORE that flush, so the token must be written here, not in the effect.
      writeAccounts(next)
      return next
    })
  }

  const replaceUser = useCallback(
    (serverUser) => {
      setUser(serverUser)
      setAccounts((prev) => prev.map((a) => (String(a.id) === String(serverUser.id) ? { ...a, ...serverUser } : a)))
    },
    [setAccounts]
  )

  // ---- Actions -----------------------------------------------------------

  async function login(email, password) {
    const res = await api('/login', { method: 'POST', body: { email, password } })
    upsertAccount({ ...res.user, token: res.token, schemaVersion: res.schemaVersion })
    writeActiveAccountId(res.user.id)
    setUser(res.user)
    return res.user
  }

  async function register(name, email, password) {
    const res = await api('/register', {
      method: 'POST',
      body: { name, email, password, password_confirmation: password },
    })
    upsertAccount({ ...res.user, token: res.token, schemaVersion: res.schemaVersion })
    writeActiveAccountId(res.user.id)
    setUser(res.user)
    return res.user
  }

  async function addAccount(name, email, password) {
    const res = await api('/add-account', {
      method: 'POST',
      body: { name, email, password, password_confirmation: password },
    })
    upsertAccount({ ...res.user, token: res.token, schemaVersion: res.schemaVersion })
    return res.user
  }

  async function logout() {
    const token = activeToken()
    if (token) {
      try {
        await api('/logout', { method: 'POST' })
      } catch {
        /* ignore — token is dropped locally either way */
      }
    }
    setAccounts((prev) => {
      const next = prev.map((a) => (String(a.id) === String(activeAccountId) ? { ...a, token: null } : a))
      writeAccounts(next)
      return next
    })
    setActiveAccountId(null)
    setUser(null)
  }

  async function switchAccount(id) {
    const target = readAccounts().find((a) => String(a.id) === String(id))
    if (!target) return null
    if (!target.token) return 'needs-login'
    try {
      const res = await api('/me', { token: target.token })
      // Schema drift on switch — clear device sessions so both accounts refresh.
      const currentVersion = res.schemaVersion
      if (target.schemaVersion && (
        target.schemaVersion.total !== currentVersion?.total ||
        target.schemaVersion.latestBatch !== currentVersion?.latestBatch
      )) {
        setAccounts([])
        setActiveAccountId(null)
        setUser(null)
        return 'schema-drift'
      }
      upsertAccount({ ...target, ...res.user, schemaVersion: currentVersion })
      writeActiveAccountId(res.user.id)
      setUser(res.user)
      return res.user
    } catch {
      return 'needs-login'
    }
  }

  async function updateUser(partial) {
    if (!user) return
    const prev = user
    const optimistic = { ...user, ...partial }
    setUser(optimistic)
    setAccounts((prevAccounts) => prevAccounts.map((a) => (String(a.id) === String(user.id) ? { ...a, ...partial } : a)))

    try {
      const body = {}
      if ('name' in partial) body.name = partial.name
      if ('visibility' in partial) body.visibility = partial.visibility
      const res = await api('/profile', { method: 'PUT', body })
      replaceUser(res.user)
    } catch (err) {
      setUser(prev)
      throw err
    }
  }

  async function updatePermissions(partial) {
    if (!user) return
    const merged = { ...user.permissions, ...partial }
    const prev = user
    setUser({ ...user, permissions: merged })

    try {
      const body = {
        permissions: {
          project_assignment: merged.projectAssignment,
          guide_upload: merged.guideUpload,
          feedback: merged.feedback,
        },
      }
      const res = await api('/profile', { method: 'PUT', body })
      replaceUser(res.user)
    } catch (err) {
      setUser(prev)
      throw err
    }
  }

  async function generateProfileCode(durationHours) {
    if (!user) return null
    const res = await api('/profile-code', { method: 'POST', body: { hours: durationHours } })
    replaceUser(res.user)
    return res.user
  }

  // ---- Derived state -------------------------------------------------------

  const isAdmin = !!user && user.role === 'admin'
  const role = useMemo(() => (isAdmin ? 'admin' : user ? 'user' : 'guest'), [isAdmin, user])

  const value = {
    user,
    accounts: accounts.filter((a) => a.email),
    isGuest: !user,
    isAdmin,
    role,
    booting,
    login,
    register,
    logout,
    addAccount,
    switchAccount,
    updateUser,
    updatePermissions,
    generateProfileCode,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
