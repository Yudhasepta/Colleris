// Live archive/restore regression check (needs MySQL + :8000 API + pnpm dev):
//  1) personal project: full UI round-trip (create -> archive -> Restore in the
//     Archived tab) — this is the flow that 404'd before the ->withTrashed() fix
//  2) group project: API round-trip through the real dev DB
// Scratch rows are force-deleted at the end so the run leaves no trace.
// Usage (from frontend/): node scripts/archive-restore-check.mjs
import { chromium } from 'playwright'
import { spawnSync } from 'node:child_process'

const BASE = 'http://localhost:5173'
const P_TITLE = '[probe] restore-check'
const G_NAME = '[probe] group'
const GP_TITLE = '[probe] group project'

const report = []
let failures = 0
const fail = (m) => {
  failures++
  report.push('✗ ' + m)
}
const ok = (m) => report.push('✓ ' + m)

function tinker(code) {
  const r = spawnSync('php', ['artisan', 'tinker', '--execute', code], {
    cwd: 'C:/laragon/www/colleris/backend',
    stdio: 'pipe',
    timeout: 60000,
  })
  if (r.status !== 0) throw new Error('tinker failed: ' + r.stderr.toString().slice(0, 400))
  return r.stdout.toString().trim()
}

const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
page.on('pageerror', (e) => fail(`pageerror: ${e.message}`))

// login
await page.goto(BASE + '/')
await page.getByRole('button', { name: 'Log in / Register' }).click()
await page.getByPlaceholder('you@studio.com').fill('reyhan@studio.com')
await page.getByPlaceholder('••••••••').fill('password')
await page.locator('form button[type="submit"]').click()
await page.locator('header').getByRole('button', { name: 'Add project' }).waitFor({ timeout: 30000 })

const token = await page.evaluate(() => {
  const accounts = JSON.parse(localStorage.getItem('pb_accounts') || '[]')
  const id = localStorage.getItem('pb_active_account')
  return accounts.find((a) => String(a.id) === String(id))?.token
})
const api = async (path, { method = 'GET', body } = {}) => {
  const r = await page.evaluate(
    async ({ tok, p, m, b }) => {
      const res = await fetch(p, {
        method: m,
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: b ? JSON.stringify(b) : undefined,
      })
      const data = res.status === 204 ? null : await res.json().catch(() => null)
      return { status: res.status, data }
    },
    { tok: token, p: path, m: method, b: body }
  )
  return r
}

// ---------- 1) personal project: UI round-trip ----------
const created = await api('/api/projects', { method: 'POST', body: { title: P_TITLE, status: 'wait' } })
if (created.status === 201) ok('scratch personal project created (id ' + created.data.project.id + ')')
else fail('scratch project create failed: ' + created.status + ' ' + JSON.stringify(created.data))

await page.reload()
await page.locator('main .grid', { hasText: P_TITLE }).waitFor({ timeout: 15000 }).catch(() => {})
await page.locator(`main .grid >> text=${P_TITLE}`).first().click()
// details modal footer -> Archive -> confirm dialog (exact names: the tab
// button reads "Archived · N" and must not match)
await page.getByRole('button', { name: 'Archive', exact: true }).first().click()
await page.getByRole('button', { name: 'Archive', exact: true }).last().click() // confirm
await page.locator(`main .grid >> text=${P_TITLE}`).first().waitFor({ state: 'hidden', timeout: 15000 })
ok('archived via UI: card left the Active grid')

// Archived tab -> open card -> footer button -> Restore confirm
await page.getByRole('button', { name: /Archived/ }).click()
await page.locator(`main .grid >> text=${P_TITLE}`).first().click()
await page.getByRole('button', { name: 'Archive', exact: true }).first().click() // footer (label stays "Archive")
await page.getByRole('button', { name: 'Restore', exact: true }).click() // confirm dialog
await page.getByRole('button', { name: /Active/ }).first().click()
const backActive = await page
  .locator(`main .grid >> text=${P_TITLE}`)
  .first()
  .waitFor({ timeout: 15000 })
  .then(() => true)
  .catch(() => false)
backActive
  ? ok('RESTORED via UI: card back in the Active grid (the previously-broken path)')
  : fail('restored project not back in the Active grid')

// ---------- 2) group project: API round-trip ----------
const g = await api('/api/groups', { method: 'POST', body: { name: G_NAME, has_supervisor: false } })
if (g.status === 201) ok('scratch group created (id ' + g.data.group.id + ')')
else fail('scratch group create failed: ' + g.status + ' ' + JSON.stringify(g.data))

const gpId = Number(tinker(`echo App\\Models\\GroupProject::create(['group_id' => ${g.data.group.id}, 'title' => '${GP_TITLE}', 'status' => 'completed', 'progress' => 0])->id;`))
ok('completed group project created (id ' + gpId + ')')

const arch = await api(`/api/group-projects/${gpId}/archive`, { method: 'POST' })
arch.status === 200 ? ok('group project archived') : fail('group archive failed: ' + arch.status + ' ' + JSON.stringify(arch.data))

const listed = await api(`/api/groups/${g.data.group.id}/archived-projects`)
listed.status === 200 && (listed.data.archivedProjects || []).some((p) => p.id === gpId)
  ? ok('archived group project listed under the group')
  : fail('archived group project not listed: ' + JSON.stringify(listed.data))

const restored = await api(`/api/group-projects/${gpId}/restore`, { method: 'POST' })
restored.status === 200
  ? ok('RESTORED group project (POST /group-projects/{id}/restore = 200, previously 404)')
  : fail('group restore failed: ' + restored.status + ' ' + JSON.stringify(restored.data))

const groups = await api('/api/groups')
const payload = (groups.data.groups || []).find((x) => x.id === g.data.group.id)
payload && (payload.projects || []).some((p) => p.id === gpId)
  ? ok('restored group project back in the group active list')
  : fail('restored group project missing from group active list')

// ---------- cleanup scratch rows ----------
tinker(`$p = App\\Models\\Project::withTrashed()->where('title', '${P_TITLE}')->first(); $p?->forceDelete();`)
tinker(`$gp = App\\Models\\GroupProject::withTrashed()->where('title', '${GP_TITLE}')->first(); if ($gp) { $g = $gp->group_id; \\Illuminate\\Support\\Facades\\DB::table('group_members')->where('group_id', $g)->delete(); $gp->forceDelete(); App\\Models\\Group::find($g)?->delete(); }`)
ok('scratch rows cleaned up (personal + group force-deleted)')

await browser.close()
console.log(report.join('\n'))
process.exit(failures > 0 ? 1 : 0)
