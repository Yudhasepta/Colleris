// Dev-backend regression checks (run with both instances up: :8000 API + :8001 SSE):
//  1) an open SSE stream on :8001 must NOT starve API requests on :8000
//  2) an event broadcast through SseBroadcaster in the :8000 process must
//     arrive on the :8001 stream (file-backed queue is cross-process)
// Usage: node scripts/sse-block-test.mjs
import http from 'node:http'

const API = 'http://127.0.0.1:8000'
const SSE = 'http://127.0.0.1:8001'
let failures = 0
const fail = (m) => {
  failures++
  console.log('✗ ' + m)
}
const ok = (m) => console.log('✓ ' + m)

const login = await fetch(API + '/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'reyhan@studio.com', password: 'password' }),
})
const { token, user } = await login.json()
const t0 = Date.now()

// 1) Open the SSE stream, then hammer the API instance while it stays open
const sse = http.get(SSE + '/api/sse?token=' + encodeURIComponent(token))
let sseHeaders = null
const stream = { events: [], done: false }
sse.on('response', (res) => {
  sseHeaders = Date.now() - t0
  res.on('data', (c) => {
    for (const line of c.toString().split('\n')) {
      if (line.startsWith('data:')) {
        try {
          stream.events.push(JSON.parse(line.slice(5)))
        } catch {
          /* partial chunk */
        }
      }
    }
  })
})

await new Promise((r) => setTimeout(r, 1500))
if (sseHeaders === null) fail('SSE stream headers never arrived on :8001')
else ok(`SSE stream headers on :8001 in ${sseHeaders}ms`)

const t1 = Date.now()
const health = await fetch(API + '/api/health')
const dt = Date.now() - t1
if (health.ok && dt < 3000) ok(`API /health responded in ${dt}ms while SSE stream was open`)
else fail(`API /health ${health.status} after ${dt}ms while SSE open (starvation?)`)

// 2) Cross-process broadcast: tinker (a separate PHP process, same code path
//    as :8000 requests) writes an event; the :8001 stream must pick it up.
import { spawnSync } from 'node:child_process'
const phpCode = "App\\Services\\SseBroadcaster::broadcast(" + user.id + ", 'probe_cross_process', ['note' => 'dev-check']);"
spawnSync('php', ['artisan', 'tinker', '--execute', phpCode], {
  cwd: 'C:/laragon/www/colleris/backend',
  stdio: 'pipe',
})
const deadline = Date.now() + 5000
let probeSeen = false
while (Date.now() < deadline && !probeSeen) {
  probeSeen = stream.events.some((e) => e.type === 'probe_cross_process')
  if (!probeSeen) await new Promise((r) => setTimeout(r, 300))
}
probeSeen
  ? ok('cross-process event delivered to the :8001 stream (file-backed queue works)')
  : fail('cross-process event not delivered within 5s')

sse.destroy()
console.log(failures ? `\n${failures} failure(s)` : '\nall checks passed')
process.exit(failures ? 1 : 0)
