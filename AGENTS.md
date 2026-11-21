##UI/UX Rules & Notes
# Colleris — Frontend & Design System Rules

## Product Identity
Colleris is a personal and group project/task workspace designed for high readability, calm focus, and effortless progress tracking. The aesthetic balances technical precision (monospace metadata, numbered sections `01`, `02`) with modern, atmospheric depth inspired by modern developer sites (like Laravel's ecosystem).

## Strict Theme Isolation & Token Architecture
Never hardcode hex colors inside components. All colors MUST consume semantic CSS variables (`--bg-canvas`, `--bg-surface`, `--border-subtle`, `--accent-primary`, `--accent-glow`, `--text-primary`, `--text-muted`).

We maintain three strictly isolated themes controlled via `[data-theme="..."]` on `<html>`:
1. **`default` (Nebula Purple — New Primary):**
   - Deep space/obsidian canvas (`#09080F` to `#0E0C18`) with subtle radial nebula ambient lighting (`rgba(139, 92, 246, 0.12)`).
   - Primary accent: Electric Violet / Nebula Purple (`#9D7BFF` / `#8B5CF6`).
   - Surface elevation: Translucent dark cards (`#13111E`) with crisp `1px` borders (`rgba(167, 139, 250, 0.16)`).
2. **`amber` (Original Solar Gold):**
   - Pure obsidian canvas (`#0B0B0C`), warm gold primary (`#F5C451`), and dark matte cards (`#141416`). Do not alter its contrast or flat industrial feel.
3. **`cotton-candy` (Custom Pastel Theme):**
   - Preserve exact pastel sky-blue (`#7DD3FC`) and soft pink (`#F472B6`) accents on deep charcoal (`#0E1015`). **CRITICAL:** Never overwrite or bleed Nebula gradients or Amber tokens into `[data-theme="cotton-candy"]`.

## Modern Web Craft (Laravel-Inspired Polish)
- **Atmospheric Backgrounds & Depth:** Avoid flat, lifeless black boxes. On the `default` Nebula theme, layer subtle SVG grid patterns, faint radial stardust/nebula glows behind the workspace header (`01 / MAIN`), and soft top-edge inner highlights (`inset 0 1px 0 rgba(255,255,255,0.06)`) on project cards.
- **Custom Iconography & Visuals:** Replace plain text or generic icons with crisp custom SVG illustrations, subtle empty-state artwork, and status badges with soft inner glows.
- **Scannable Card Hierarchy:**
  - Eliminate duplicate text (e.g., do not repeat `"1/4 tasks"` in both the metadata row and below the progress bar).
  - Keep card padding generous (`20px–24px`), cap line lengths for notes/descriptions at `60ch`, and ensure task counts use `tabular-nums`.
- **Interactive States:** Every interactive card, sidebar item, and button must have smooth `150ms–200ms` transitions, subtle border illumination on hover, and clear `:focus-visible` rings.

> **Implementation note (2026-11-20):** the theme system implements these rules as the **`nebula` preset** (`html[data-preset="nebula"]` in `frontend/src/tokens/tokens.css`, opt-in via Settings → Appearance; the original gold remains the `default` preset id, kept 100% intact, and `cotton-candy` stays isolated with `--hero-glow: none`). The section above describes the Nebula treatment's intent; `data-theme` remains dark/light and presets are selected via `data-preset`, not `data-theme`.


# Colleris — Agent Notes

Two top-level dirs: `frontend/` (React + Vite app) and `backend/` (Laravel 13 API at `http://colleris.test`). Local stack: MySQL -> Laravel API -> React.

## Architecture

- **Canonical reference:** `docs/PROJECT.md` is the full current reference and changelog. `frontend/README.md` and `backend/README.md` are shorter app-level guides; keep them aligned with it.
- **API boundary:** components → hooks/context (`useProjects.js`, `useConnections.js`, `AuthContext`, `ThemeContext`, `useAdmin`) → `src/api/client.js` → Laravel. Components never call the API directly; hooks/context are the only layers swapped when the API changes.
- `client.js` attaches the active account's Sanctum token from the device-session store (`pb_active_account` + `pb_accounts`). All calls funnel through it.
- Server-side authorization: routes use `auth:sanctum`; admin endpoints additionally use `EnsureUserIsAdmin` (middleware returns 401/403 JSON). Roles/permissions always come from the server — never trust frontend role flags. `RequireAdmin` on the `/admin` route is a UI guard only.
- Passwords are hashed (`Password::defaults()`), tokens are Sanctum personal access tokens. No plaintext storage anywhere.

## Local environment (Laragon, Windows)

Services are started manually, not via Laragon UI. If MySQL or Apache is down:

- MySQL: `mysqld.exe --datadir=C:\laragon\data\mysql-8 --port=3306` (note: the correct data dir is `C:\laragon\data\mysql-8`, NOT `C:\laragon\data\mysql\mysql-8`).
- Apache: `httpd.exe` from `C:\laragon\bin\apache\httpd-2.4.54-win64-VS16` (main config is `...\conf\httpd.conf`; there is no `C:\laragon\etc\apache2\httpd.conf`).
- DB: `colleris_db` (MySQL, utf8mb4); credentials root / empty. **Scope rule:** the Colleris schema lives *only* in `colleris_db`. The MySQL dump also contains `laravel_db` and various unrelated student DBs — never inspect, migrate, seed, or drop anything outside `colleris_db`; note `laravel_db` exists but is for a different project and must never be targeted.
- `colleris.test` vhost (`C:\laragon\etc\apache2\sites-enabled\auto.colleris.test.conf`) points at `C:/laragon/www/colleris`, and the root `.htaccess` forwards everything to `backend/public`. Health check: `http://colleris.test/api/health`.

## Commands

- Frontend dev: `pnpm dev` (Vite, port 5173; `/api/*` is proxied to the Laravel dev server at `http://127.0.0.1:8000` in `vite.config.js`). Build: `pnpm build`; preview: `pnpm preview`.
- Backend (standard dev): two `php artisan serve` instances, one per concern — the Windows PHP dev server is **single-worker** (no CLI workers; `PHP_CLI_SERVER_WORKERS` is ignored, "forking is not supported on this platform"), so an open SSE stream would otherwise hold the one worker and queue every other API request behind it:
  - `php artisan serve --host=127.0.0.1 --port=8000` — all API requests (the Vite `/api` proxy target).
  - `php artisan serve --host=127.0.0.1 --port=8001` — the long-lived `/api/sse` stream only (the Vite `/api/sse` proxy target).
  Both need MySQL running; Laragon Apache is optional. Also: `php artisan migrate`, `php artisan db:seed` (idempotent, safe to re-run), `php artisan tinker`.
- **SSE dev proxy caveat**: do NOT point the Vite proxy at the Laragon Apache vhost — Apache runs PHP under mod_fcgid (`C:\laragon\etc\apache2\fcgid.conf`), which buffers live `text/event-stream` responses (verified: no headers reach the client for 8+ s on a bare `flush()` probe). The PHP built-in server streams natively (headers in ~6 ms). Because the stream and the API run in **separate processes**, `SseBroadcaster` is **file-backed** (`backend/storage/app/sse/user_<id>.json`, one JSON queue per user, exclusive-locked, capped at 200 events, per-user monotonic ids) so events broadcast in :8000 are visible to the :8001 stream. `/api/sse` is authed via `?token=` (EventSource can't send headers; `SseAuthenticate` middleware, Sanctum `PersonalAccessToken::findToken()` — v4 renamed `findValue`). Regression checks: `node frontend/scripts/auth-race-check.mjs` (needs MySQL + both `artisan serve` instances + `pnpm dev`) and `node frontend/scripts/sse-block-test.mjs` (asserts the open stream does not starve the API and a cross-process broadcast is delivered).
- **Tests/lint:** frontend has `pnpm lint` / `pnpm lint:fix` (ESLint flat config + React hooks rules) and `pnpm validate:all` (tokens + lint). Backend has `composer test` and PHPUnit; baseline integration suite added 2026-11-11 (`tests/Feature/AuthTest`, `ProjectProgressTest`, `GroupFlowTest`, `AssignmentTest`, `VoteLifecycleTest`, `AdminAuthTest`, `ReminderValidationTest`). Plain JS/JSX and PHP; don't add config unprompted.
- `frontend/start.bat` does NOT exist (older docs referenced it — don't point users to it).

## Conventions that differ from defaults

- **Colors are semantic CSS variables**, defined per `html[data-theme]` (dark/light) and `html[data-preset]` in `frontend/src/index.css`, mapped into Tailwind names in `tailwind.config.js` (`bg`, `surface`, `accent`, `danger`, `onAccent`, `onDanger`, `scrim`, `status*`). Use those tokens; never hardcode hex values or default Tailwind palette colors.
- **Visual direction:** modern productivity SaaS, warm near-black/off-white neutrals. Primary/active = **yellow** (`--accent #edc025`), warning/attention = **amber** (`--warn`), error/destructive = **coral** (`--danger`), success/completed = **mint**, info = **cyan**, personality = **pink**, AI/special = **purple**. Status is never communicated by color alone. Typography: Inter (display/body) + JetBrains Mono (technical). Preset ids are `default` (Amber, the original gold — default for all users)/`blue`/`cyan`/`pink`/`lavender`/`mint`/`cotton-candy`/`nebula` (Nebula Purple, opt-in atmospheric theme) — must match the backend `theme` validation. `cotton-candy` is the only dual-tone preset (two preview circles); the rest, including `default`, are single-tone. Preview colors come from the `preview` array in `ThemeContext.jsx` (`THEME_PRESETS`) — never derived from danger. Atmospheric layers (`--hero-glow`, `--card-top-highlight`) live in `src/tokens/tokens.css` and are `none` on every preset except `nebula` — never let them bleed into the amber or cotton-candy blocks.
- **Guest theme lock:** guests always get the `default` preset; custom presets require an account (persisted server-side via `PUT /api/theme`).
- **localStorage keys use the legacy `pb_` prefix** (`pb_accounts`, `pb_active_account`, `pb_theme_mode`, `pb_theme_preset`) and are managed via `useLocalStorage` (`src/hooks/useLocalStorage.js`). They now hold only device sessions + theme prefs — no server data.
- **Seed data** (dev only): 6 accounts, all password `password` (e.g. `reyhan@studio.com` user, `anita@studiodesign.com` test user, `admin@colleris.com` admin). Never surface seed credentials in the UI; they're documented in `backend/README.md`.
- **Schema drift recovery:** On every login, register, add-account, account-switch, and page-boot the client compares the stored `schemaVersion` (migration-count + latest-batch number) against the live value from `/api/schema-version` / `/api/me`. A mismatch means `migrate:fresh` ran and reassigned user IDs, invalidating old tokens. The client clears device sessions and forces re-login automatically. If you run `php artisan migrate:fresh --seed` manually, just refresh the browser — no localStorage clear needed.
- **Intentional simplifications:** Admin visitor figures are labelled mock in `AdminUserStats`. Reminders are fully implemented and database-backed. Group voting is not transactional and can stall when all approvals arrive before tasks finish. Full list under "Known gaps and document drift" in `docs/PROJECT.md`.
- **Account switching** only moves between sessions authorised on this device (stored device-side in `pb_accounts`); it does not mint tokens for arbitrary users. The old `/switch-account` endpoint was deliberately removed as a privilege-escalation risk.
- Three user routes (`/`, `/others`, `/settings`) nested under one `AppShell` layout route (`src/App.jsx`) + a guarded `/admin` route. Desktop sidebar and mobile bottom nav share their config in `src/components/layout/navItems.jsx` — adding/changing a destination means editing that file, not the components.
- Backend follows Laravel 13 conventions: PHP attributes (`#[Fillable([...])]`, `#[Hidden([...])]`) on models, controllers in `app/Http/Controllers/Api/`, JSON error rendering configured in `bootstrap/app.php`.