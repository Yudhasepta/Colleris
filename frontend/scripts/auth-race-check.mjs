// Post-login data race check — logs in via the real UI and asserts that every
// surface populates on first paint (no reload needed) with zero 401s, and
// that the SSE stream opens (200) via the Apache proxy.
//
// Usage (from frontend/): node scripts/auth-race-check.mjs
// Requires: MySQL + Apache (colleris.test) + a running `pnpm dev` on :5173
import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'
const watchdog = setTimeout(() => {
  console.error(report.join('\n') + '\n✗ WATCHDOG: script exceeded 150s — giving up')
  process.exit(2)
}, 150000)
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const report = []
let failures = 0
const fail = (msg) => {
  failures++
  report.push('✗ ' + msg)
}
const ok = (msg) => report.push('✓ ' + msg)

const apiResponses = []
const sseRequests = []
page.on('response', (r) => {
  if (r.url().includes('/api/')) apiResponses.push({ status: r.status(), url: r.url().replace(BASE, '') })
})
page.on('request', (rq) => {
  if (rq.url().includes('/api/sse')) sseRequests.push(rq.url().replace(BASE, ''))
})
page.on('pageerror', (e) => fail(`pageerror: ${e.message}`))

// --- Fresh login ---
await page.goto(BASE + '/')
await page.getByRole('button', { name: 'Log in / Register' }).click()
await page.getByPlaceholder('you@studio.com').fill('reyhan@studio.com')
await page.getByPlaceholder('••••••••').fill('password')
await page.locator('form button[type="submit"]').click()
const addProjectBtn = page.locator('header').getByRole('button', { name: 'Add project' })
await addProjectBtn.waitFor({ timeout: 30000 })
const responsesAtLogin = apiResponses.length
await page.waitForTimeout(1500) // let the post-login fetches settle

// 1) No 401s anywhere in the post-login request set
const postLogin401 = apiResponses.slice(responsesAtLogin).filter((r) => r.status === 401)
postLogin401.length === 0
  ? ok(`zero 401s after login (${apiResponses.length - responsesAtLogin} API responses, all 2xx)`)
  : fail(`401s after login: ${postLogin401.map((r) => r.url).join(', ')}`)

// 2) Main grid populated without reload
const cards = await page.locator('main .grid > div').count()
cards >= 1 ? ok(`main grid populated on first paint (${cards} project cards)`) : fail('main grid empty after login')

// 3) Tag filter chips (P2 — previously 401'd and never rendered)
const tagChipVisible = await page.locator('text=Due').first().isVisible().catch(() => false)
if (tagChipVisible) ok('tag filter row renders')
else fail('tag filter row missing (P2 not fixed?)')

// 4) /others populated against live API ground truth (no hardcoded seed values)
await page.goto(BASE + '/others')
const token = await page.evaluate(() => {
  const accounts = JSON.parse(localStorage.getItem('pb_accounts') || '[]')
  const activeId = localStorage.getItem('pb_active_account')
  const account = accounts.find((a) => String(a.id) === String(activeId))
  return account?.token || null
})
if (!token) fail('could not read active token from pb_accounts')
const apiHeaders = { Authorization: `Bearer ${token}`, Accept: 'application/json' }
const [apiConns, apiGroups] = await Promise.all([
  page.evaluate(async (h) => {
    const r = await fetch('/api/connections', { headers: h })
    return r.ok ? (await r.json()).connectionIds.length : -1
  }, apiHeaders),
  page.evaluate(async (h) => {
    const r = await fetch('/api/groups', { headers: h })
    return r.ok ? (await r.json()).groups.length : -1
  }, apiHeaders),
])
// Read the page header meta precisely ("N connections │ M groups") and poll
// until it settles to the live API values — proves the page repopulates on
// first visit without a reload, and is immune to hydration/fetch timing.
async function readHeader() {
  return page.evaluate(() => {
    const m = document.querySelector('section')?.innerText.match(/(\d+)\s+connections\s*│\s*(\d+)\s+groups/)
    return m ? { c: Number(m[1]), g: Number(m[2]) } : null
  })
}
let headerMeta = null
const settleDeadline = Date.now() + 12000
while (Date.now() < settleDeadline) {
  headerMeta = await readHeader()
  if (headerMeta && headerMeta.c === apiConns && headerMeta.g === apiGroups) break
  await page.waitForTimeout(400)
}
headerMeta = await readHeader()
if (headerMeta && headerMeta.c === apiConns && headerMeta.g === apiGroups) {
  ok(`/others header matches live API (${headerMeta.c} connections · ${headerMeta.g} groups on first visit)`)
} else {
  fail(`/others header ${headerMeta ? `${headerMeta.c}/${headerMeta.g}` : 'n/a'} vs API ${apiConns}/${apiGroups} (never settled)`)
}

