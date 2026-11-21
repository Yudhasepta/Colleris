# Colleris — Frontend

React + Vite + Tailwind app backed by the Laravel API at `http://colleris.test` (see `../backend/`). All data, auth, and roles come from the server; the frontend only keeps device sessions + theme prefs in `localStorage`.

## Running it

Requires Node.js + pnpm (or npm), MySQL, and the Laravel dev server. From `../backend`, run `php artisan serve --host=127.0.0.1 --port=8000`; Apache is only needed if you open `http://colleris.test` directly. See `../AGENTS.md` for local services.

```bash
pnpm install
pnpm dev        # Vite on :5173, /api/* proxied to http://127.0.0.1:8000
pnpm build      # production bundle -> dist/
```

There is no `start.bat` — older docs referenced it, it doesn't exist.

## What's implemented

- **Responsive nav**: left sidebar on desktop, bottom nav on mobile — same destinations (Main / Others / Settings) in both, plus a role-gated Admin.
- **Color system**: warm near-black/off-white neutrals, yellow `--accent` as primary/active hue, amber warn / coral danger / mint completed / cyan info / pink personality / purple AI — all semantic CSS variables in `src/index.css`, mapped into Tailwind via `tailwind.config.js`. Presets: `default` (Amber, the default for all users) / `blue` / `cyan` / `pink` / `lavender` / `mint` / `cotton-candy` / `nebula` (opt-in Nebula Purple: obsidian canvas, violet accents, `--hero-glow` ambient layer behind the Main header — off on every other preset). `cotton-candy` is the only dual-tone preset (light blue + light pink). Guests are locked to `default`.
- **Main** (`/`): personal dashboard. Stat cards, project cards with read-only task-derived progress, project details with task checklists, add/edit/delete, and complete/reopen. Guests see a login prompt.
- **Others** (`/others`): public directory search by User ID or Profile Code (guest-safe; visibility is enforced server-side at profile view), connections, groups, assignments, and reminders. Groups support supervised and collaborating modes, join codes, invitations, shared projects, shared tasks, supervised completion, and unanimous completion votes. The app shell has a global notification bell.
- **Settings** (`/settings`): Profile, Profile Code (temporary, expires), Theme (dark/light for everyone; account presets persisted server-side), Visibility, Permissions (Allow/Request/Decline), Account (log in/register, add account, switch account, log out).
- **Admin** (`/admin`): guarded by `RequireAdmin` (UI) and `EnsureUserIsAdmin` (server). Overview, live user directory with labelled mock visitor figures, server-reported web status, server-persisted admin log, and a device-cache panel that clears only `pb_*` browser keys.

## Project shape

```
src/
  api/client.js        fetch wrapper + device-session token helpers (pb_accounts/pb_active_account)
  context/             AuthProvider (Laravel auth), ThemeProvider (needs AuthProvider
                       outer), NotificationsProvider (bell/reminders/assignments)
  hooks/               useLocalStorage, useProjects, useConnections, useAdmin, useProjectTasks (legacy)
  components/
    layout/            AppShell, Sidebar, BottomNav, navItems, RequireAdmin,
                       NotificationBell, NotificationPanel
    ui/                Button, Modal, ConfirmDialog, Field, Avatar, StatusBadge,
                       StatusIcon, EmptyState, GuestLock — generic, reused everywhere
    projects/          Main-page pieces
    others/            Others-page pieces (search, groups, connections)
    settings/          Settings-page pieces
    admin/             Admin-dashboard pieces
  pages/               MainPage, OthersPage, SettingsPage, AdminPage
```

## Data flow & persistence

Components never call the API directly. They go through hooks/context, which call `src/api/client.js` — the only file reading tokens from the device-session store. `localStorage` (`pb_*` keys) holds only device sessions and theme preferences; project/connection/group/admin data all lives in the Laravel database.

## Known simplifications and gaps

- Send reminder is fully implemented and database-backed. Supervisor progress override is intentionally gone; supervised completion is task-derived and audited.
- Admin visitor figures are mock and labelled in `AdminUserStats`. No visitor analytics are tracked.
- Group completion votes are not transactional. If everyone approves before all tasks are done, the vote stays pending with no Approve button; the initiator or group owner must cancel it and start again.
- Collaborating groups say invite-only, but join codes still work and their detail view has no Invite button. Supervised groups currently render two Invite buttons.
- Notification labels cover only five types. Vote, supervised-completion, and override entries show the raw type string; the mapped `connection` type has no current writer.
- Duplicate connection requests return 200 with `Already connected`, not 409.
- Guest directory search is open, but profile visibility is always enforced server-side at profile view.

The full gap list is in `../docs/PROJECT.md`.

## API (summary)

Full reference in `../backend/README.md`. All routes below are under `/api`:

- **Account:** `POST /register`, `POST /login`, `POST /logout`, `GET /me`, `POST /add-account`, `PUT /profile`, `POST /profile-code`, `PUT /theme`.
- **Projects and tasks:** `GET|POST /projects`, `GET|PUT|DELETE /projects/{id}`, `PATCH /projects/{id}/progress` (compatibility only), `GET|POST /projects/{id}/tasks`, `POST /projects/{id}/tasks/reorder`, `GET|PATCH|DELETE /tasks/{id}`, `PATCH /tasks/{id}/complete`, `POST /projects/{id}/complete|reopen`.
- **Directory and groups:** `GET /users/search`, `GET /users/{id}`, `GET /connections`, `POST /connections/{id}`; `GET|POST /groups`, `GET /groups/{id}`, `POST /groups/join`, `POST /groups/{id}/invite`, `GET /groups/{id}/invitations`, `PATCH /groups/invitations/{id}`, `POST /groups/{id}/members`, `DELETE /groups/{id}/members/{uid}`, `POST /groups/{id}/leave`, `POST /groups/{id}/projects` (legacy alias).
- **Group tasks and votes:** `GET|POST /group-projects/{id}/tasks`, `POST /group-projects/{id}/tasks/reorder`, `POST /group-projects/{id}/complete|reopen`, `POST /group-projects/{id}/request-complete`, `POST /group-projects/{id}/vote`, `GET /group-projects/{id}/votes`, `POST /group-projects/{id}/cancel-vote`.
- **Assignments, reminders, notifications:** `GET|POST /assignments`, `PATCH /assignments/{id}`; `GET /reminders`, `POST /reminders/{user}`, `PATCH /reminders/{id}`; `GET /notifications`, `PATCH /notifications/{id}`.
- **Admin:** `GET /admin/overview|users|logs|status|collaboration`, `POST|DELETE /admin/logs`.