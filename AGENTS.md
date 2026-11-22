# AGENTS.md — running Colleris (for AI coding agents)

You are working in **Colleris**: a personal project-management workspace.
`backend/` = Laravel 13 API (PHP 8.3, Sanctum). `frontend/` = React 18 + Vite + Tailwind SPA.
The dev database is **bundled SQLite** (`backend/database/database.sqlite`, migrated + seeded) — no MySQL or other services needed.

## Prerequisites

PHP 8.3, Composer, Node 20+, pnpm.

## Start sequence

```powershell
# 1. backend deps
cd backend
composer install

# 2. TWO backend servers (both required; see "why two" below)
php artisan serve --host=127.0.0.1 --port=8000   # all API requests
php artisan serve --host=127.0.0.1 --port=8001   # the /api/sse stream only
# (Windows: backend\start-dev.bat does both in one click)

# 3. frontend
cd ..\frontend
pnpm install
pnpm dev
```

App: **http://localhost:5173** (on Windows the Vite server binds IPv6 `localhost` — `http://127.0.0.1:5173` is refused; use `localhost`).

**Why two PHP servers:** the Windows PHP built-in dev server is single-worker. An open SSE stream would hold the only worker and queue every other API request behind it. Vite proxies `/api/sse` → :8001 and everything else under `/api` → :8000 (see `frontend/vite.config.js`). The event store is file-backed (`backend/storage/app/sse/`), so events written by :8000 reach the :8001 stream across processes.

## Verification checklist (run after starting)

```powershell
curl http://127.0.0.1:8000/api/health
# → {"status":"ok","app":"Colleris"}

# login (seed user; all demo accounts use password "password")
curl -X POST http://127.0.0.1:8000/api/login -H "Content-Type: application/json" -d '{"email":"reyhan@studio.com","password":"password"}'
# → 200 + Sanctum token

# authenticated API
curl http://127.0.0.1:8000/api/projects -H "Authorization: Bearer <token>"
# → 7 projects

# SSE (EventSource can't send headers, so the token goes as ?token=; stream stays open — expect "stream open" marker then pings)
curl -N "http://127.0.0.1:8001/api/sse?token=<sanctum-token>"
```

`[vite] http proxy error: /api/sse ... ECONNREFUSED 127.0.0.1:8001` in the Vite log just means the :8001 instance is down — harmless; the frontend SSE hook retries with a capped backoff. Start :8001 to clear it.

## Demo accounts

| Email | Role |
| --- | --- |
| `reyhan@studio.com` | main demo user |
| `anita@studiodesign.com`, `budi@studiodesign.com`, `maya@freelance.io`, `dinda@studiodesign.com` | users |
| `admin@colleris.com` | admin |

Password for all: `password`.

## Dev commands

```powershell
# frontend
pnpm lint                  # ESLint
pnpm build                 # production build
pnpm validate:tokens       # design-token usage check (warnings are expected; exit 1 on any)

# backend
php artisan test           # PHPUnit on in-memory SQLite
php artisan migrate:fresh --seed   # rebuild the bundled SQLite dev DB
```

The test suite has **pre-existing failures (~37/51 pass)** — stale expectations and helper gaps that predate recent work. Do not chase them as regressions; only treat *new* failures as problems.

## Guardrails — don't do these

- **Don't touch `backend/.env`** beyond reading it: it is intentionally committed (dev `APP_KEY`, SQLite config). Do not "fix", rotate, or regenerate the key. For local-only overrides, copy it (e.g. `backend/.env.local`) and run with that env file selected — `$env:ENV_FILE='.env.local'; php artisan serve` (Windows PowerShell) — and never commit the copy.
- **Don't point the Vite proxy at Apache / `colleris.test`**: Apache runs PHP under mod_fcgid, which buffers live `text/event-stream` responses (headers never reach the client for 8+ s). The PHP built-in server streams natively.
- **Don't re-point the token tooling**: `frontend/scripts/generate-tokens.cjs` and `validate-tokens.cjs` are vendored copies of external design-system scripts — keep them local; earlier machine-specific paths broke other machines.
- **Don't add new ports or proxy targets** without updating `frontend/vite.config.js` and this file together.
- **Don't run `migrate:fresh` without `--seed`** on the dev DB — the app demo state assumes seeded data.
- **Don't delete `backend/database/database.sqlite`** — it is the shipped dev database.

## Human docs

- `README.md` — quick start for humans
- `docs/PROJECT.md` — canonical technical reference (schema, API, architecture)
- `docs/COLLERIS.md` — product overview
- `docs/brand-guidelines.md` — brand voice, palette, typography