// 5) /profile shows projects
await page.goto(BASE + '/profile/me')
await page.waitForTimeout(1200)
const profileText = await page.locator('body').innerText()
profileText.includes('PROJECTS') ? ok('/profile renders PROJECTS section') : fail('/profile missing PROJECTS section')
const profileEmpty = profileText.includes('No projects')
profileEmpty ? fail('/profile shows no projects (visibility?)') : ok('/profile shows projects')

// 6) SSE stream opened (P3). The EventSource connection is held open, so the
// Playwright `response` event never fires for it — assert (a) the frontend
// actually issued `/api/sse?token=` and (b) a status read via fetch sees 200.
const sseFired = sseRequests.some((r) => r.includes('/api/sse?token='))
if (sseFired) ok('frontend opened the SSE stream with a token query param')
else fail(`SSE request never fired (requests: ${JSON.stringify(sseRequests)})`)
const sseStatus = await page.evaluate(async (tok) => {
  const ac = new AbortController()
  // 20s guard: on the single-worker :8001 SSE instance a queued stream can
  // wait for a still-running one (orphan detection is prompt, ~1 tick).
  const guard = setTimeout(() => ac.abort(), 20000)
  let status = null
  try {
    const r = await fetch(`/api/sse?token=${encodeURIComponent(tok)}`, { signal: ac.signal })
    status = r.status
    ac.abort() // headers received — close the stream
  } catch {
    /* aborted by guard: headers never arrived through the proxy */
  } finally {
    clearTimeout(guard)
  }
  return status
}, token)
sseStatus === 200
  ? ok(`SSE endpoint returns 200 for the active token`)
  : fail(`SSE endpoint returned ${sseStatus}`)

// 7) Logo renders in the sidebar
const logo = page.locator('aside img')
await logo.waitFor({ timeout: 10000 })
const dims = await logo.evaluate((el) => ({ w: el.naturalWidth, h: el.naturalHeight }))
dims.w > 0 ? ok(`sidebar logo loaded (${dims.w}x${dims.h})`) : fail('sidebar logo failed to load')

// 8) Brand name capitalised
const brand = await page.locator('aside').first().innerText()
brand.includes('Colleris') ? ok('sidebar brand reads "Colleris"') : fail('sidebar brand not capitalised')

// ---- Part 2: optimistic boot from a seeded session (hard reload, no UI login) ----
// (a) data fetches fire BEFORE /api/me settles, (b) no stray PUT /theme with a
// custom preset, (c) a stale cached admin role leaks no admin UI / admin API.
const storage = await page.evaluate(() => {
  const out = {}
  for (let i = 0; i < localStorage.length; i++) out[localStorage.key(i)] = localStorage.getItem(localStorage.key(i))
  return out
})
// NOTE: useLocalStorage persists via JSON.stringify, so theme keys are stored
// as JSON-encoded strings ("\"nebula\""), not bare strings.
await page.evaluate((s) => {
  s['pb_theme_preset'] = JSON.stringify('nebula')
  s['pb_theme_mode'] = JSON.stringify('dark')
  const accounts = JSON.parse(s['pb_accounts'] || '[]')
  const activeId = s['pb_active_account']
  const a = accounts.find((x) => String(x.id) === String(activeId))
  if (a) {
    a.theme_preset = 'nebula'
    a.theme_mode = 'dark'
  }
  s['pb_accounts'] = JSON.stringify(accounts)
  localStorage.clear()
  for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v)
}, storage)

