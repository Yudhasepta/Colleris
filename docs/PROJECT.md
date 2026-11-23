# Colleris Project Reference

> Snapshot date: 2026-11-20
> Last application change observed: 2026-11-20
> Repository root: `C:\laragon\www\colleris`
> Database: `colleris_db` only

This file is the consolidated reference for Colleris. It covers the current architecture, features, database schema, API, frontend, design system, seed data, and a reconstructed changelog. There is no Git history in this workspace, so dates come from file timestamps and the earlier `FINAL_REPORT.md`. Treat the dates as approximate.

The older `FINAL_REPORT.md` (moved to `C:\OpenCode\CollerisNotes\agent-notes\` on 2026-11-21, along with `AGENTS.md` and `DEV_NOTES.md`) covers the phase 2 V2 iteration through 2026-09-22. The code has since moved through the group-mode and completion-vote work dated 2026-10-05/06, the query performance pass on 2026-11-02, and the assignment/directory/group-project edit fixes later that day. Where this document and `FINAL_REPORT.md` disagree, the code and this document describe the current state. The app-level READMEs and `AGENTS.md` were aligned with this document on 2026-10-20.

## Contents

1. [Product summary](#1-product-summary)
2. [Current status](#2-current-status)
3. [Stack and local setup](#3-stack-and-local-setup)
4. [Architecture](#4-architecture)
5. [Repository map](#5-repository-map)
6. [Feature reference](#6-feature-reference)
7. [Data model](#7-data-model)
8. [API reference](#8-api-reference)
9. [Frontend reference](#9-frontend-reference)
10. [Design system](#10-design-system)
11. [Seed data](#11-seed-data)
12. [Changelog](#12-changelog)
13. [Validation history](#13-validation-history)
14. [Known gaps and document drift](#14-known-gaps-and-document-drift)
15. [Maintenance guide](#15-maintenance-guide)
16. [Sources](#16-sources)

## 1. Product summary

Colleris is a personal project workspace with a professional directory and group collaboration layer. A user can track personal projects and tasks, search for other users by public handle or temporary profile code, connect with them, join supervised or peer-run groups, share group projects, assign work with permission-aware handoffs, send reminders, and receive an in-app notification feed.

The product deliberately separates two spaces:

- **Main** (`/`) is private workspace data: personal projects, tasks, derived progress, completion, and reopen.
- **Others** (`/others`) is the public directory and collaboration space: search, profiles, connections, groups, invitations, group projects, assignments, and reminders.

Guests can search the public directory and view profiles that allow it. Every write action requires a Sanctum session.

## 2. Current status

| Area | State on 2026-11-02 |
| --- | --- |
| Frontend | React 18 + Vite 8 + Tailwind 3.4; production build passed on 2026-11-02 |
| Backend | Laravel 13.17 API, PHP 8.3, Sanctum 4, MySQL 8; query paths optimized and collaboration fixes applied 2026-11-02 |
| Authentication | Server-issued Sanctum tokens, device-side session list |
| Personal projects | CRUD, persistent tasks, derived progress, complete/reopen |
| Groups | Supervised and collaborating modes, join codes, invitations |
| Group projects | Role-gated task CRUD, member task completion with derived progress, reorder, supervised completion, unanimous vote flow, editable assignment title/assignee |
| Assignments | Permission-aware, group or personal target, recipient notifications |
| Reminders and notifications | Database-backed |
| Admin | Server-guarded dashboard, user list, logs, status, collaboration feed |
| Theme system | 3-layer tokens, 8 presets, dark/light modes |
| Automated tests | Laravel example tests pass (2 tests); no project-specific suite or frontend lint/typecheck script |
| Database check | MySQL reachable on 2026-11-02; performance index migration applied |

The latest code changes are the 2026-11-02 query performance pass and the follow-up assignment, directory-search, and group-project edit fixes. The performance pass reduced N+1 queries and payload size and added supporting indexes; the follow-up fixed recipient notifications, normalized active-code search, and added group-project assignment editing. Before that, the group-mode and completion-vote work carried `2026_10_06` migration filenames, while the files themselves were written on 2026-10-05. The dates below use the migration filenames for clarity.

## 3. Stack and local setup

### Runtime

| Layer | Technology |
| --- | --- |
| Frontend | React 18.3, React Router 6, Vite 8, Tailwind CSS 3.4, PostCSS, Autoprefixer |
| Backend | PHP 8.3, Laravel 13.17, Laravel Sanctum 4, Laravel Tinker |
| Database | MySQL 8, `utf8mb4`, database `colleris_db` |
| Styling | Semantic CSS variables generated from W3C DTCG tokens, mapped through Tailwind |
| Fonts | Inter for UI, JetBrains Mono for technical text, Fredoka for the cotton-candy preset |
| Local server | Laragon Apache vhost `colleris.test`, or `php artisan serve` for Vite proxying |

### URLs

| Purpose | URL |
| --- | --- |
| Application | `http://colleris.test` |
| API health | `http://colleris.test/api/health` |
| Vite dev server | `http://localhost:5173` |
| Vite API proxy target | `http://127.0.0.1:8000` |
| Local DB board | `http://colleris.test/db` (local environment only) |

The Vite proxy points at `127.0.0.1:8000`, not at `colleris.test`. If you run the frontend through Vite, start the API with:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

If you use the Laragon vhost directly, the root `.htaccess` forwards requests to `backend/public`.

### Commands

Frontend, from `frontend/`:

```powershell
pnpm dev
pnpm build
pnpm preview
pnpm tokens:sync
pnpm validate:tokens
```

Backend, from `backend/`:

```powershell
php artisan migrate
php artisan db:seed
php artisan serve --host=127.0.0.1 --port=8000
php artisan tinker
```

For real-time SSE in dev, run a **second** dev-server instance dedicated to the stream:

```powershell
php artisan serve --host=127.0.0.1 --port=8000   # all API requests
php artisan serve --host=127.0.0.1 --port=8001    # /api/sse only
```

The Windows PHP dev server is single-worker (`PHP_CLI_SERVER_WORKERS` is
ignored â€” "forking is not supported on this platform"), so an open SSE stream
would otherwise hold the one worker and queue every other API request behind
it. The Vite proxy routes `/api/sse` to :8001 and the rest of `/api` to :8000.
Because the two instances are separate processes, `SseBroadcaster` keeps
per-user event queues in files under `backend/storage/app/sse/`
(see Â§3 "Local service notes" and the SSE changelog entry).

First run on a fresh checkout, from `backend/`:

```powershell
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
```

Then, from `frontend/`:

```powershell
pnpm install
```

There is no `frontend/start.bat`.

### Local service notes

MySQL and Apache are started manually on this Windows machine. The MySQL data directory is `C:\laragon\data\mysql-8`, not `C:\laragon\data\mysql\mysql-8`. Apache lives under `C:\laragon\bin\apache\httpd-2.4.54-win64-VS16`. The vhost file is `C:\laragon\etc\apache2\sites-enabled\auto.colleris.test.conf`.

The database connection is configured in `backend/.env`:

```text
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=colleris_db
DB_USERNAME=root
DB_PASSWORD=
```

Do not point migrations, seeders, or destructive commands at `laravel_db` or at any other database in the local MySQL instance. The Colleris schema belongs only in `colleris_db`.

The Laragon Apache vhost runs PHP under **mod_fcgid** (`php-cgi.exe`, configured in `C:\laragon\etc\apache2\fcgid.conf`), which buffers live output: SSE (`text/event-stream`) responses do not reach the client in real time through Apache. For dev, the Vite proxy therefore targets the two `php artisan serve` instances (see Commands: API on :8000, the SSE stream on :8001), not `colleris.test`. Apache remains the normal host for `colleris.test` and is fine for everything except streamed responses.

## 4. Architecture

### Request flow

```text
React page/component
    -> hook or context (useProjects, useConnections, AuthContext, ThemeContext, NotificationsContext, useAdmin)
    -> src/api/client.js
    -> Laravel route in routes/api.php
    -> controller
    -> Eloquent model / service
    -> MySQL colleris_db
```

Components do not call `fetch` or the API directly. `frontend/src/api/client.js` is the one place that attaches the active device session token.

### Backend shape

- Routes are declared in `backend/routes/api.php`.
- API controllers live in `backend/app/Http/Controllers/Api/`.
- `AssignmentService` owns the permission-aware assignment rules.
- `EnsureUserIsAdmin` protects every `/api/admin/*` route.
- `bootstrap/app.php` forces JSON errors for API requests and returns 401/404 JSON instead of web redirects.
- Models use Laravel 13 attribute declarations such as `#[Fillable([...])]` and `#[Hidden([...])]`.

### Auth boundary

The API uses Sanctum personal access tokens. Login, registration, and `add-account` return `{ token, user }`. The frontend stores the token in the device account list and attaches it as `Authorization: Bearer <token>`.

The server owns roles. `user.role` is `user` or `admin`; the frontend `RequireAdmin` guard is only a UI convenience. Admin endpoints re-check the role server-side.

### Client-side state boundaries

- `AuthContext` owns the current user and the device account list.
- `ThemeContext` applies mode and preset attributes to `<html>` and persists theme changes.
- `NotificationsContext` owns the bell feed, reminders, and assignment requests.
- `useProjects` owns personal projects and tasks.
- `useConnections` owns connections, groups, group projects, tasks, invitations, and assignment calls.
- `useAdmin` owns admin reads and log writes.

`NotificationsProvider` sits inside `AppShell`, below `AuthProvider` and `ThemeProvider`. It subscribes to `AuthContext`, loads against the active user id, clears state for guests, refreshes on focus/visibility, and polls every 45 seconds.

### Device sessions

The `pb_accounts` localStorage entry contains accounts and tokens authorised on this browser. `pb_active_account` stores the active account id. Logout revokes the current server token and clears the local token for that account. Switching accounts only validates and uses a token already stored on the device. There is no endpoint that mints a token for an arbitrary account.

## 5. Repository map

```text
colleris/
  .htaccess                 Root forwarder to backend/public
  (agent docs, QA scripts/screenshots and tooling moved to
   C:\OpenCode\CollerisNotes on 2026-11-21 — see that folder's README)
  assets/
    design-tokens.json      W3C DTCG token source
    design-tokens.css       Generated token stylesheet
  docs/
    PROJECT.md              This file
    brand-guidelines.md     Brand and token reference, v1.0
  frontend/
    src/
      api/client.js         Fetch wrapper and device-session token store
      components/           UI, layout, projects, others, settings, admin
      context/              Auth, Theme, Notifications
      hooks/                useLocalStorage, useProjects, useConnections, useAdmin, useProjectTasks
      pages/                MainPage, OthersPage, SettingsPage, AdminPage
      tokens/tokens.css     Generated primitives, semantics, components, themes
      utils/                actionStatus, events
      App.jsx, main.jsx, index.css
    package.json
    vite.config.js
    tailwind.config.js
  backend/
    app/
      Http/Controllers/Api/ API controllers
      Http/Middleware/      EnsureUserIsAdmin, LogRequests
      Models/               Eloquent models
      Services/             AssignmentService
    bootstrap/app.php
    database/migrations/
    database/seeders/DatabaseSeeder.php
    routes/api.php
    routes/web.php
    composer.json
  .opencode/
    skills/                 Design, writing, UI, and token tooling
```

## 6. Feature reference

### 6.1 Accounts and authentication

Registration and login are public. Both create the profile and permission rows if they do not exist, then issue a Sanctum token. Passwords are hashed with `Password::defaults()`. Login failures are recorded in `admin_logs` as a `warn` event without storing the password.

Supported account actions:

- `POST /api/register`
- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`
- `POST /api/add-account`
- `PUT /api/profile`
- `POST /api/profile-code`
- `PUT /api/theme`

The user payload returned by the API contains:

```json
{
  "id": 1,
  "name": "Reyhan N.",
  "initials": "RN",
  "userId": "RN-1042",
  "handle": "RN-1042",
  "email": "reyhan@studio.com",
  "role": "user",
  "connections": 2,
  "visibility": "connections",
  "theme_mode": "dark",
  "theme_preset": "default",
  "profileCode": "X7K9-QP",
  "profileCodeExpiresAt": 1790000000000,
  "permissions": {
    "projectAssignment": "request",
    "guideUpload": "allow",
    "feedback": "allow"
  }
}
```

`add-account` creates a new user account while the current session stays active. It is not an account-switch endpoint.

### 6.2 Profiles, handles, and profile codes

Each user has one profile row. A handle is generated on first use as the first two letters of the name plus the zero-padded user id, for example `RN-1042`. Seed users have hand-written handles. Handles are used for directory search and display.

Profile fields:

| Field | Meaning |
| --- | --- |
| `handle` | Public user id, e.g. `RN-1042` |
| `initials` | Avatar fallback, max 4 characters |
| `profile_code` | Temporary search code, e.g. `X7K9-QP` |
| `profile_code_expires_at` | Expiry timestamp |
| `visibility` | `private`, `connections`, `supervisor`, or `everyone` |
| `connections_count` | Denormalised count |

A profile code is generated with `POST /api/profile-code` for 1, 24, or 168 hours. The code format is four hex characters, a hyphen, then two hex characters. The user payload hides the code after expiry. Directory search normalizes spaces and hyphens, prioritizes exact matches, and only matches codes whose expiry is still in the future.

Visibility controls the profile view, specifically whether the last five projects are returned:

- `private`: no projects.
- `connections`: projects only for a connected viewer.
- `supervisor`: projects only for a viewer who supervises a group containing that user.
- `everyone`: projects for any viewer, including guests.

### 6.3 Directory and connections

Directory search is public. It requires `mode=userId|profileCode` and a non-empty `q`, and returns at most 20 rows with id, name, initials, user id, connection count, and visibility.

Connections are stored as two symmetric rows, one in each direction, and both profile counts are incremented. There is no connection-removal endpoint. A user cannot connect with themselves. A duplicate connection currently returns HTTP 200 with `Already connected`, not 409, despite the older README claim.

### 6.4 Personal projects

A project belongs to one user and has `title`, `status`, `progress`, `due`, and `tag`. Status is one of `wait`, `progress`, `urgent`, or `completed`. `due` and `tag` are free-form strings, not dates or controlled vocabularies.

Progress rules:

- New projects start at `progress = 0`.
- Creating a project with `status=completed` is coerced to `wait`.
- Tasks are authoritative when they exist.
- Progress is `floor(completed tasks / total tasks * 100)`.
- Reaching 100% does not set `completed` automatically. The user must press Complete.
- Complete requires at least one task and every task completed.
- Reopen keeps task completion state, sets status to `progress` when progress is above 0, otherwise `wait`.
- The `PATCH /projects/{project}/progress` endpoint remains for compatibility but ignores the submitted value and recalculates from tasks.

Projects without tasks are legacy data. A seeded completed project can show 100% with no tasks. Task-backed projects are recalculated on list, show, and task mutations.

PDF export: `GET /projects/{id}/pdf` renders a server-side project-details report (status, task-derived progress, due, tags, guide note, task list) for the owner only; the frontend `ProjectDetailsModal` surfaces an "Export PDF" button that downloads the attachment. The route uses `->withTrashed()`, so archived (soft-deleted) projects can still be exported.

### 6.5 Personal tasks

Tasks are rows in `project_tasks` with `project_id` or `group_project_id`, a title, a completed flag, and a numeric position. Personal tasks support add, edit, delete, toggle complete, reorder, and fetch.

Reorder sends the full ordered id list and is rejected with 422 unless the list matches exactly the set of tasks for that project. Completion toggles recalculate the parent project.

### 6.6 Groups

A group belongs to an owner and has a name, a join code, and an optional supervisor. There are two modes:

| Mode | Backend marker | Label |
| --- | --- | --- |
| Supervised Projects | `has_supervisor = true` | Supervised Projects |
| Collaborating Team Projects | `has_supervisor = false` | Collaborating Team Projects |

Group creation requires a name and `has_supervisor`. If the group is supervised and no `supervisor_id` is supplied, the creator becomes the supervisor. The owner and supervisor are added as members. The UI currently offers only "All members" or "With supervisor (you)"; there is no supervisor picker.

Join codes are generated as `XXXX-XX` uppercase hex and are unique. The database supports `join_code_expires_at`, but group creation does not set an expiry, so codes remain active unless changed directly in the database. Any authenticated user with a valid code can join. A member cannot join twice.

Invitations:

- Any group member can invite another user.
- A user cannot invite themselves, an existing member, or someone with a pending invitation.
- An invitation is unique per group and invitee.
- Re-inviting after a decline reuses the row and sets it back to `pending`.
- Accepting adds the invitee as a member. Declining leaves membership unchanged.

Direct member add:

- Requires the requester to be a member.
- Collaborating groups reject direct add with 403 and require the invite flow.
- Supervised groups allow the owner or supervisor to add a member directly.

Removal and leaving:

- The owner can never be removed by another member.
- The owner can remove any non-owner. In a supervised group, the supervisor can also remove non-owner members.
- The owner can remove the supervisor. The current code does not clear `supervisor_id` or `has_supervisor` when this happens. This is listed under known gaps.
- An owner with other members cannot leave. An owner who is alone can leave, which deletes the group.
- A non-owner member can leave. If the supervisor leaves, the group updates `supervisor_id` to null and `has_supervisor` to false.

The group payload includes the type, type label, owner/supervisor flags, active join code, members with roles, and group projects. Project payloads include tasks, task counts, vote state, vote counts, and both `assigner` and deprecated `assignee` aliases.

### 6.7 Group projects and completion

A group project is created when an assignment is approved. There is no separate create form for group projects. It has a title, status, derived progress, optional assigned member, and completion-vote state.

Assignment permissions:

- **Supervised group:** the owner or supervisor can assign to any member; other members can only assign to themselves. Self-assignment is approved immediately.
- **Collaborating group:** any member can assign to any member. Self-assignment is approved immediately.

Task permissions:

- **Supervised group:** only the owner or supervisor can add, edit, delete, and reorder tasks. Any member can toggle a task complete; completion recalculates project progress.
- **Collaborating group:** any member can toggle task completion; add/edit/delete/reorder scoped to assigned project or manager (planned fix T1). Tasks stay editable during voting. Any member can start a completion vote. All members must approve unanimously before project marks complete.

Completion rules:

- **Supervised group:** only the owner or supervisor can complete or reopen. Completion requires all tasks done. The server notifies every other member with a `supervised_complete` notification and writes an admin audit entry. Reopening clears vote state and deletes any votes.
- **Collaborating group:** there is no direct completion. A member starts a completion vote. All members must approve, and all tasks must be done before the project can be marked complete. Tasks stay editable while the vote is pending. A rejection cancels the vote. The initiator or group owner can cancel a pending vote. Reopening is available to any member and clears votes. Task CRUD (add/edit/delete/reorder) on another member's assigned project requires manager/owner role â€” this is a planned fix (see DEV_NOTES T1). Toggle-complete remains open to any member everywhere.
- **Vote start:** requires membership, a collaborating group, no existing pending vote, a non-completed project, and at least one task. The initiator's vote is automatically approved. Every member gets a row in `group_project_completion_votes`; other members get a `completion_vote_requested` notification.
- **Vote cast:** each member can approve or reject with an optional reason. Rejection sets `vote_status` back to `none`, leaves the rejected vote rows in place, and notifies all members. Approval triggers a unanimity check. If every member has approved and every task is complete, the project is completed, votes are deleted, and all members get `completion_vote_approved`. If tasks remain, the server returns 422 and leaves the vote pending.
- **Vote finalisation gap:** if everyone approves before all tasks are done, the UI hides the Approve button because each member has already approved. No automatic finalisation runs when the last task is completed. Someone must reject or cancel and restart the vote. This is listed under known gaps.

PDF export: `GET /group-projects/{id}/pdf` renders a server-side report for a group project — group context (type label, active join code, supervisor, members with roles), project status, assignee, derived progress, tags, task list, and a pending-completion-vote panel when `vote_status = pending` — restricted to current group members. The frontend `GroupDetailModal` offers a per-project "Export PDF" button. The route uses `->withTrashed()`, so archived group projects can still be exported.

`vote_status` is `none` or `pending`. Individual votes are `pending`, `approved`, or `rejected`.

### 6.8 Assignments

Assignments are permission-aware handoffs. The recipient's `project_assignment` permission decides the result:

| Recipient permission | Assignment status | Effect |
| --- | --- | --- |
| `allow` | `approved` | Project is created immediately |
| `request` | `pending` | Recipient is notified and can approve or decline |
| `decline` | `declined` | Requester is notified; no project is created |

An assignment can target a group or no group. A group assignment creates a `group_projects` row and stores the recipient in the confusingly named `assigner_user_id` column. A personal assignment creates a `projects` row owned by the recipient.

Group assignment checks:

- The requester must be a group member.
- The recipient must be a group member.
- In a supervised group, only the owner or supervisor can assign to another member; any member can assign to themselves.
- In a collaborating group, any member can assign.
- Group self-assignment is always approved and creates the group project immediately, even when the member's permission is `request` or `decline`. It does not notify the member. Personal self-assignment remains rejected.

Only the recipient can respond to a pending assignment. Only pending assignments can be approved, declined, or cancelled. The recipient can mark an assignment read; the read flag returns early before the status check.

### 6.9 Reminders and notifications

A reminder can be sent to a connection or to a member the sender supervises. The message is required. The reminder is stored and a linked `reminder` notification is created. Only the recipient can list received reminders or mark one read. There is no sent-reminder listing.

The notification feed returns the newest 60 rows plus an unread count. A notification has a type, actor, JSON payload, read flag, and timestamp. The UI has inline actions for group invitations, pending assignments, and unread reminders. Other notification types render as feed entries only.

Notification types currently written by the backend:

- `group_invite`
- `assignment`
- `reminder`
- `group_activity`
- `supervised_complete`
- `completion_vote_requested`
- `completion_vote_rejected`
- `completion_vote_approved`
- `supervisor_task_override`

The UI also knows a `connection` label, but no current backend path writes that type.

### 6.10 Admin

The admin area is available at `/admin` and guarded by `RequireAdmin` in the frontend. Every admin API route also requires Sanctum and `EnsureUserIsAdmin`.

Admin endpoints provide:

- Aggregate counts: users, admins, projects, in-progress projects, groups, connections, pending assignments, pending invitations, reminders.
- User directory rows including email, role, visibility, connection count, project count, and creation time.
- A server-persisted log with create, list (latest 200), and clear operations.
- A live status payload with a DB ping, API health path, auth method, Laravel version, PHP version, and environment.
- A merged recent feed of group invitations, assignments, and reminders.

The Admin User Stats visitor figures are labelled mock. No analytics or visitor tracking is implemented.

The Admin Data panel lists browser `pb_*` keys and can clear them. Clearing forgets device sessions and resets theme preferences; it does not delete server data.

### 6.11 Responsive shell and navigation

`AppShell` renders the desktop sidebar, the mobile bottom navigation, the page outlet, and the notification bell. Both navigation surfaces share `frontend/src/components/layout/navItems.jsx`. The destinations are Main, Others, Settings, and Admin. Admin is filtered out for non-admins in both navigation components.

Pages:

- `/` Main: personal dashboard, stats, project cards, project details, task list.
- `/others` Others: search, profile view, connections, group cards, group details, invitations, assignments.
- `/settings` Settings: profile, profile code, theme, visibility, permissions, account.
- `/admin` Admin: overview, data, collaboration, web status, console.

## 7. Data model

The migration set defines 15 domain tables plus Sanctum's `personal_access_tokens` and the standard Laravel framework tables. The earlier report recorded 42 tables in the live schema; that count was not re-checked and should not be read as the migration count.

### `users`

Base Laravel user table plus Colleris columns.

| Column | Notes |
| --- | --- |
| `id` | Primary key |
| `name` | Display name |
| `email` | Unique |
| `email_verified_at` | Nullable, not used in the current flow |
| `password` | Hashed |
| `role` | `user` or `admin`, default `user` |
| `theme_mode` | `dark` or `light`, default `dark` |
| `theme_preset` | Default `default` |
| `remember_token` | Laravel column |
| timestamps | Created and updated |

Relations: one profile, one permissions row, many projects, many connections, owned and supervised groups, group memberships, sent and received invitations, requested and received assignments, notifications, sent and received reminders, admin logs.

### `profiles`

| Column | Notes |
| --- | --- |
| `user_id` | Unique FK, cascade delete |
| `handle` | Public user id, e.g. `RN-1042` |
| `initials` | Max 4 characters |
| `profile_code` | Nullable temporary code |
| `profile_code_expires_at` | Nullable |
| `visibility` | Default `connections` |
| `connections_count` | Denormalised count |

Indexes cover `handle` and `profile_code`.

### `user_permissions`

| Column | Notes |
| --- | --- |
| `user_id` | Unique FK, cascade delete |
| `project_assignment` | `allow`, `request`, or `decline`, default `request` |
| `guide_upload` | Same values, default `request` |
| `feedback` | Same values, default `request` |

Only `project_assignment` is wired into the current assignment flow. The other two exist in the profile and settings UI but no feature currently consumes them.

### `projects`

| Column | Notes |
| --- | --- |
| `user_id` | Owner, cascade delete |
| `title` | Required |
| `status` | `wait`, `progress`, `urgent`, `completed`; default `wait` |
| `progress` | Unsigned tiny integer, default 0 |
| `due` | Nullable free-form string |
| `tag` | Default `General` |

Index on `(user_id, id)`.

### `project_tasks`

Shared by personal and group projects.

| Column | Notes |
| --- | --- |
| `project_id` | Nullable FK to `projects`, cascade delete |
| `group_project_id` | Nullable FK to `group_projects`, cascade delete |
| `title` | Required |
| `completed` | Boolean, default false |
| `position` | Integer, default 0 |
| timestamps | Created and updated |

Indexes cover `(project_id, completed)`, `(group_project_id, completed)`, `(project_id, position, id)`, and `(group_project_id, position, id)`. The table does not enforce that exactly one parent column is set; the application sets one or the other.

### `connections`

| Column | Notes |
| --- | --- |
| `from_user_id` | FK to users, cascade delete |
| `to_user_id` | FK to users, cascade delete |
| timestamps | Created and updated |

Unique on `(from_user_id, to_user_id)`. A connection is stored as two rows.

### `groups`

| Column | Notes |
| --- | --- |
| `owner_id` | FK to users, cascade delete |
| `name` | Required |
| `has_supervisor` | Boolean, default false |
| `supervisor_id` | Nullable FK to users, null on delete |
| `join_code` | Nullable unique string, max 12 |
| `join_code_expires_at` | Nullable |
| timestamps | Created and updated |

### `group_members`

| Column | Notes |
| --- | --- |
| `group_id` | FK, cascade delete |
| `user_id` | FK, cascade delete |
| timestamps | Created and updated |

Unique on `(group_id, user_id)`.

### `group_projects`

| Column | Notes |
| --- | --- |
| `group_id` | FK, cascade delete |
| `assigner_user_id` | Nullable FK to users, null on delete. This stores the assigned member (the recipient), not the person doing the assigning. |
| `title` | Required |
| `status` | Same status set as personal projects |
| `progress` | Unsigned tiny integer, default 0 |
| `vote_status` | `none` or `pending`, default `none` |
| `vote_initiator_id` | Nullable FK to users, null on delete |
| timestamps | Created and updated |

The original column was `assignee_user_id`. Migration `2026_10_06_000000` renames it to `assigner_user_id` and handles the foreign key idempotently. Models and controllers also read the old column as a fallback, and API payloads return deprecated `assignee`/`assigneeId` aliases.

### `group_project_completion_votes`

| Column | Notes |
| --- | --- |
| `group_project_id` | FK, cascade delete |
| `user_id` | FK to users, cascade delete |
| `vote` | `pending`, `approved`, or `rejected`, default `pending` |
| `reason` | Nullable string, max 255 |
| timestamps | Created and updated |

Unique on `(group_project_id, user_id)`.

### `group_invitations`

| Column | Notes |
| --- | --- |
| `group_id` | FK, cascade delete |
| `inviter_id` | FK to users, cascade delete |
| `invitee_id` | FK to users, cascade delete |
| `status` | `pending`, `accepted`, `declined`, or `cancelled`, default `pending` |
| timestamps | Created and updated |

Unique on `(group_id, invitee_id)`.

### `assignments`

| Column | Notes |
| --- | --- |
| `group_id` | Nullable FK, cascade delete |
| `requester_id` | FK to users, cascade delete |
| `recipient_id` | FK to users, cascade delete |
| `title` | Required |
| `status` | `pending`, `approved`, `declined`, or `cancelled` |
| `rejected_reason` | Nullable, e.g. `permission` |
| `read_at` | Nullable timestamp |
| timestamps | Created and updated |

Indexes cover `(recipient_id, id)` and `(requester_id, id)`.

### `reminders`

| Column | Notes |
| --- | --- |
| `sender_id` | FK to users, cascade delete |
| `recipient_id` | FK to users, cascade delete |
| `group_id` | Nullable FK, null on delete |
| `message` | Default empty string, max 255 |
| `read_at` | Nullable |
| timestamps | Created and updated |

Index on `(recipient_id, id)`.

### `user_notifications`

| Column | Notes |
| --- | --- |
| `user_id` | FK, cascade delete |
| `type` | String type label |
| `actor_id` | Nullable FK to users, null on delete |
| `payload` | Nullable JSON |
| `read_at` | Nullable |
| timestamps | Created and updated |

Indexes on `(user_id, read_at)` and `(user_id, id)`.

### `admin_logs`

| Column | Notes |
| --- | --- |
| `type` | `info`, `success`, `warn`, `error`, or `event` |
| `message` | Required, max 255 |
| `detail` | Nullable, max 255 |
| `user_id` | Nullable FK, null on delete |
| timestamps | Created and updated |

### Framework tables

`personal_access_tokens` is Sanctum's token table. The standard Laravel tables are `migrations`, `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, and `failed_jobs`.

### Relationship summary

```text
users 1-1 profiles
users 1-1 user_permissions
users 1-N projects 1-N project_tasks
users N-N users through connections (two rows per pair)
users N-N groups through group_members
groups 1-N group_projects 1-N project_tasks
groups 1-N group_projects 1-N group_project_completion_votes
groups 1-N group_invitations
groups 1-N assignments
users 1-N assignments as requester and as recipient
users 1-N reminders as sender and as recipient
users 1-N user_notifications
users 1-N admin_logs
```

## 8. API reference

Base path: `/api`. Authenticated routes require `Authorization: Bearer <token>`.

### Response and error conventions

Most single records are wrapped in a named key, for example `{ "project": {...} }`. Lists use the plural key, for example `{ "projects": [...] }`. Error responses use `{ "message": "..." }`. Validation errors add `{ "errors": { "field": ["..."] } }`.

Common status codes:

| Code | Meaning |
| --- | --- |
| 200 | Success |
| 201 | Created |
| 401 | Missing or invalid token |
| 403 | Authenticated but not allowed |
| 404 | Record or route not found |
| 409 | Already a member or already invited |
| 422 | Validation failure or business-rule rejection |

Duplicate connection currently returns 200, not 409.

### Public routes

| Method | Path | Input | Notes |
| --- | --- | --- | --- |
| GET | `/health` | None | `{status: "ok", app: "Colleris"}` |
| POST | `/register` | `name`, `email`, `password`, `password_confirmation` | Creates user, profile, permissions, token |
| POST | `/login` | `email`, `password` | Returns token and user |
| GET | `/users/search` | Query: `mode=userId\|profileCode`, `q` | Public directory search, max 20; profile-code queries are normalized and active-only |
| GET | `/users/{user}` | None | Visibility-aware public profile |

### Account routes

All routes in this section require Sanctum.

| Method | Path | Input | Notes |
| --- | --- | --- | --- |
| GET | `/me` | None | Current user payload |
| POST | `/logout` | None | Revokes current access token |
| POST | `/add-account` | `name`, `email`, `password`, `password_confirmation` | Creates another user and returns its token |
| PUT | `/profile` | `name?`, `visibility?`, `permissions.project_assignment?`, `permissions.guide_upload?`, `permissions.feedback?` | Updates profile and permissions |
| POST | `/profile-code` | `hours` (`1`, `24`, `168`) | Generates a new code and expiry |
| PUT | `/theme` | `mode` (`dark\|light`), `preset` (one of the seven ids) | Persists theme choice |

### Personal projects and tasks

| Method | Path | Input | Notes |
| --- | --- | --- | --- |
| GET | `/projects` | None | Own projects with tasks, recalculates task-backed progress |
| POST | `/projects` | `title`, `status`, `progress?`, `due?`, `tag` | New project starts at 0; completed is coerced to wait |
| GET | `/projects/{project}` | None | Owner only; recalculates when tasks exist |
| PUT | `/projects/{project}` | `title?`, `status?`, `progress?`, `due?`, `tag?` | With tasks, progress is ignored and completion is guarded |
| PATCH | `/projects/{project}/progress` | `progress` | Compatibility endpoint; value is ignored |
| DELETE | `/projects/{project}` | None | Deletes project and tasks |
| GET | `/projects/{project}/tasks` | None | Ordered by position, then id |
| POST | `/projects/{project}/tasks` | `title`, `position?` | Appends by default |
| POST | `/projects/{project}/tasks/reorder` | `ordered_ids[]` | Must match the exact task set |
| GET | `/tasks/{task}` | None | Owner or group member |
| PATCH | `/tasks/{task}` | `title?`, `completed?`, `position?` | Owner/supervisor in supervised groups; any member in collaborating groups |
| DELETE | `/tasks/{task}` | None | Owner/supervisor in supervised groups; any member in collaborating groups |
| PATCH | `/tasks/{task}/complete` | None | Toggles completion; any group member may toggle |
| POST | `/projects/{project}/complete` | None | All tasks must be complete |
| POST | `/projects/{project}/reopen` | None | Retains task completion |
| GET | `/projects/{project}/pdf` | None | Owner only; server-rendered PDF report (status, derived progress, due, tags, guide note, task table) downloaded as `application/pdf` attachment; 403 for non-owners. Route is `withTrashed()` — archived projects exportable |

### Group projects, tasks, and votes

| Method | Path | Input | Notes |
| --- | --- | --- | --- |
| GET | `/group-projects/{groupProject}/tasks` | None | Member only |
| POST | `/group-projects/{groupProject}/tasks` | `title`, `position?` | Owner or supervisor in supervised groups; any member in collaborating groups |
| POST | `/group-projects/{groupProject}/tasks/reorder` | `ordered_ids[]` | Same permission rule; owner/supervisor reorders in supervised groups are audited |
| POST | `/group-projects/{groupProject}/complete` | None | Supervised only; owner or supervisor; all tasks done |
| POST | `/group-projects/{groupProject}/reopen` | None | Supervised: owner/supervisor; collaborating: any member |
| POST | `/group-projects/{groupProject}/request-complete` | None | Collaborating only; starts unanimous vote |
| POST | `/group-projects/{groupProject}/vote` | `approve` boolean, `reason?` | Collaborating only; pending vote required |
| GET | `/group-projects/{groupProject}/votes` | None | Member-only vote detail |
| POST | `/group-projects/{groupProject}/cancel-vote` | None | Initiator or group owner |
| GET | `/group-projects/{groupProject}/pdf` | None | Member only; server-rendered PDF report with group context (type label, active join code, supervisor, members with roles) plus project status/assignee/progress/tags/tasks and a pending-vote panel when `vote_status = pending`. Route is `withTrashed()` — archived group projects exportable |
| PATCH | `/group-projects/{groupProject}` | `title?`, `assigner_user_id?` | Member in collaborating groups; owner, supervisor, or current assignee in supervised groups; completed projects rejected |

### Connections

| Method | Path | Input | Notes |
| --- | --- | --- | --- |
| GET | `/connections` | None | `{connectionIds: [...]}` |
| POST | `/connections/{user}` | None | Creates two symmetric rows; self 422; duplicate 200 |

### Groups

| Method | Path | Input | Notes |
| --- | --- | --- | --- |
| GET | `/groups` | None | Groups the current user belongs to |
| POST | `/groups` | `name`, `has_supervisor`, `supervisor_id?` | Creator becomes supervisor when supervised and no id is given |
| GET | `/groups/{group}` | None | Member only |
| POST | `/groups/join` | `join_code` | Any authenticated user; invalid/expired 422, already member 409 |
| POST | `/groups/{group}/invite` | `user_id` | Any member; self, existing member, pending duplicate rejected |
| GET | `/groups/{group}/invitations` | None | Member only; latest 50 |
| PATCH | `/groups/invitations/{invitation}` | `status` (`accepted\|declined`) | Invitee only |
| POST | `/groups/{group}/members` | `user_id` | Supervised groups only; owner or supervisor |
| DELETE | `/groups/{group}/members/{user}` | None | Owner, or supervisor in supervised groups; owner cannot be removed |
| POST | `/groups/{group}/leave` | None | Owner alone deletes; supervisor leave clears supervision |
| POST | `/groups/{group}/projects` | `title`, `assigner_user_id?`, `assignee_user_id?` | Legacy alias to the assignment service; one recipient id is required |

### Assignments

| Method | Path | Input | Notes |
| --- | --- | --- | --- |
| GET | `/assignments` | None | `{received: [...], sent: [...]}`, latest 50 each |
| POST | `/assignments` | `group_id?`, `recipient_id?`, `title`, `assigner_user_id?`, `assignee_user_id?` | Recipient id falls back through the aliases |
| PATCH | `/assignments/{assignment}` | `status?`, `read?` | Recipient only; status only while pending |

### Reminders

| Method | Path | Input | Notes |
| --- | --- | --- | --- |
| GET | `/reminders` | None | Received reminders, latest 50 |
| POST | `/reminders/{user}` | `message`, `group_id?` | Connection or supervised member only |
| PATCH | `/reminders/{reminder}` | `read` boolean | Recipient only |

### Notifications

| Method | Path | Input | Notes |
| --- | --- | --- | --- |
| GET | `/notifications` | None | `{notifications: [...], unreadCount}`; latest 60 |
| PATCH | `/notifications/{notification}` | `read` boolean | Owner only; returns updated count |

### Admin

Every route below also requires the `EnsureUserIsAdmin` middleware.

| Method | Path | Input | Notes |
| --- | --- | --- | --- |
| GET | `/admin/overview` | None | Aggregate counts |
| GET | `/admin/users` | None | User directory rows |
| GET | `/admin/logs` | None | Latest 200 entries |
| POST | `/admin/logs` | `type`, `message`, `detail?` | Writes an admin log |
| DELETE | `/admin/logs` | None | Clears all logs |
| GET | `/admin/status` | None | DB ping, API, auth, versions, environment |
| GET | `/admin/collaboration` | None | Recent invitations, assignments, reminders |

### Local-only web routes

`backend/routes/web.php` registers a development database board only when `app()->isLocal()`:

- `GET /db`
- `GET /db/{table}`
- `GET /db/admin/overview`
- `GET /db/admin/users`
- `GET /db/admin/logs`
- `GET /db/admin/status`

These are not API routes and are not registered outside the local environment.

## 9. Frontend reference

### Boot and providers

`frontend/src/main.jsx` mounts `AuthProvider` outside `ThemeProvider`. `App` renders `BrowserRouter` and the route tree. `AppShell` wraps every page and supplies `NotificationsProvider`, the sidebar, the bottom navigation, and the notification bell.

### Routes

| Path | Page | Guard |
| --- | --- | --- |
| `/` | `MainPage` | None; guests see a lock/prompt |
| `/others` | `OthersPage` | None; public search allowed |
| `/settings` | `SettingsPage` | None; account actions require auth |
| `/admin` | `AdminPage` | `RequireAdmin` UI guard plus server middleware |

### Hooks

| Hook | Owns | Notes |
| --- | --- | --- |
| `useLocalStorage` | Typed-ish local state with JSON serialization | Used for theme and device accounts |
| `useProjects` | Personal projects, tasks, completion | Optimistic adds and updates; task mutations reconcile the full project |
| `useConnections` | Connections, search, groups, invitations, group tasks, votes, assignments | Reloads groups after mutations so collaborators see the same state |
| `useAdmin` | Admin overview, users, logs, status, collaboration | Swallows transient admin API failures |
| `useProjectTasks` | Older task hook | Present but not imported by the current UI |

### Contexts

| Context | Responsibility |
| --- | --- |
| `AuthContext` | Login, register, logout, add account, switch account, profile updates, permissions, profile code |
| `ThemeContext` | Theme mode, preset, local persistence, server sync, guest lock |
| `NotificationsContext` | Notification feed, unread count, reminders, assignment lists, invite/assignment/reminder actions |

### localStorage keys

| Key | Owner | Contents |
| --- | --- | --- |
| `pb_accounts` | `AuthContext` and `api/client.js` | Accounts and tokens authorised on this device |
| `pb_active_account` | `AuthContext` and `api/client.js` | Active account id |
| `pb_theme_mode` | `ThemeContext` | `dark` or `light` |
| `pb_theme_preset` | `ThemeContext` | Preset id |

No project, group, connection, notification, or admin data is stored in localStorage.

### API client

`frontend/src/api/client.js`:

- Reads the active token from `pb_accounts` and `pb_active_account`.
- Prefixes every request with `/api`.
- Sends JSON when a body exists.
- Attaches `Authorization: Bearer` when a token exists.
- Returns parsed JSON, including an empty body.
- Throws an error with `status` and `errors` for non-2xx responses.
- Logs method, path, status, and elapsed time in development only.
- Never logs request bodies, passwords, tokens, or response payloads.

### Utility modules

- `frontend/src/utils/actionStatus.js` maps API failures to human-readable action states.
- `frontend/src/utils/events.js` broadcasts a group-changed event so the notification bell and group list stay in sync after invitation or assignment actions.

### Component map

| Folder | Main pieces |
| --- | --- |
| `components/ui` | Button, Modal, ConfirmDialog, Field, Avatar, StatusBadge, StatusIcon, EmptyState, GuestLock, PageHeader, Panel |
| `components/layout` | AppShell, Sidebar, BottomNav, navItems, RequireAdmin, NotificationBell, NotificationPanel |
| `components/projects` | ProjectCard, ProjectFormModal, ProjectDetailsModal, TaskList, TaskItem, ProgressBar, StatGrid |
| `components/others` | SearchBar, UserResultCard, ProfileView, CreateGroupModal, JoinGroupModal, InviteMemberModal, AssignProjectModal, GroupCard, GroupDetailModal |
| `components/settings` | SettingShell, ProfileSection, ProfileCodeSection, ThemeSection, VisibilitySection, PermissionsSection, AccountSection, FeedbackSection, SwitchAccountModal, AuthModal |
| `components/admin` | AdminOverview, AdminData, AdminUserStats, AdminCollaboration, AdminWebStatus, AdminConsole |

### UI state handling

The UI exposes loading, empty, error, and success states in the main task and group surfaces. `failure()` converts API errors into specific messages for invalid join codes, expired codes, already-connected, already-member, permission denied, and incomplete-project cases. The project details modal disables Complete until tasks exist and all are done. The group details modal disables supervised Complete until tasks exist and all are done. Request Complete for collaborating groups requires only one task, because votes may start before the work is finished.

## 10. Design system

### Three layers

The design system uses a three-layer token pipeline:

1. **Primitive tokens** in `assets/design-tokens.json` hold raw values: neutral palette, semantic hues, type scale, spacing, radii, shadows, and durations.
2. **Semantic tokens** map those values to roles such as `--bg`, `--surface`, `--accent`, `--danger`, `--warn`, `--mint`, and `--status-*`.
3. **Component tokens** describe button, card, input, sidebar, and slider values.

`assets/design-tokens.json` is the source. `pnpm tokens:generate` writes `assets/design-tokens.css`; `pnpm tokens:copy` copies it to `frontend/src/tokens/tokens.css`; `pnpm tokens:sync` does both. `frontend/src/index.css` imports the token stylesheet and holds the composition layer. `tailwind.config.js` maps the semantic variables to Tailwind names. **Caveat:** the generator emits only the primitive/semantic/component/`.dark` layers; the `html[data-preset]` override blocks and the `STATUS & UTILITY` section in `frontend/src/tokens/tokens.css` are hand-maintained. Running `pnpm tokens:sync` would overwrite `src/tokens/tokens.css` with the shorter generated file and destroy every preset block â€” add preset work directly to `src/tokens/tokens.css` (and mirror new primitive groups into `design-tokens.json` for source-of-truth consistency), and do not run the sync until the generator itself is extended.

### Themes and presets

`html[data-theme]` selects dark or light. `html[data-preset]` selects the hue set. The preset ids are:

- `default` (Amber â€” the original Solar Gold; remains the default preset for all users, guests and logged-in)
- `blue`
- `cyan`
- `pink`
- `lavender`
- `mint`
- `cotton-candy`
- `nebula` (Nebula Purple â€” opt-in atmospheric preset: obsidian canvas, electric violet accents, radial hero glow, crisp 1px translucent violet borders)

The default preset uses yellow `#edc025` for primary and active states. The core neutrals are warm near-black `#0b0b0a` and warm off-white `#f7f6f2`. The `nebula` preset overrides its neutrals with a deep-space obsidian set (`#09080f` canvas, `#13111e`-family translucent surfaces, `rgba(167,139,250,.16)` 1px borders) and drives two opt-in atmospheric tokens: `--hero-glow` (radial violet/indigo wash, `none` on every other preset) and `--card-top-highlight` (1px inner top-edge light, `none` elsewhere). The amber `default` and `cotton-candy` blocks are strictly isolated â€” their CSS variable definitions are untouched. Semantic roles:

| Role | Default hue | Use |
| --- | --- | --- |
| Accent | Yellow `#edc025` | Primary actions, active navigation, progress, selection |
| Warn | Amber `#e8933c` | Attention and urgent states |
| Danger | Coral `#d85a50` | Destructive actions and errors only |
| Mint | `#5fbf97` | Success and completed |
| Cyan | `#4fb8cc` | Information and collaboration |
| Pink | `#e08a9e` | Personality and social accents |
| Purple | `#a58fd6` | AI and special states |

`cotton-candy` is the only dual-tone preset and uses Fredoka for display type. Preview colors live in `ThemeContext.jsx`; they are not derived from the danger color.

### Guest theme lock

Guests can switch dark and light mode, but their preset is forced to `default`. Custom presets require an account and are persisted through `PUT /api/theme`.

### Typography

Inter is the display and body face. JetBrains Mono is used for technical labels, ids, counts, and metadata. Fredoka appears only in the cotton-candy preset. Type sizes and spacing come from primitive tokens.

### Status communication

Project status uses four tokens and a matching icon:

- `wait`: On-Wait
- `progress`: In-Progress
- `urgent`: Urgent
- `completed`: Completed

Status is never communicated by color alone. `StatusBadge` pairs the color with an icon and a text label. `StatusIcon` supplies the SVG shapes and the progress spinner.

### Visual direction

The interface targets a modern productivity SaaS feel with warm neutrals, flat surfaces, compact density, and restrained shadows. Transitions use primitive durations in the 150 to 200 ms range. Buttons and controls use semantic tokens, not raw hex values. The main exceptions are the intentionally hardcoded preview swatches in `ThemeContext.jsx` and a cyan Tailwind palette in the collaborating-group badge in `GroupCard.jsx`.

## 11. Seed data

`backend/database/seeders/DatabaseSeeder.php` is idempotent and safe to re-run. All seeded accounts use the password `password`. These credentials are for local development and must not be surfaced in the UI.

| Email | Name | Role | Handle | Visibility |
| --- | --- | --- | --- | --- |
| `reyhan@studio.com` | Reyhan N. | user | RN-1042 | connections |
| `anita@studiodesign.com` | Anita T. | user | AT-2201 | everyone |
| `budi@studiodesign.com` | Budi S. | user | BS-0087 | supervisor |
| `maya@freelance.io` | Maya K. | user | MK-5510 | everyone |
| `dinda@studiodesign.com` | Dinda P. | user | DP-3390 | private |
| `admin@colleris.com` | Admin | admin | AD-0001 | private |

Other seeded data:

- 7 personal projects: 5 for Reyhan, 2 for Anita.
- 4 symmetric connection rows: Reyhan and Anita, Reyhan and Maya.
- Design Studio: supervised by Anita, code `DS-7F4Q`, members Reyhan, Anita, Budi, Maya, Dinda. Contains "Brand deck for pitch" assigned to Budi and "Icon set revisions" assigned to Maya.
- Freelance Pool: collaborating, code `FP-2B9M`, members Reyhan and Maya. Contains "Landing page copy" assigned to Reyhan.
- A pending invitation for Dinda to Design Studio.
- A pending assignment from Reyhan to Budi for "Photography moodboard".
- A reminder from Anita to Reyhan with a matching notification.
- Active profile codes for Anita (`X7K9-QP`) and Maya (`H2N4-RT`).
- Personal task sets for four of Reyhan's projects and task sets for three group projects.
- Three admin log entries.

Two seeded values do not match the row data. Dinda is a Design Studio member and also has a pending invitation to that group, so accepting the invitation returns 409 and leaves it pending. The hand-set `connections_count` values also disagree with the four connection rows: Anita and Maya show 2, while each has one connection (Reyhan); Budi and Dinda show 1 with no connection rows. The seeder recomputes neither value.

The seeder uses `updateOrCreate` for users, profiles, permissions, projects, connections, groups, invitations, assignments, reminders, tasks, and admin logs. It preserves valid existing password hashes instead of resetting them on every run.

## 12. Changelog

Dates are reconstructed from file timestamps. No Git log is available. The order inside a date is approximate.

### 2026-08-23 to 2026-08-24: Frontend foundation

- React and Vite app scaffolded.
- Tailwind configured with the first semantic color set.
- Reusable UI pieces added: Button, Modal, Field, Avatar, StatusBadge, StatusIcon, EmptyState, GuestLock, and ConfirmDialog.
- Main-page project cards, project form, statistics grid, and the first responsive shell built.

### 2026-08-25: Laravel scaffold

- Laravel application added under `backend/`.
- Sanctum, Tinker, PHPUnit, Pint, and the standard Laravel migrations installed.
- Root forwarding and local vhost wiring prepared.

### 2026-08-31: Navigation and settings shells

- Sidebar, bottom navigation, and shared navigation items added.
- Settings sections for profile, profile code, permissions, account, and visibility created.
- Responsive layout refined for desktop and mobile navigation.

### 2026-09-07: Colleris schema and API base

- Colleris-specific user columns added: role, theme mode, theme preset.
- Profiles, permissions, projects, connections, groups, members, group projects, and admin logs created.
- Eloquent models, `EnsureUserIsAdmin`, and the API client added.
- Vite proxy pointed at the Laravel dev server.
- Admin shell pieces prepared.

### 2026-09-08: Route tree

- `App.jsx` split into the nested `AppShell` route tree with Main, Others, Settings, and guarded Admin.
- Shared navigation config kept as the single source for sidebar and bottom nav.

### 2026-09-11: Authentication and account flows

- `AuthController` added registration, login, logout, profile updates, profile codes, and theme persistence.
- `AuthContext` added device session storage, account switching, and server-backed profile updates.
- Admin data panel and the create-group modal added.
- Root `AGENTS.md` written for local environment notes.

### 2026-09-14: Directory, settings, and developer tools

- Local-only database board added under `/db`.
- Search bar, user result card, profile view, avatar, bottom navigation, and visibility settings refined.
- Auth modal and the settings account surface completed.

### 2026-09-21 morning: Collaboration foundation

- Join codes added to groups.
- Group invitations table and flow added.
- Assignments table and permission-aware `AssignmentService` added.
- Reminders table and controller added.
- User notifications table, controller, and bell/panel added.
- Connections controller expanded with public search and visibility-aware profiles.
- Admin collaboration feed, user list, and status endpoint added.
- Group and assignment UI added: join, invite, assign, notification actions.
- READMEs updated for the collaboration layer.

### 2026-09-21 late morning: Design system v1.0

- `docs/brand-guidelines.md` written as the brand source of truth.
- W3C DTCG token source and generated CSS added under `assets/`.
- Seven presets defined and wired through `ThemeContext` and `AuthController`.
- Flat-design revision applied: semantic surfaces, compact density, 150 to 200 ms transitions, restrained shadows.
- Token generation and validation scripts added.
- 3-layer rollback files archived to `C:\laragon\www\colleris-rollback-3layer-20260921.zip` on 2026-10-20; originals removed. The archive is partial: the referenced `ProjectCard` and `StatGrid` backups were already absent.

### 2026-09-21 afternoon: Tasks and derived progress

- `project_tasks` migration, model, and `ProjectTaskController` added.
- Personal and group projects switched to task-derived progress.
- Complete and reopen flows added with server validation.
- Read-only progress bar, task item, and task list added.
- Project details modal became the primary task surface.
- Group details modal gained shared project tasks.
- Seed data expanded with task sets.
- `FINAL_REPORT.md` recorded the phase 2 V2 build.

### 2026-09-22: Task UI refinements

- Project controller and `useProjects` reconciled task mutations with full project payloads.
- Task list and task item UI refined.
- Project details modal and main page wiring updated for add, edit, toggle, delete, and reorder.

### 2026-10-05/06: Group modes and completion votes

- Group type labels and payload fields added: `groupType`, `groupTypeLabel`, and the Supervised Projects / Collaborating Team Projects distinction.
- `assignee_user_id` renamed to `assigner_user_id` with an idempotent migration, foreign-key handling, and legacy aliases.
- `group_project_completion_votes` table added with unique per-member rows and approve/reject/pending states.
- `vote_status` and `vote_initiator_id` added to `group_projects`.
- Group project completion split: supervised groups complete directly; collaborating groups require a unanimous vote.
- Vote start, vote cast, vote list, reject, and cancel actions added to the API and group details UI.
- Group task reorder endpoint and UI added; personal task reorder was already wired in `useProjects`.
- Supervised task management restricted to owner/supervisor; any member can toggle completion.
- Supervised completion notifications and admin audit entries added.
- Assignment service updated for the new column name with a fallback.
- Seed data updated to support both column names.
- Group details UI gained vote status, approval counts, request-complete, approve, reject, and cancel controls.
- Group cards gained type labels.

### 2026-10-20: Documentation snapshot

- `docs/PROJECT.md` added as the consolidated project reference and reconstructed changelog.
- `frontend/README.md`, `backend/README.md`, and `AGENTS.md` aligned with the current code and this reference.
- No application code changed as part of this documentation pass.
- MySQL was offline during the pass, so the live migration state was not re-checked.

### 2026-11-02: Consolidated documentation

- `docs/COLLERIS.md` added as the product and engineering overview.
- No application code changed as part of that documentation pass.
- Sources were the source tree, this document, the app READMEs, `AGENTS.md`, `FINAL_REPORT.md`, and the brand guidelines.

### 2026-11-02: Query performance pass

- `backend/app/Models/Project.php` and `GroupProject.php`: task statistics reuse eager-loaded tasks or one aggregate query; progress recalculation only saves when `progress` or `status` changes; complete/reopen reuse the same statistics path.
- `backend/app/Http/Controllers/Api/ProjectController.php`: `index` fetches card fields and tasks once, then recalculates from memory instead of re-querying. `show`, `update`, and progress updates reuse loaded tasks.
- `backend/app/Http/Controllers/Api/GroupController.php`: added shared group/invitation relation graphs; eager-loads members, member profiles, supervisors, group projects, tasks, votes, assigners, and assigner profiles. Membership counts and authorization use loaded data.
- `backend/app/Http/Controllers/Api/AdminController.php`: user list selects management fields, uses `withCount('projects')`, and limits profile columns.
- `backend/app/Http/Controllers/Api/ConnectionsController.php`: directory search selects result-card fields and eager-loads `user:id,name`; profile detail uses `loadMissing('profile')`.
- `backend/app/Http/Controllers/Api/AssignmentController.php`, `ReminderController.php`, and `NotificationController.php`: feed payloads eager-load profile initials, select response columns, and avoid lazy profile queries.
- `backend/app/Http/Controllers/Api/ProjectTaskController.php`: authorization uses `loadMissing` with required fields; mutation responses select task/vote columns; parent payloads refresh once with response fields instead of repeated `fresh()->load()` calls.
- `backend/database/migrations/2026_11_02_000000_add_query_indexes_for_performance.php`: added indexes for project ownership, project-task ordering, profile handle/code lookup, assignment and reminder recipients, and notification ownership. Applied to `colleris_db`.
- Validation: `php -l` passed on modified PHP files; `composer test` passed (2 tests); query probes measured 2 queries for 5 projects, 10 constant queries for 5 groups, 9 for group detail, 2 for admin users, 4 for notifications, and 2 for directory search.
- No frontend source changed. TanStack Query cache updates and feed pagination remain recommended follow-ups.
- Updated `docs/COLLERIS.md` and `docs/PROJECT.md` snapshot dates, data-model index notes, validation history, and changelog entries for this pass.

### 2026-11-02: Assignment, directory, and group-project edit fixes

- `backend/app/Http/Controllers/Api/ConnectionsController.php`: normalized profile-code lookups (uppercase, spaces/hyphens removed), exact-match ordering, active-code expiry filtering, and null-safe user names.
- `backend/app/Services/AssignmentService.php`: auto-approved assignments now notify the recipient.
- `backend/app/Http/Controllers/Api/GroupController.php`: added `updateProject` with member/supervised permissions, completed-project guard, membership validation for the assignee, legacy-column support, assignee notification, and `assignerName`/`assigneeName` payload fields.
- `backend/routes/api.php`: added `PATCH /group-projects/{groupProject}`.
- `frontend/src/context/NotificationsContext.jsx`: account-aware loading, guest reset, focus/visibility refresh, and 45-second polling.
- `frontend/src/components/layout/NotificationBell.jsx`: refresh on open.
- `frontend/src/components/others/AssignProjectModal.jsx`: self-exclusion, first-other-member default, and empty state.
- `frontend/src/hooks/useConnections.js`: added `updateGroupProject`.
- `frontend/src/pages/OthersPage.jsx`: wired group-project updates, derived the open group from the latest list, and refreshed groups when opened.
- `frontend/src/components/others/GroupDetailModal.jsx`: inline assignment editor, permission-aware assign visibility, and assignee names.
- Validation: production build passed (80 modules, 281.06 kB JS / 50.40 kB CSS); `composer test` passed (2 tests); PHP lint passed on modified backend files; probes verified normalized active-code search, recipient notification/received feed, and group-project title/assignee updates in the group payload.

### 2026-11-02: Group task completion and permissions

- `backend/app/Models/Project.php` and `GroupProject.php`: fixed the aggregate alias collision in `taskStats()`. `SUM(completed)` inherited the `ProjectTask` boolean cast through the `completed` alias, so sums above 1 became `1` and progress stalled (for example at 33% with 3 tasks). Aliases are now `total_count` and `completed_count`.
- `backend/app/Http/Controllers/Api/ProjectTaskController.php`: supervised task add/edit/delete/reorder is restricted to the owner or supervisor; any group member can still toggle task completion. Toggling recalculates project progress. Collaborating groups retain member-wide task CRUD.
- `frontend/src/components/projects/TaskList.jsx` and `TaskItem.jsx`: added permission props for add, toggle, edit, and delete. Unauthorized controls are hidden; completion remains visible.
- `frontend/src/components/others/GroupDetailModal.jsx`: supplies supervised/collaborating task permissions and updated copy.
- Validation: production build passed (80 modules, 281.61 kB JS / 50.47 kB CSS); `composer test` passed (2 tests); PHP lint passed; probes confirmed supervised progress `33 â†’ 66 â†’ 100`, supervisor completion, member `403` on add/rename/delete, owner add/delete success, collaborating member task CRUD, and personal progress `0 â†’ 66 â†’ 100`.

### 2026-11-02: Group self-assignment

- `backend/app/Services/AssignmentService.php`: group members can now assign a project to themselves. Self-assignment is forced to `approved` regardless of `project_assignment`, creates the group project immediately, and skips recipient/self notifications. Personal self-assignment remains `422`. The supervised-group owner/supervisor gate now applies only when assigning to another member.
- `backend/app/Http/Controllers/Api/GroupController.php`: a supervised group's current assignee can still edit the assignment title, but only the owner or supervisor can change its assignee. This prevents a self-assigned member from bypassing the supervised assignment rule.
- `frontend/src/components/others/AssignProjectModal.jsx`: includes the current member as a selectable `(you)` recipient, restricts supervised non-managers to self, defaults to another member when allowed, and uses self-specific result/button copy.
- `frontend/src/components/others/GroupDetailModal.jsx`: exposes the assign action to supervised members, keeps the assignment reassign selector disabled for non-manager assignees, and updates the permission copy.
- Validation: production build passed (80 modules, 282.04 kB JS / 50.47 kB CSS); `composer test` passed (2 tests); PHP lint passed; probes confirmed personal self-assignment `422`, supervised/collaborating self-assignment `approved` with zero notifications, other-member requests still `pending` with a notification, member-to-other assignment `403`, and self-assigned title edit `200` versus reassign `403`.

### 2026-11-11: Bug fixes, collaboration UX polish, rename migration, tests & lint

**Bugs fixed**
- `GroupCard.jsx` + `GroupDetailModal.jsx`: replaced hardcoded Tailwind cyan palette for the collaborating-group badge with semantic tokens (`bg-statusInfo text-onStatusInfo`) mapped to `--status-info: var(--cyan)` / `--on-status-info: var(--on-accent)`, added to `index.css` composition layer and `tailwind.config.js`. No preset collision â€” cyan is already a preset-safe role.
- `NotificationPanel.jsx`: disambiguated labels â€” `supervised_complete` â†’ `'Supervisor marked complete'`, `completion_vote_requested` â†’ `'Completion vote requested'`, `completion_vote_approved` â†’ `'Unanimously approved'`.
- Deleted dead hook `useProjectTasks.js`; pruned unused `updateProgress` return from `useProjects.js`; removed unused `fetchGroupVotes` export from `useConnections.js`. `finalizeGroupVote` retained (used by OthersPage).
- Fixed seeder `connections_count` hand-set values: removed static counts from user profile data and added post-seed recomputation loop over actual `connections` rows so every run produces correct denormalised counts.
- **F1 join-code expiry**: `GroupController@store` now sets `join_code_expires_at = now()->addDays(7)` on every new group. Existing seeded groups with null expiry remain valid (backward-compatible).

**Collaboration UX**
- **F3 inline vote actions**: `NotificationPanel` renders Approve/Reject buttons directly in `completion_vote_requested` feed entries when the current user hasn't voted yet; `completion_vote_rejected` entries show the rejection reason from payload. Calls `voteGroupComplete()` via NotificationsContext.
- **F4 sent reminders**: new `GET /api/reminders/sent` endpoint (`ReminderSentController`) returns the authenticated user's sent-reminder history (latest 50, same payload shape as received). Exposed via `NotificationsContext.sentReminders` array. Added "Sent reminders Â· N" tab to NotificationPanel alongside Inbox.
- **B6 reminder group validation**: `ReminderController::store` now validates that a provided `group_id` actually contains the recipient before accepting, returning 422 otherwise.

**Rename migration (B4)**
- New migration `2026_11_11_000000_rename_assigned_to_assigner_on_group_projects.php` renames `group_projects.assigner_user_id` â†’ `assigned_user_id` idempotently (SQLite and MySQL paths, FK preservation, reversible). Legacy aliases (`assigner_user_id`, `assignee_user_id`) retained in validation rules and API payloads for one release cycle.
- Updated `GroupProject` model: `#[Fillable]` uses `assigned_user_id`; added `assigned()` relation with `assigner()` as deprecated alias pointing to it.
- Updated `AssignmentService`, `GroupController::updateProject`, `GroupController::assignProject` legacy, `ProjectTaskController` â€” all prefer `assigned_user_id` with fallbacks through `Schema::hasColumn()` checks.
- Frontend: `GroupDetailModal.jsx` sends `assigned_user_id` in PATCH body; read-side remains compatible via both aliases.

**Quality & tooling**
- Added `.eslintrc.cjs` flat config with `eslint-config-react-app` (React hooks rules: `rules-of-hooks` error, `exhaustive-deps` warn). Scripts `lint` / `lint:fix` wired into `package.json`; `validate:all` now runs token validation + lint together.
- Wrote baseline PHPUnit integration test suite (6 classes, ~40 test methods): `AuthTest`, `ProjectProgressTest`, `GroupFlowTest`, `AssignmentTest`, `VoteLifecycleTest`, `AdminAuthTest`, `ReminderValidationTest`. Tests use SQLite in-memory (via existing phpunit.xml config) with `RefreshDatabase`; cover auth flows, task-derived progress derivation, group join/expiry/invite, permission-aware assignment lifecycle, unanimous vote lifecycle, admin authorization gates, and reminder group membership validation. Requires MySQL/PDO-SQLite driver at runtime to execute.

**Build**
- Production build green: 80 modules, 285.70 kB JS / 50.46 kB CSS.

### 2026-11-20: Task-list control visibility, group task UI restore, settings panel redesign

- `TaskItem.jsx` rewritten: the row now uses `flex items-center` with a sized circular checkbox (`statusCompleted` fill when done, `aria-pressed`), and the move/edit/delete controls are always visible instead of hover-gated behind a missing `group` class â€” the previous version's check/edit/delete buttons were effectively invisible. Numbered task rows (`#n`) match the reference mock. `TaskList.jsx` items get `divide-y` row separation.
- `GroupDetailModal.jsx` rebuilt after the 11/19 corruption recovery: each group project card again renders its full `TaskList` (add/complete/edit/delete/reorder, gated by the T1 per-assignee rule and the completed-project lock), lifecycle buttons (Complete / Request completion / Reopen / Archive), the pending-vote panel (Approve / Reject / Cancel with approval counts), and a compact project inline-edit form (title + assignee via `PATCH /group-projects/{id}`). Archived-projects fetch now goes through the token-attaching `api()` client instead of raw `fetch`. Mojibake left by the recovery (`{"\u2014"}â€¦` fragments) replaced with clean markup; member rows fixed to flex layout; the dead draft/close-confirm machinery removed since task edits are now immediate API calls.
- Settings page redesigned on the original pulseboard panel system: new `Panel.jsx` (`Panel` / `PanelHead` / `PanelBody`) renders bordered cards with titled header rows; `SettingsPage` lays them out in a two-column grid (Account | Profile, Appearance | Profile Code, Visibility | Permissions, Feedback spanning both). `ThemeSection` becomes the Appearance panel: pill dark/light mode toggle with sliding indicator, preset rows, and a fixed status-colour legend. `AccountSection` adopts the account-card layout (avatar + name + email, then switch/logout actions). `SettingShell.jsx` is now unused.
- Verified live against `colleris_db` (MySQL + `artisan serve`): group task add/toggle/update/delete/reorder and personal task flows all return 200 with server-side progress recalculation; `pnpm lint` clean (0 errors), `pnpm build` green (85 modules), `pnpm validate:tokens` unchanged at 23 baseline warnings.

### 2026-11-20: Nebula Purple preset, progress label cleanup, Playwright theme verification

- New **`nebula`** preset (strictly additive; `default`/amber and `cotton-candy` blocks byte-identical): `--primitive-color-nebula-*` group in `frontend/src/tokens/tokens.css` (obsidian neutrals `#09080f`â†’`#0E0C18`-class, electric violet accent `#9d7bff`, translucent violet border `rgba(167,139,250,.16)`), a `html[data-preset='nebula']` block (dark) plus `html[data-theme='light'][data-preset='nebula']` (soft violet light neutrals), and two new base tokens `--hero-glow` / `--card-top-highlight` that are `none` at `:root` so every other preset stays flat. `--status-wait` gets a violet-slate tint under nebula only. Mirrored into `assets/design-tokens.json` (no `tokens:sync` â€” see the pipeline caveat above).
- `ThemeContext.jsx`: `THEME_PRESETS` gains `{ id: 'nebula', name: 'Nebula Purple' }`; the former default's display name is now "Amber â€” Solar Gold". Defaults/guest-lock unchanged â€” amber stays the default for everyone; nebula is opt-in via Settings â†’ Appearance.
- Backend: `AuthController::theme()` validation list gains `nebula` (without it `PUT /api/theme` would 422 and the choice would not persist). No migration, no test changes; `AuthTest` still asserts `default`.
- Progress label de-duplication: `ProgressBar` header now shows **percentage only** (tabular-nums), with a single "`N of M tasks complete`" caption under the bar; `ProjectCard` dropped its duplicate `Â· N/M tasks` meta segment. Group cards keep their own `N/M tasks` meta line (compact bar shows % only) â€” no duplicates anywhere.
- `PageHeader` gained an `atmosphere` prop: `.page-atmosphere::before` paints `var(--hero-glow)` behind the `01 / MAIN` workspace header (used by `MainPage` only); `ProjectCard` top edge consumes `var(--card-top-highlight)`. Both are no-ops outside nebula.
- Playwright (new devDependency) + `frontend/scripts/theme-screenshots.mjs`: logs in as a seed account, switches each of the three protected presets through the real Settings picker, and captures `/` at 1440Ã—900 and 375Ã—812 â†’ `docs/screenshots/*.png` (6 files) plus a `--hero-glow` isolation probe. All captures verified: nebula shows the glow/violet treatment; amber and cotton-candy are visually untouched; mobile overflow 0px on all three.
- Validation: `pnpm lint` 0 errors; `pnpm build` 85 modules green; `pnpm validate:tokens` 25 (23 baseline + 1 sanctioned `ThemeContext` preview hex + 1 px in the `.page-atmosphere` layer).

### 2026-11-21: Post-login data-race fixes, real-time SSE, Colleris logo

- **P1 (post-login 401 race)**: `AuthContext` now persists device sessions synchronously (`writeAccounts` from `api/client.js`) on upsert/logout, so the first post-login fetches carry a token and no longer 401-wipe `/projects`, `/others`, and `/profile` until a manual reload. `useProjects`/`useConnections` catch blocks keep stale data on transient errors (zeroing only on true logout) so a dropped request never empties the UI.
- **P2 (tag chips)**: `MainPage` tag-filter fetch switched from raw unauthenticated `fetch('/api/tags')` to the authed `api('/tags')` client â€” the filter row now renders for logged-in users.
- **P3 (SSE 401 loop + lag)**: `/api/sse` moved off the Bearer-header auth group to a new `SseAuthenticate` middleware (Laravel Sanctum `PersonalAccessToken::findToken()` â€” note: Sanctum v4 renamed `findValue` â†’ `findToken`; the old call 500'd). The frontend `useSSE` hook passes the active token as `?token=` (EventSource cannot set headers), tracks `lastEventId` for JS-driven reconnects, and caps reconnects at 5Ã—3s so a bad token never loops. The controller now emits a `: stream open` marker immediately after headers so the 200 + first byte reach the client at once.
- **Dev server architecture for SSE**: the Vite proxy targets the PHP built-in dev server, not the Laragon Apache vhost (Apache runs PHP under **mod_fcgid**, `C:\laragon\etc\apache2\fcgid.conf`, which buffers live streams - a bare `flush()` probe sent no headers to the client for 8+ seconds, while the built-in server delivers headers in ~6 ms and chunks on schedule). The Windows PHP dev server is single-worker (`PHP_CLI_SERVER_WORKERS` is ignored - no forking on this platform), so an open stream would hold the one worker and starve every other API request: the proxy therefore splits the stream onto a dedicated second instance (`/api/sse` to :8001, everything else to :8000), and `SseBroadcaster` became file-backed (per-user JSON queues in `backend/storage/app/sse/`) so events cross the process boundary. Verified: `/api/health` answered in ~100 ms with a stream open, and a tinker-issued broadcast was delivered to the live stream.
- **Brand**: `frontend/public/CollerisLogo.png` (128Ã—128 transparent PNG, hexagon + N monogram, 7.8KB) added from the `C:\OpenCode\ImageSample` source; sidebar and login/register modal now show the logo with a capitalised "Colleris" wordmark.
- **Regression check**: `frontend/scripts/auth-race-check.mjs` (Playwright, Chromium) logs in through the real UI and asserts: zero 401s post-login, main grid populated on first paint, tag row renders, `/others` header matches the live API counts, `/profile` shows projects, the SSE request fires with a token and the endpoint returns 200, logo loads, brand capitalised. `frontend/scripts/sse-block-test.mjs` asserts the open stream does not starve the API and that a cross-process broadcast is delivered.

### 2026-11-21: Optimistic logged-in boot, admin verification gate, SSE worker split

- **Optimistic boot (P1 follow-up)**: `AuthContext` now seeds `user` synchronously from the device session store (`pb_accounts` already carries the full server user payload), so a logged-in user's first paint is the logged-in UI and every data fetch (`/projects`, `/tags`, `/connections`, SSE …) fires **in parallel with** the background `/api/me` verification instead of after it. `booting` stays true until `/me` settles; a 401 or schema-drift still drops to guest exactly as before. Measured on a seeded reload: all data fetches issued at +82–95 ms vs `/me` resolving ~+1.8 s.
- **P4 fixed (theme flicker at boot)**: `ThemeContext`'s guest behaviours now gate on `!user && !booting`, so the mid-boot window no longer forces the preset to `default` (flicker) or fires a stray `PUT /theme` for logged-in users.
- **Admin verification gate (security)**: a stale cached `role: 'admin'` must not render the admin UI or fire `/api/admin/*` before the server confirms the role. `RequireAdmin` shows a "Verifying session…" panel while `booting` (redirect to Main once verified non-admin); the Admin nav item is hidden in `Sidebar`/`BottomNav` until verification. The server-side `EnsureUserIsAdmin` middleware remains the authoritative boundary (403).
- **SSE worker split + file-backed broadcaster**: an open SSE stream on the single-worker Windows dev server queues every other API request behind it (verified: `/api/health` hung 30+ s with a stream open). The proxy now routes `/api/sse` to a dedicated second `artisan serve` instance (:8001); `SseBroadcaster` is file-backed (per-user JSON queue, exclusive-locked, 200-event cap, per-user monotonic ids) so events cross the two processes. `sse-block-test.mjs` proves: stream headers in ~130 ms, API answered in ~100 ms with the stream open, and a tinker-issued broadcast delivered to the live stream.
- `auth-race-check.mjs` grew from 10 to 14 assertions (optimistic-boot ordering, no stray `PUT /theme`, no admin leak on a stale cached role, admin redirect after verification) — all green, alongside `sse-block-test.mjs`.

### 2026-11-21: Per-theme logos, prompt SSE client-abort, archived-project restore fix

- **Per-theme brand marks**: 8 colourways (`C:\OpenCode\ImageSample`) → `frontend/public/logos/<presetId>.png` (128×128 transparent palette PNGs). `ThemeContext` exposes `PRESET_LOGOS` + `presetLogo(preset)` (amber fallback `/CollerisLogo.png`); `Sidebar` and `AuthModal` render the mark for the active preset, so the logo follows the theme (guests see amber; a logged-in user's server theme wins once `/me` freshens the optimistically-seeded user).
- **SSE prompt client-abort**: the single-worker `:8001` SSE instance only noticed dead clients at the next 15 s ping tick (orphan streams could hold the worker, delaying reconnects and queued streams). `SseController` now checks `flush()` write success (events + pings) and breaks the loop immediately on a dead socket; verified abort detection ~instant.
- **Archived-project restore fix**: `POST /projects/{id}/restore` and `POST /group-projects/{id}/restore` 404'd for actually-archived (soft-deleted) records — implicit route-model binding applies the SoftDeletes global scope, so trashed models never resolved and the request died before the controller ran. Added `->withTrashed()` to the two restore routes; the existing controller guards (`trashed? restore : 400`) now do all the work. Regression: new `tests/Feature/ArchiveRestoreTest.php` (4 tests, green) + live `frontend/scripts/archive-restore-check.mjs` (UI round-trip + API round-trip, scratch rows cleaned up).
- **Test-suite repair** (first runnable state on this machine): enabled `pdo_sqlite` in the Laragon php.ini (the in-memory SQLite suite could never run without it) and made `2026_11_15_000003` driver-aware (`INSERT OR IGNORE`/`datetime('now')` on SQLite; MySQL text unchanged). Full suite: 37/51 pass — the 13 failures are pre-existing drift (stale expectations, test-helper gaps, and the long-known `ReminderController:43` "Undefined array key group_id"), documented in DEV_NOTES session 6, out of scope.
- **Git**: repository initialised (`main`, identity `Yudhasepta` / noreply), root `.gitignore` (node_modules, .opencode, `backend/storage/app/sse/`, Thumbs.db), initial commit `e8b09f0` (246 files; `.env`/vendor/node_modules/SSE queues verified excluded), `remote origin → https://github.com/Yudhasepta/Colleris.git`. The user's one-time `git push -u origin main` (GCM browser sign-in as Yudhasepta) is the only remaining manual step.

### 2026-11-23: PDF export for project details (personal + group)

- New `backend/app/Http/Controllers/Api/PdfExportController.php` with two server-rendered PDF endpoints, powered by `dompdf/dompdf` (added to `composer.json`; raw library — no Laravel-constrained wrapper, no external binary):
  - `GET /api/projects/{project}/pdf` — owner-only project report: status (UI label), task-derived progress, due, tags, guide note, full task table, owner name/handle, generated timestamp. Recalculates task-backed progress before rendering, matching the read-path behaviour.
  - `GET /api/group-projects/{groupProject}/pdf` — current-member-only (checked via the existing `GroupAccess` service) report with group context: group name, type label, active join code, supervisor, members with roles; project title/status/assignee/derived progress/tags; task table; and a pending-completion-vote panel (approved counts) when `vote_status = pending`.
  - Both return `application/pdf` with a `Content-Disposition: attachment` filename (`colleris-project-<slug>-<Ymd>.pdf` / `colleris-<group-slug>-<project-slug>.pdf`).
- Two Blade templates under `backend/resources/views/exports/` (`project`, `group-project`, shared `_styles` partial) — Dompdf-safe CSS only (tables/block, no flexbox; brand palette hardcoded since Dompdf has no CSS-variable support).
- Frontend: `frontend/src/api/client.js` gains `downloadPdf(path, fallbackFilename)` (Bearer-token fetch → blob → object-URL download; server `Content-Disposition` filename wins) and `pdfSlug()`; `useProjects` gains `exportProjectPdf(project)`; `useConnections` gains `exportGroupProjectPdf(groupProject, group)`.
- UI: `ProjectDetailsModal` footer gains an "Export PDF" button (three-up row with Edit/Archive, loading + error states); `GroupDetailModal` active project cards gain a per-project "Export PDF" ghost button (visible even for completed/locked projects, so final reports can be exported); archived group-project cards gain the same button next to Restore.
- Tests: new `tests/Feature/PdfExportTest.php` (7 tests: owner download 200 + `%PDF` magic + headers, non-owner 403, guest 401, group-member download 200, non-member 403, owner archived download 200, member archived download 200) — all green on in-memory SQLite.
- Archived (soft-deleted) projects are supported: both PDF routes use `->withTrashed()` (same pattern as the restore routes), so final reports of archived records can still be exported; the controller's ownership/`GroupAccess` guards apply unchanged.
- Frontend polish: the duplicate hardcoded "Completed" span in `ProjectDetailsModal`'s header was removed (the `StatusBadge` already shows it — the span had also collided with the modal close button); the shared `Modal` close button is now a round-square red outline (`rounded-lg border-danger text-danger`) that fills with `bg-danger` + `on-danger` ✕ on hover.

## 13. Validation history

`FINAL_REPORT.md` records the phase 2 V2 validation from 2026-09-21/22:

- Migrations ran as batch 3, with 42 tables reported in `colleris_db`.
- `db:seed` was rerun idempotently without duplicate handles.
- Password hashes verified for all six seed accounts.
- Derived progress rejected an arbitrary 99 value and stayed at the task-derived value.
- Complete was rejected while tasks remained and succeeded when all tasks were done.
- Reopen retained task completion and moved status back to active.
- Group project tasks shared the same model and recalculated progress.
- Public profile visibility was checked for every visibility mode.
- Connections, join codes, invitations, assignments, reminders, and notifications were checked.
- Admin endpoints returned 200 for the admin and 403 for a normal user.
- The frontend build was green: 80 modules, a 49.95 kB CSS file, and a 272 kB JS bundle.
- Responsive layouts were checked at 375, 768, 1024, and 1280+ widths.
- No console or Laravel log errors were reported after the request logger was added.

Those results predate the 2026-10-05/06 group-mode and vote work. No test run or written validation record covers the vote flow, group reorder, assigner rename, or current group UI.

An earlier `frontend/dist` output was dated 2026-10-05 12:47 and contained the group-mode strings; that build log was not kept. The 2026-11-02 fix pass rebuilt the frontend successfully (80 modules, 281.06 kB JS / 50.40 kB CSS), but no browser UI run was performed.

On 2026-10-20, `php artisan migrate:status` failed because MySQL was not reachable at `127.0.0.1:3306`. The database schema in this document comes from the migration files and models, not from a live inspection.

There is no project-level frontend lint or typecheck script. The frontend has a token validation script. The backend has Laravel's PHPUnit dependency and a Composer test script, but no recorded project test suite was run.

### 2026-11-02: Query performance pass

- `php -l` passed for every modified PHP file.
- `composer test` passed: 2 tests, 2 assertions.
- `php artisan migrate --force` applied `2026_11_02_000000_add_query_indexes_for_performance` to `colleris_db`.
- Direct query-count probes produced:
  - 5 projects: 2 queries.
  - 5 groups: 10 queries, constant with group count.
  - Group detail: 9 queries.
  - Admin user list: 2 queries.
  - Notifications: 4 queries.
  - Directory search: 2 queries.
- No frontend build or browser UI run was performed during this pass.

### 2026-11-02: Assignment, directory, and group-project edit fixes

- `php -l` passed for every modified backend file.
- `composer test` passed: 2 tests, 2 assertions.
- `npm run build` passed: 80 modules, 50.40 kB CSS, 281.06 kB JS.
- Direct controller probes confirmed:
  - Code search matched `Z9Q8-WD`, `z9q8wd`, and `Z9Q8 WD`, returned no result for an expired code, and returned no result for an unknown code.
  - An auto-approved personal assignment increased the recipient notification count from 4 to 5 and appeared in the recipient's `received` feed.
  - A group-project PATCH changed the title and assignee, returned the loaded assigner, notified the new assignee, and reflected both in the refreshed group payload.
- No browser UI run was performed; verification used the production build and direct probes.

### 2026-11-02: Group task completion and permissions

- `php -l` passed for the changed models and controller.
- `composer test` passed: 2 tests, 2 assertions.
- `npm run build` passed: 80 modules, 50.47 kB CSS, 281.61 kB JS.
- Direct probes confirmed:
  - Supervised group with 3 tasks: member toggles moved progress `33 â†’ 66 â†’ 100`; supervisor completion then succeeded.
  - Member add, rename, and delete returned `403`; owner add and delete succeeded.
  - Collaborating group member could add, complete, and delete tasks.
  - Personal project with 3 tasks moved `0 â†’ 66 â†’ 100` and completed successfully.
- No browser UI run was performed.

### 2026-11-02: Group self-assignment

- `php -l` passed for the changed service and controller.
- `composer test` passed: 2 tests, 2 assertions.
- `npm run build` passed: 80 modules, 50.47 kB CSS, 282.04 kB JS.
- `npm run validate:all` reported the same 23 pre-existing token warnings (9 hardcoded hex, 14 pixel values); no new violations were reported for the changed components.
- Direct controller probes confirmed:
  - Personal self-assignment returned `422` and created no assignment.
  - A supervised-group member with `request` permission self-assigned successfully; status was `approved`, the group project was created with the member as assignee, and no notification was created.
  - The same member still could not assign to another member (`403`); an owner assignment to that member remained `pending` and notified them.
  - The self-assigned member could rename the assignment (`200`) but could not reassign it (`403`); the owner could reassign it (`200`).
  - A collaborating-group member with `request` permission self-assigned successfully with zero notifications.
- No browser UI run was performed.

## 14. Known gaps and document drift

These are current-code observations, not a promise that every item is a defect. Some are intentional tradeoffs; others need a decision.

### Behaviour and data

- **`assigner_user_id` stores the assignee.** Resolved â€” migration `2026_11_11_000000` renamed the column to `assigned_user_id`. Legacy aliases removed from all application code on 2026-11-16. Models and controllers use `assigned_user_id` exclusively; API payloads only accept `assigned_user_id`.
- **Removing a supervisor clears flags correctly.** `removeMember` now detects when the removed user was the supervisor and sets both `supervisor_id = null` and `has_supervisor = false` atomically inside the transaction. Verified working as of 2026-11-16.
- **Collaborating groups wording is now accurate.** UI describes them as "join by code or invite" with direct add disabled, matching actual behaviour.
- **Supervised groups render one Invite button.** Fixed â€” `GroupDetailModal` no longer duplicates the Invite control.
- **Vote finalisation (resolved 2026-11-12):** `ProjectTaskController::toggleComplete()` calls `GroupProjectVoteService::maybeFinalize()` after every task toggle. When all votes are approved and the last task is completed, the project finalises automatically â€” the frontend no longer requires a separate "Finalize completion" click for this path. A manual `/group-projects/{id}/finalize-vote` POST still exists for explicit-force cases.
- **Duplicate connection returns 200.** The API returns `Already connected` with a 200 status. `FINAL_REPORT.md` describes a 409. The frontend handles the message, so this is mostly a documentation mismatch in the historical report.
- **Group list reads write progress.** `GroupController::index` and `show` recalculate and save task-backed progress while serving a GET request. It keeps the response fresh, but reads are not side-effect free.
- **Admin connection totals double-count.** The overview sums `profiles.connections_count`, and every symmetric pair increments both sides.
- **Notification labels complete.** All types (`supervised_complete`, `completion_vote_requested/rejected/approved/cancelled`, `supervisor_task_override`) map to distinct human-readable labels. Inline actions added for invites, assignments, reminders, and pending vote requests.
- **Reminder group validation enforced.** `ReminderController::store` verifies recipient membership in the provided `group_id` before accepting.
- **Join-code expiry active.** New groups auto-set `join_code_expires_at = now()->addDays(7)`. `/groups/join` rejects expired codes. Seeded groups without explicit expiry remain valid (grandfathered).
- **Zero-task legacy projects can retain progress.** New projects start at 0, but a seeded completed project with no tasks can keep its 100% display until it is reopened or recalculated. Task-backed projects are consistent.

### Dead or transitional frontend code

- All previously dead hooks (`useProjectTasks.js`, unused `updateProgress` and `fetchGroupVotes` exports) have been removed. `finalizeGroupVote` retained for explicit manual-finalise calls (still wired into `OthersPage.jsx`).

### Frontend code drift

- `GroupCard.jsx` uses a hardcoded Tailwind cyan palette for the collaborating badge instead of the semantic token set.
- `ProjectFormModal` still sends `progress` on create and shows a status selector, even though the server ignores progress and controls completion through tasks.

### Remaining documentation drift

`frontend/README.md`, `backend/README.md`, and `AGENTS.md` (the last now in `C:\OpenCode\CollerisNotes\agent-notes\` with `FINAL_REPORT.md`, `DEV_NOTES.md`, the QA scripts, screenshots and MCP tooling — see that folder's README) were aligned with the current code on 2026-10-20. Remaining drift is confined to the historical report:

- `FINAL_REPORT.md` is a phase 2 V2 snapshot. It does not cover the October group-mode and vote changes.
- `FINAL_REPORT.md` describes duplicate connections as 409. The current API returns 200.
- `FINAL_REPORT.md` says a legacy `ProjectProgress` file was kept. It is not in the current tree.

## 15. Maintenance guide

### Adding or changing an API endpoint

1. Add the route in `backend/routes/api.php` inside the correct middleware group.
2. Put the controller in `backend/app/Http/Controllers/Api/`.
3. Validate input with Laravel validation and return a named JSON key.
4. Check ownership or membership explicitly. Do not rely on the frontend guard.
5. Call the endpoint through a hook or context, not directly from a component.
6. Update the API table in this document and add a changelog entry.

### Changing project or task behaviour

- Project status and task-derived progress live in `Project` and `GroupProject`.
- Task CRUD and permission checks live in `ProjectTaskController`.
- Personal task state is reconciled in `useProjects`.
- Group task state is reloaded through `useConnections` after every mutation.
- If you change completion rules, update both the model and the UI disabled states.

### Changing groups or assignments

- Group membership and payload shape live in `GroupController`.
- Assignment permission mapping lives in `AssignmentService`.
- The assigned member is stored in `assigner_user_id`, despite the name.
- If you rename that column again, update the migration fallbacks, seeders, payload aliases, and both frontend hooks.

### Changing the design system

1. Edit `assets/design-tokens.json`.
2. Run `pnpm tokens:sync` from `frontend/`.
3. Run `pnpm validate:tokens`.
4. Check `docs/brand-guidelines.md` and `ThemeContext.jsx` when adding a preset.
5. Keep the backend theme validation in `AuthController` in sync with the preset list.
6. Use semantic tokens in components. Do not hardcode hex values or default Tailwind palette colors.

### Adding a navigation destination

Edit `frontend/src/components/layout/navItems.jsx`. Both the sidebar and the bottom nav read that file. Add the route in `App.jsx`. If the destination is admin-only, set `adminOnly: true`.

### Database safety

- Run migrations and seeders only against `colleris_db`.
- Never point an artisan command at `laravel_db` or at another local database.
- Avoid `migrate:fresh` unless you intend to destroy the local Colleris data.
- The seeder is idempotent and should be preferred for restoring seed rows.

### Documentation upkeep

Add a dated changelog entry when a feature, schema, route, preset, or seed shape changes. Update the affected reference section in the same pass. If an older README disagrees with current code, either fix the README or add the mismatch to the known-gaps section. Keep this file as the current reference and leave `FINAL_REPORT.md` as the historical phase 2 record.

## 16. Sources

- `docs/PROJECT.md` (this file)
- `docs/brand-guidelines.md`
- `FINAL_REPORT.md`
- `AGENTS.md`
- `frontend/README.md`
- `backend/README.md`
- `frontend/package.json`
- `frontend/vite.config.js`
- `frontend/tailwind.config.js`
- `frontend/src/App.jsx`
- `frontend/src/api/client.js`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/context/ThemeContext.jsx`
- `frontend/src/context/NotificationsContext.jsx`
- `frontend/src/hooks/useProjects.js`
- `frontend/src/hooks/useConnections.js`
- `frontend/src/hooks/useAdmin.js`
- `frontend/src/components/layout/AppShell.jsx`
- `frontend/src/components/layout/navItems.jsx`
- `frontend/src/components/others/GroupDetailModal.jsx`
- `frontend/src/components/others/GroupCard.jsx`
- `frontend/src/components/projects/ProjectFormModal.jsx`
- `frontend/src/components/projects/ProjectDetailsModal.jsx`
- `frontend/src/index.css`
- `frontend/src/tokens/tokens.css`
- `assets/design-tokens.json`
- `assets/design-tokens.css`
- `backend/routes/api.php`
- `backend/routes/web.php`
- `backend/bootstrap/app.php`
- `backend/app/Http/Controllers/Api/AuthController.php`
- `backend/app/Http/Controllers/Api/ProjectController.php`
- `backend/app/Http/Controllers/Api/ProjectTaskController.php`
- `backend/app/Http/Controllers/Api/GroupController.php`
- `backend/app/Http/Controllers/Api/ConnectionsController.php`
- `backend/app/Http/Controllers/Api/AssignmentController.php`
- `backend/app/Http/Controllers/Api/ReminderController.php`
- `backend/app/Http/Controllers/Api/NotificationController.php`
- `backend/app/Http/Controllers/Api/AdminController.php`
- `backend/app/Services/AssignmentService.php`
- `backend/app/Models/User.php`
- `backend/app/Models/Project.php`
- `backend/app/Models/GroupProject.php`
- `backend/app/Models/ProjectTask.php`
- `backend/database/migrations/*.php`
- `backend/database/seeders/DatabaseSeeder.php`
