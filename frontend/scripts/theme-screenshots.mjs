// Theme verification harness — captures the 01/MAIN workspace in all three
// protected themes at desktop (1440x900) and mobile (375x812).
//
// Usage (from frontend/): node scripts/theme-screenshots.mjs
// Requires: MySQL + `php artisan serve` (:8000) + Vite dev server (localhost:5173)
// Output:  docs/screenshots/{theme}-{desktop|mobile}.png (6 files)
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:5173'
const OUT_DIR = 'C:/laragon/www/colleris/docs/screenshots'
const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 375, height: 812 }

// id = data-preset value; label = screenshot prefix; pickerName = visible preset row text
const THEMES = [
  { id: 'nebula', label: 'nebula', pickerName: 'Nebula Purple' },
  { id: 'default', label: 'amber', pickerName: 'Amber — Solar Gold' },
  { id: 'cotton-candy', label: 'cotton-candy', pickerName: 'Cotton Candy' },
]

mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: DESKTOP })
const page = await context.newPage()
const report = []
let failures = 0

page.on('pageerror', (err) => {
  failures++
  report.push(`PAGE ERROR: ${err.message}`)
})

async function waitMainReady(expectedPreset) {
  // The "Add project" header CTA only exists for logged-in users (guests get
  // the GuestLock), and it only renders after AuthContext boot finishes — so
  // this gate proves we are not mid-boot when the capture happens.
  await page.locator('header').getByRole('button', { name: 'Add project' }).waitFor({ timeout: 30000 })
  await page.waitForFunction((id) => document.documentElement.dataset.preset === id, expectedPreset, { timeout: 15000 })
  await page.waitForTimeout(500)
}

// --- Log in as a seed account (exercises the real auth + theme-sync path) ---
await page.goto(BASE + '/')
await page.getByRole('button', { name: 'Log in / Register' }).click()
await page.getByPlaceholder('you@studio.com').fill('reyhan@studio.com')
await page.getByPlaceholder('••••••••').fill('password')
await page.locator('form button[type="submit"]').click()
await waitMainReady('default')
report.push('logged in as reyhan@studio.com')

for (const t of THEMES) {
  // Switch via the Settings → Appearance picker (also regression-tests the
  // preset rows + PUT /api/theme persistence round-trip).
  await page.goto(BASE + '/settings')
  const presetRow = page.getByRole('button', { name: t.pickerName, exact: true })
  await presetRow.waitFor({ timeout: 30000 })
  await presetRow.click()
  await page.waitForFunction((id) => document.documentElement.dataset.preset === id, t.id, { timeout: 15000 })
  await page.waitForTimeout(500)

  // Desktop capture — 01/MAIN workspace (post-boot, theme settled)
  await page.goto(BASE + '/')
  await waitMainReady(t.id)
  await page.screenshot({ path: `${OUT_DIR}/${t.label}-desktop.png` })
  report.push(`${t.label} desktop captured`)

  // Mobile capture + overflow assertion (375px rule)
  await page.setViewportSize(MOBILE)
  await waitMainReady(t.id)
  const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth)
  const clean = overflow <= 0
  if (!clean) failures++
  report.push(`${t.label} mobile scrollWidth overflow: ${overflow}px ${clean ? '✓ clean' : '⚠ OVERFLOW'}`)
  await page.screenshot({ path: `${OUT_DIR}/${t.label}-mobile.png` })
  report.push(`${t.label} mobile captured`)
  await page.setViewportSize(DESKTOP)
}

// Isolation probe: --hero-glow must be `none` outside nebula
for (const t of THEMES) {
  await page.evaluate((id) => {
    document.documentElement.dataset.preset = id
  }, t.id)
  await page.waitForTimeout(150)
  const glow = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--hero-glow').trim())
  const expectNone = t.id !== 'nebula'
  const ok = expectNone ? glow === 'none' || glow === '' : glow !== 'none' && glow !== ''
  if (!ok) failures++
  report.push(`--hero-glow @ ${t.id} = "${glow}" ${ok ? '✓' : '⚠ REGRESSION'}`)
}

await browser.close()
console.log(report.join('\n'))
process.exit(failures > 0 ? 1 : 0)