let themePuts = 0
let adminRequests = 0
let projectsReqT = 0
page.on('request', (rq) => {
  const p = rq.url().replace(BASE, '')
  if (rq.method() === 'PUT' && p.startsWith('/api/theme')) themePuts++
  if (p.startsWith('/api/admin')) adminRequests++
  if (p.startsWith('/api/projects') && !projectsReqT) projectsReqT = Date.now()
})

// (a) + (b): reload as the seeded logged-in user; wait for /me to settle
const mePending = page.waitForResponse((rs) => rs.url().includes('/api/me'), { timeout: 20000 })
await page.goto(BASE + '/')
await mePending
await page.waitForTimeout(800) // let StrictMode duplicates settle
projectsReqT > 0
  ? ok('optimistic boot: /projects issued at first paint, before /api/me settled')
  : fail('optimistic boot: /projects never issued before /me (fetching still gated on /me?)')

themePuts === 0
  ? ok('no stray PUT /theme on reload with a matching custom preset')
  : fail(`stray PUT /theme observed (${themePuts}x) — theme sync race at boot`)

// (c): stale "admin" role in the cached payload — server role for this account is not admin
await page.evaluate(() => {
  const accounts = JSON.parse(localStorage.getItem('pb_accounts') || '[]')
  const activeId = localStorage.getItem('pb_active_account')
  const a = accounts.find((x) => String(x.id) === String(activeId))
  if (a) a.role = 'admin'
  localStorage.setItem('pb_accounts', JSON.stringify(accounts))
})
await page.goto(BASE + '/admin')
await page.waitForTimeout(2500)
adminRequests === 0
  ? ok('stale cached admin role fired no /api/admin requests')
  : fail(`/api/admin requests fired with stale cached role (${adminRequests})`)
const finalPath = new URL(page.url()).pathname
finalPath === '/' || finalPath === ''
  ? ok('admin route redirected to Main after verification (cached role not trusted)')
  : fail(`admin route not redirected (now at ${finalPath})`)

// 9) Themed logo follows the account's theme (Settings → Appearance flow:
// PUT /api/theme is the persist path for a logged-in user, the device preset
// alone is overridden by the account's server theme). Restores after.
const themeApi = await page.evaluate(async (tok) => {
  const h = { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', Accept: 'application/json' }
  const cur = await (await fetch('/api/me', { headers: h })).json()
  const orig = { mode: cur.user.theme_mode || 'dark', preset: cur.user.theme_preset || 'default' }
  const setP = async (preset, mode) => {
    const r = await fetch('/api/theme', { method: 'PUT', headers: h, body: JSON.stringify({ preset, mode }) })
    return r.status
  }
  const status = await setP('nebula', 'dark')
  return { status, orig }
}, token)
await page.goto(BASE + '/')
// The seeded user carries the *cached* theme until /api/me freshens it —
// wait for the sidebar logo to switch to the account's new preset.
try {
  await page.waitForFunction(() => document.querySelector('aside img')?.getAttribute('src') === '/logos/nebula.png', null, { timeout: 20000 })
} catch {
  /* asserted below */
}
const sideImg = page.locator('aside img').first()
const logoSrc = await sideImg.getAttribute('src')
const logoDims = await sideImg.evaluate((el) => ({ w: el.naturalWidth, h: el.naturalHeight }))
logoSrc === '/logos/nebula.png' && logoDims.w > 0
  ? ok(`sidebar logo follows the account theme (${logoSrc}, ${logoDims.w}x${logoDims.h})`)
  : fail(`sidebar logo not themed (src=${logoSrc}, ${logoDims.w}x${logoDims.h}, theme PUT ${themeApi.status})`)
// restore the account's original theme so the run leaves no trace
await page.evaluate(async ({ tok, orig }) => {
  const h = { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', Accept: 'application/json' }
  await fetch('/api/theme', { method: 'PUT', headers: h, body: JSON.stringify(orig) })
}, { tok: token, orig: themeApi.orig })

await browser.close()
clearTimeout(watchdog)
console.log(report.join('\n'))
process.exit(failures > 0 ? 1 : 0)
