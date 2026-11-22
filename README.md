# Colleris

This web project is meant for a personal assignment.

Colleris is a structured, task-divided project-management web app, stylized to be a professional but comfortable workspace. Targeted at people who handle multiple projects at once and want to build a structured work habit.

- **Frontend** (`frontend/`): React 18 + Vite + Tailwind, single-page app with real-time SSE updates and a design-token theming system (8 presets).
- **Backend** (`backend/`): PHP 8.3 + Laravel 13 API (Sanctum auth, JSON responses), with a bundled SQLite dev database.
- **Reference docs**: `docs/COLLERIS.md` (product overview), `docs/PROJECT.md` (canonical technical reference — schema, API, architecture).

## Quick start

Prerequisites: **PHP 8.3**, **Composer**, **Node.js** (20+), **pnpm**. No database server needed — a migrated and seeded SQLite database is bundled.

**AI agents** (opencode, Claude Code, Codex): read [`AGENTS.md`](AGENTS.md) first — it has the exact start sequence, a self-verification checklist, and guardrails.

```powershell
git clone https://github.com/Yudhasepta/Colleris.git
cd colleris\backend
composer install
.\start-dev.bat            # Windows (or: sh start-dev.sh on macOS/Linux)
```

`start-dev` opens two terminals running the two required backend servers:

| Port | Process | Purpose |
| --- | --- | --- |
| 8000 | `php artisan serve` | all API requests (the Vite `/api` proxy target) |
| 8001 | `php artisan serve` | the long-lived `/api/sse` stream only (the Vite `/api/sse` proxy target) |

Two instances because the Windows PHP built-in dev server is single-worker: an open SSE stream would otherwise hold the only worker and queue every other API request behind it. The event store is file-backed (`backend/storage/app/sse/`), so events broadcast by `:8000` are picked up by the `:8001` stream.

Then the frontend:

```powershell
cd ..\frontend
pnpm install
pnpm dev
```

Open **http://localhost:5173** (note: `http://127.0.0.1:5173` is refused — Vite binds to `localhost`).

## Demo accounts

All seed users share the password **`password`**:

| Email | Role |
| --- | --- |
| `reyhan@studio.com` | regular user (main demo account) |
| `anita@studiodesign.com` | regular user |
| `budi@studiodesign.com` | regular user |
| `maya@freelance.io` | regular user |
| `dinda@studiodesign.com` | regular user |
| `admin@colleris.com` | admin |

The bundled database is pre-seeded: 2 groups, 7 projects, 3 group projects, connections, feedback and notifications.

## Using MySQL instead of the bundled SQLite

The dev database is `backend/database/database.sqlite` (used via `DB_CONNECTION=sqlite` in `backend/.env`). To run against MySQL:

```powershell
# 1. create the database (Laragon: colleris_db, utf8mb4)
# 2. in backend/.env:
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=colleris_db
DB_USERNAME=root
DB_PASSWORD=
# 3. migrate + seed:
php artisan migrate --seed
```

## Troubleshooting

- **`[vite] http proxy error: /api/sse ... ECONNREFUSED 127.0.0.1:8001`** — the second backend server isn't running. Restart `start-dev` (or both `php artisan serve` commands). It is harmless: the frontend SSE hook retries with a capped backoff and the app stays usable.
- **Page won't load at `http://127.0.0.1:5173`** — use `http://localhost:5173`.
- **Stale UI after pulling** — restart `pnpm dev` and hard-refresh (Ctrl+Shift+R).
- **500s after switching `.env`** — run `php artisan optimize:clear` in `backend/`.

## Development commands

```powershell
# backend
php artisan migrate --seed      # re-seed the SQLite dev DB
php artisan test                # PHPUnit suite (in-memory SQLite)

# frontend
pnpm lint                       # ESLint
pnpm build                      # production build
pnpm validate:tokens            # design-token usage check
```
