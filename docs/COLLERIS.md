# Colleris — Product and Engineering Documentation

> Snapshot date: 2026-11-02
> Repository: `C:\laragon\www\colleris`
> Database: `colleris_db` only
> Canonical technical reference: `docs/PROJECT.md` (snapshot 2026-11-02)

This document consolidates Colleris's product goals, implemented features, repository and system structure, data model, API surface, design system, local setup, and reconstructed changelog. It is intended as the single onboarding and planning document. Where deeper implementation detail is needed, `docs/PROJECT.md` remains the authoritative reference.

The repository has no Git history in this workspace. Changelog dates are reconstructed from file timestamps, migration filenames, and `FINAL_REPORT.md`; treat them as approximate.

## Contents

1. [Product overview](#1-product-overview)
2. [Goals](#2-goals)
3. [Feature catalogue](#3-feature-catalogue)
4. [System architecture](#4-system-architecture)
5. [Repository structure](#5-repository-structure)
6. [Frontend structure](#6-frontend-structure)
7. [Backend structure](#7-backend-structure)
8. [Data model](#8-data-model)
9. [API surface](#9-api-surface)
10. [Design system](#10-design-system)
11. [Local setup and commands](#11-local-setup-and-commands)
12. [Seed data](#12-seed-data)
13. [Changelog](#13-changelog)
14. [Known gaps and limitations](#14-known-gaps-and-limitations)
15. [Proposed roadmap](#15-proposed-roadmap)
16. [Documentation index and sources](#16-documentation-index-and-sources)

## 1. Product overview

Colleris is a personal project workspace with a professional directory and group collaboration layer. It separates private work from public collaboration:

- **Main (`/`)** is the private workspace: personal projects, tasks, derived progress, completion, and reopen.
- **Others (`/others`)** is the public directory and collaboration space: search, profiles, connections, groups, invitations, shared group projects, assignments, reminders, and notifications.

A user can track personal work, find other users by public handle or temporary profile code, connect with them, join supervised or peer-run groups, share group projects, assign work with permission-aware handoffs, send reminders, and receive an in-app notification feed.

Guests can search the public directory and view profiles that allow it. Every write action requires a Sanctum session. Roles and permissions are always enforced by the server.

## 2. Goals

The repository does not contain a separate formal goals document. The goals below are inferred from the product summary, the two application READMEs, `AGENTS.md`, the architecture, and the behavior implemented in the code.

### 2.1 Vision

Give an individual a calm, reliable place to run their own projects, while making it easy to discover trusted collaborators, form groups, and hand off work without losing track of who is responsible or what was agreed.

### 2.2 Primary goals

1. **Personal project clarity** — keep projects, tasks, status, due labels, and progress in one workspace.
2. **Truthful progress** — derive progress from completed tasks rather than trusting manual percentages.
3. **Professional discoverability** — let users find each other by handle or temporary profile code, with visibility controls.
4. **Low-friction collaboration** — connections, join codes, invitations, and groups should get a team working without heavy setup.
5. **Permission-aware handoffs** — assignments must respect the recipient's stated preference (`allow`, `request`, `decline`) and never silently create work.
6. **Accountability** — reminders, notifications, completion votes, and admin audit entries make collaboration state visible.
7. **Server-authoritative security** — Sanctum tokens, server-side role checks, hashed passwords, and no privilege-escalation endpoints.
8. **Consistent visual language** — a semantic token system, eight presets, dark/light themes, and accessible status communication.
9. **Local-first developer experience** — a predictable Laragon/Windows setup with a Vite proxy and an idempotent development seeder.
10. **Documentation as part of the product** — keep the canonical reference, READMEs, and agent notes aligned with the code.

### 2.3 Product principles

- **Two spaces, one identity.** Private work lives under Main; collaboration lives under Others.
- **Tasks are the source of truth.** When tasks exist, progress is `floor(completed / total * 100)`.
- **Completion is explicit.** Reaching 100% does not auto-complete a project; a user must confirm completion.
- **The server owns trust.** Frontend role flags and guards are convenience only.
- **No silent assignment.** A recipient's `project_assignment` permission decides whether work is immediate, pending, or declined. The one exception is a group member explicitly claiming a project for themselves, which is immediate.
- **Status is never color alone.** Badges pair color with an icon and text label.
- **Sessions stay on the device.** Account switching only uses tokens already authorized on that browser.
- **Guest access is read-only.** Guests may search and view allowed profiles; collaboration actions require login.

### 2.4 Non-goals and not-yet-implemented areas

- No visitor analytics or tracking; admin visitor figures are labelled mock.
- No real-time/WebSocket updates; state refreshes through API calls and a local group-changed event.
- No file uploads. The `guide_upload` and `feedback` permissions exist in the UI and database but no feature consumes them.
- No sent-reminder listing.
- No connection removal endpoint.
- No external identity provider (Google, GitHub, etc.).
- No native mobile application; the web shell is responsive.
- No production deployment configuration documented in this repository.
- Completion votes are not transactional and can stall if all approvals arrive before tasks finish.

### 2.5 Audiences and core scenarios

| Audience | Main scenarios |
| --- | --- |
| Individual contributor | Create personal projects, break them into tasks, track progress, complete and reopen work |
| Collaborator | Search the directory, connect, join a group, share tasks, vote on completion |
| Supervisor | Create a supervised group, invite or add members, assign work, complete projects directly |
| Team member | Accept invitations, manage assigned tasks, send reminders, respond to assignments |
| Administrator | Inspect aggregate counts, users, logs, collaboration activity, and server status |

## 3. Feature catalogue

### 3.1 Authentication and accounts

- Public registration and login, returning `{ token, user }` with a Sanctum personal access token.
- Passwords hashed with `Password::defaults()`; tokens are per-session and revoked on logout.
- Registration and login create the profile and permission rows if missing.
- Failed logins are recorded as `warn` entries in `admin_logs` without storing the password.
- `POST /api/add-account` creates another user account while the current session stays active. It does not switch accounts.
- Account switching only moves between sessions already authorized on the device (`pb_accounts` + `pb_active_account`).
- The old `/switch-account` endpoint was deliberately removed as a privilege-escalation risk.
- Profile updates cover display name, visibility, and the three permissions.
- Profile codes are temporary search codes generated for 1, 24, or 168 hours.
- Theme mode and preset are persisted server-side for authenticated users.

### 3.2 Profiles, handles, and visibility

Each user has one profile row. A handle is generated on first use from the first two letters of the name plus the zero-padded user id, for example `RN-1042`. Seed users have hand-written handles.

Profile fields include `handle`, `initials`, `profile_code`, `profile_code_expires_at`, `visibility`, and a denormalized `connections_count`.

Visibility controls whether the last five projects are returned when a profile is viewed:

| Visibility | Project visibility |
| --- | --- |
| `private` | No projects |
| `connections` | Projects only for a connected viewer |
| `supervisor` | Projects only for a viewer who supervises a group containing that user |
| `everyone` | Projects for any viewer, including guests |

### 3.3 Directory and connections

- Public directory search requires `mode=userId` or `mode=profileCode` and a non-empty `q`. Profile-code search normalizes spaces/hyphens, prioritizes exact matches, and only returns active codes.
- Search returns at most 20 rows with id, name, initials, user id, connection count, and visibility.
- Public profile view is visibility-aware and server-filtered.
- Connections are stored as two symmetric rows, one in each direction, and both profile counts are incremented.
- A user cannot connect with themselves.
- Duplicate connection currently returns HTTP 200 with `Already connected` rather than 409.
- There is no connection-removal endpoint.

### 3.4 Personal projects

A project belongs to one user and has `title`, `status`, `progress`, `due`, and `tag`.

| Status | Label |
| --- | --- |
| `wait` | On-Wait |
| `progress` | In-Progress |
| `urgent` | Urgent |
| `completed` | Completed |

Progress rules:

- New projects start at `progress = 0`.
- Creating a project with `status=completed` is coerced to `wait`.
- Tasks are authoritative when they exist.
- Progress is `floor(completed tasks / total tasks * 100)`.
- Reaching 100% does not set `completed` automatically.
- Complete requires at least one task and every task completed.
- Reopen keeps task completion state and sets status to `progress` when progress is above 0, otherwise `wait`.
- `PATCH /projects/{project}/progress` remains for compatibility but ignores the submitted value and recalculates from tasks.
- Projects without tasks are legacy data and can retain stored progress.

### 3.5 Personal tasks

- Tasks live in `project_tasks` with `project_id` or `group_project_id`, a title, a completed flag, and a numeric position.
- Personal tasks support add, edit, delete, toggle complete, reorder, and fetch.
- Reorder sends the full ordered id list and is rejected with 422 unless it matches exactly the set of tasks for that project.
- Completion toggles recalculate the parent project.

### 3.6 Groups

A group belongs to an owner, has a name, a unique join code, and an optional supervisor.

| Mode | Backend marker | Label |
| --- | --- | --- |
| Supervised Projects | `has_supervisor = true` | Supervised Projects |
| Collaborating Team Projects | `has_supervisor = false` | Collaborating Team Projects |

- Group creation requires a name and `has_supervisor`.
- If a supervised group is created without `supervisor_id`, the creator becomes the supervisor.
- The owner and supervisor are added as members.
- The UI offers "All members" or "With supervisor (you)"; there is no supervisor picker.
- Join codes use the `XXXX-XX` uppercase-hex format and are unique.
- The database supports `join_code_expires_at`, but group creation does not set an expiry.
- Any authenticated user with a valid code can join; members cannot join twice.
- Any group member can invite another user.
- A user cannot invite themselves, an existing member, or someone with a pending invitation.
- An invitation is unique per group and invitee.
- Re-inviting after a decline reuses the row and sets it back to `pending`.
- Accepting adds the invitee as a member; declining leaves membership unchanged.
- Direct member add requires the requester to be a member.
- Collaborating groups reject direct add with 403 and require the invite flow.
- Supervised groups allow the owner or supervisor to add a member directly.
- The owner can never be removed by another member.
- The owner can remove any non-owner. In a supervised group, the supervisor can also remove non-owner members.
- The owner can remove the supervisor, but the current code does not clear `supervisor_id` or `has_supervisor`.
- An owner with other members cannot leave. An owner who is alone can leave, which deletes the group.
- A non-owner member can leave. If the supervisor leaves, supervision is cleared.

### 3.7 Group projects

- A group project is created when an assignment is approved. There is no separate create form.
- It has a title, status, derived progress, optional assigned member, and completion-vote state.
- The assigned member is stored in `assigner_user_id`, despite the name.
- API payloads include both `assigner` and deprecated `assignee` aliases.
- Project payloads include tasks, task counts, vote state, vote counts, and both aliases.

Assignment permissions:

- **Supervised group:** the owner or supervisor can assign to any member; other members can only assign to themselves. Self-assignment is approved immediately.
- **Collaborating group:** any member can assign to any member. Self-assignment is approved immediately.

Task permissions:

| Group mode | Add / edit / delete / reorder tasks | Toggle task complete |
| --- | --- | --- |
| Supervised | Owner or supervisor only | Any member |
| Collaborating | Assigned member or owner/supervisor (planned fix T1) | Any member |

Completion rules:

- **Supervised group:** only the owner or supervisor can complete or reopen. Completion requires all tasks done. The server notifies every other member with a `supervised_complete` notification and writes an admin audit entry. Reopening clears vote state and deletes votes.
- **Collaborating group:** there is no direct completion. A member starts a completion vote. All members must approve, and all tasks must be done before the project can be marked complete. Tasks stay editable while the vote is pending. A rejection cancels the vote. The initiator or group owner can cancel a pending vote. Reopening is available to any member and clears votes. Task CRUD on another member's assigned project requires manager role — this is a planned fix (see DEV_NOTES T1). Toggle-complete remains open to any member everywhere.
- **Vote start:** requires membership, a collaborating group, no existing pending vote, a non-completed project, and at least one task. The initiator's vote is automatically approved. Every member gets a row in `group_project_completion_votes`; other members get a `completion_vote_requested` notification.
- **Vote cast:** each member can approve or reject with an optional reason. Rejection sets `vote_status` back to `none`, leaves the rejected vote rows in place, and notifies all members. Approval triggers a unanimity check. If every member has approved and every task is complete, the project is completed, votes are deleted, and all members get `completion_vote_approved`. If tasks remain, the server returns 422 and leaves the vote pending.
- **Known finalisation gap (resolved 2026-11-12):** if everyone approves before all tasks are done, the server returns 422 and leaves the vote pending. `ProjectTaskController::toggleComplete()` now calls `GroupProjectVoteService::maybeFinalize()`, which auto-completes the project when the last task is finished — no manual "Finalize" button needed in that case. The explicit `/group-projects/{id}/finalize-vote` endpoint remains for callers that want to force it early.

Vote states:

- `vote_status`: `none` or `pending`.
- Individual votes: `pending`, `approved`, or `rejected`.

### 3.8 Assignments

Assignments are permission-aware handoffs. The recipient's `project_assignment` permission decides the result:

| Recipient permission | Assignment status | Effect |
| --- | --- | --- |
| `allow` | `approved` | Project is created immediately |
| `request` | `pending` | Recipient is notified and can approve or decline |
| `decline` | `declined` | Requester is notified; no project is created |

- An assignment can target a group or no group.
- A group assignment creates a `group_projects` row and stores the recipient in `assigner_user_id`.
- A personal assignment creates a `projects` row owned by the recipient.
- Group assignment checks: requester must be a member; recipient must be a member; supervised groups allow the owner or supervisor to assign to anyone and other members to self-assign; collaborating groups allow any member.
- Group self-assignment is always approved and creates the group project immediately, even with a `request` or `decline` permission. It does not notify the member. Personal self-assignment remains rejected.
- Only the recipient can respond to a pending assignment.
- Only pending assignments can be approved, declined, or cancelled.
- The recipient can mark an assignment read.

### 3.9 Reminders

- A reminder can be sent to a connection or to a member the sender supervises.
- The message is required.
- The reminder is stored and a linked `reminder` notification is created.
- Only the recipient can list received reminders or mark one read.
- There is no sent-reminder listing.
- The optional `group_id` is existence-checked but does not verify that the recipient belongs to that group.

### 3.10 Notifications

The notification feed returns the newest 60 rows plus an unread count. A notification has a type, actor, JSON payload, read flag, and timestamp.

Notification types written by the backend:

- `group_invite`
- `assignment`
- `reminder`
- `group_activity`
- `supervised_complete`
- `completion_vote_requested`
- `completion_vote_rejected`
- `completion_vote_approved`
- `supervisor_task_override`

The UI has inline actions for group invitations, pending assignments, and unread reminders. Other notification types render as feed entries only. The UI also knows a `connection` label, but no current backend path writes that type.

### 3.11 Settings

The Settings page (`/settings`) contains:

- **Profile:** display name and initials-derived identity.
- **Profile Code:** generate a temporary search code for 1, 24, or 168 hours.
- **Theme:** dark/light mode for everyone; account presets persisted server-side.
- **Visibility:** `private`, `connections`, `supervisor`, or `everyone`.
- **Permissions:** Allow / Request / Decline for `project_assignment`, `guide_upload`, and `feedback`.
- **Account:** log in, register, add account, switch between device sessions, and log out.

Only `project_assignment` is wired into the current assignment flow. `guide_upload` and `feedback` are stored and editable but not consumed by any feature.

### 3.12 Admin

The admin area is available at `/admin` and guarded by `RequireAdmin` in the frontend. Every admin API route also requires Sanctum and `EnsureUserIsAdmin`.

Admin capabilities:

- Aggregate counts: users, admins, projects, in-progress projects, groups, connections, pending assignments, pending invitations, and reminders.
- User directory rows including email, role, visibility, connection count, project count, and creation time.
- A server-persisted log with create, list (latest 200), and clear operations.
- A live status payload with a DB ping, API health path, auth method, Laravel version, PHP version, and environment.
- A merged recent feed of group invitations, assignments, and reminders.
- A device-cache panel that lists browser `pb_*` keys and can clear them. Clearing forgets device sessions and resets theme preferences; it does not delete server data.

Admin User Stats visitor figures are mock and labelled. No analytics or visitor tracking is implemented.

### 3.13 Responsive shell and navigation

`AppShell` renders the desktop sidebar, mobile bottom navigation, page outlet, and notification bell. Both navigation surfaces share `frontend/src/components/layout/navItems.jsx`.

| Path | Page | Guard |
| --- | --- | --- |
| `/` | `MainPage` | None; guests see a lock/prompt |
| `/others` | `OthersPage` | None; public search allowed |
| `/settings` | `SettingsPage` | None; account actions require auth |
| `/admin` | `AdminPage` | `RequireAdmin` UI guard plus server middleware |

The destinations are Main, Others, Settings, and Admin. Admin is filtered out for non-admins in both navigation components.

### 3.14 Guest access

- Guests can search the public directory and view visibility-permitted profiles.
- Guests cannot create projects, connect, join groups, assign work, send reminders, or manage settings.
- Guests are locked to the `default` theme preset; custom presets require an account.
- Guest attempts to use protected surfaces show a login prompt rather than making unauthorized writes.

### 3.15 Developer and local-only tooling

- `GET /api/health` returns `{status: "ok", app: "Colleris"}`.
- A local-only database board is registered under `/db` when `app()->isLocal()`:
  - `GET /db`
  - `GET /db/{table}`
  - `GET /db/admin/overview`
  - `GET /db/admin/users`
  - `GET /db/admin/logs`
  - `GET /db/admin/status`
- `LogRequests` middleware records request activity without logging bodies, passwords, or tokens.
- The Vite dev server proxies `/api/*` to the Laravel dev server at `http://127.0.0.1:8000`.
- Token generation and validation scripts support the three-layer design system.

## 4. System architecture

### 4.1 High-level stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18.3, React Router 6, Vite 8, Tailwind CSS 3.4, PostCSS, Autoprefixer |
| Backend | PHP 8.3, Laravel 13.17, Laravel Sanctum 4, Laravel Tinker |
| Database | MySQL 8, `utf8mb4`, database `colleris_db` |
| Styling | Semantic CSS variables generated from W3C DTCG tokens, mapped through Tailwind |
| Fonts | Inter for UI, JetBrains Mono for technical text, Fredoka for the cotton-candy preset |
| Local server | Laragon Apache vhost `colleris.test`, or `php artisan serve` for Vite proxying |

### 4.2 Request flow

```text
React page/component
    -> hook or context (useProjects, useConnections, AuthContext, ThemeContext,
       NotificationsContext, useAdmin)
    -> src/api/client.js
    -> Laravel route in routes/api.php
    -> controller
    -> Eloquent model / AssignmentService
    -> MySQL colleris_db
```

Components do not call `fetch` or the API directly. `frontend/src/api/client.js` is the one place that attaches the active device session token.

### 4.3 Authentication boundary

- Login, registration, and add-account return `{ token, user }`.
- The frontend stores the token in the device account list and sends `Authorization: Bearer <token>`.
- The server owns roles. `user.role` is `user` or `admin`.
- The frontend `RequireAdmin` guard is a UI convenience; admin endpoints re-check the role server-side.
- Logout revokes the current server token and clears the local token for that account.
- There is no endpoint that mints a token for an arbitrary account.

### 4.4 State boundaries

| Owner | Responsibility |
| --- | --- |
| `AuthContext` | Current user, device account list, login/register/logout, add account, profile updates, permissions, profile code |
| `ThemeContext` | Theme mode, preset, local persistence, server sync, guest lock |
| `NotificationsContext` | Bell feed, unread count, reminders, assignment lists, invite/assignment/reminder actions |
| `useProjects` | Personal projects and tasks |
| `useConnections` | Connections, search, groups, invitations, group projects, group tasks, votes, assignments |
| `useAdmin` | Admin overview, users, logs, status, collaboration |
| `useLocalStorage` | JSON-serialized local state for theme and device accounts |

`NotificationsProvider` sits inside `AppShell`, below `AuthProvider` and `ThemeProvider`. It subscribes to `AuthContext`, reloads when the active user changes, refreshes on focus/visibility, and polls every 45 seconds.

### 4.5 Error conventions

Most single records are wrapped in a named key, for example `{ "project": {...} }`. Lists use the plural key. Errors use `{ "message": "..." }`; validation errors add `{ "errors": { "field": ["..."] } }`.

| Code | Meaning |
| --- | --- |
| 200 | Success |
| 201 | Created |
| 401 | Missing or invalid token |
| 403 | Authenticated but not allowed |
| 404 | Record or route not found |
| 409 | Already a member or already invited |
| 422 | Validation failure or business-rule rejection |

Duplicate connections currently return 200, not 409.

## 5. Repository structure

```text
colleris/
  AGENTS.md                  Agent, environment, and convention notes
  FINAL_REPORT.md            Phase 2 V2 report (2026-09-21/22)
  .htaccess                  Root forwarder to backend/public
  assets/
    design-tokens.json       W3C DTCG token source
    design-tokens.css        Generated token stylesheet
  docs/
    PROJECT.md               Canonical technical reference (2026-11-02)
    COLLERIS.md              This consolidated product and engineering document
    brand-guidelines.md      Brand and token reference, v1.0
  frontend/
    src/
      api/client.js          Fetch wrapper and device-session token store
      components/            UI, layout, projects, others, settings, admin
      context/               Auth, Theme, Notifications
      hooks/                 useLocalStorage, useProjects, useConnections, useAdmin,
                             useProjectTasks
      pages/                 MainPage, OthersPage, SettingsPage, AdminPage
      tokens/tokens.css      Generated primitives, semantics, components, themes
      utils/                 actionStatus, events
      App.jsx, main.jsx, index.css
    package.json
    vite.config.js
    tailwind.config.js
  backend/
    app/
      Http/Controllers/Api/  API controllers
      Http/Controllers/      DevDbController
      Http/Middleware/       EnsureUserIsAdmin, LogRequests
      Models/                Eloquent models
      Services/              AssignmentService
    bootstrap/app.php
    database/migrations/
    database/seeders/DatabaseSeeder.php
    routes/api.php
    routes/web.php
    composer.json
  .opencode/
    skills/                  Design, writing, UI, and token tooling
```

Snapshot counts: 67 frontend source files, 29 backend application files, 20 migration files, and 64 API route definitions.

## 6. Frontend structure

### 6.1 Boot and providers

`frontend/src/main.jsx` mounts `AuthProvider` outside `ThemeProvider`. `App` renders `BrowserRouter` and the route tree. `AppShell` wraps every page and supplies `NotificationsProvider`, the sidebar, the bottom navigation, and the notification bell.

### 6.2 Routes

| Path | Page | Guard |
| --- | --- | --- |
| `/` | `MainPage` | None; guests see a lock/prompt |
| `/others` | `OthersPage` | None; public search allowed |
| `/settings` | `SettingsPage` | None; account actions require auth |
| `/admin` | `AdminPage` | `RequireAdmin` UI guard plus server middleware |

### 6.3 Hooks

| Hook | Owns | Notes |
| --- | --- | --- |
| `useLocalStorage` | Local state with JSON serialization | Used for theme and device accounts |
| `useProjects` | Personal projects, tasks, completion | Optimistic adds and updates; task mutations reconcile the full project |
| `useConnections` | Connections, search, groups, invitations, group tasks, votes, assignments | Reloads groups after mutations so collaborators see the same state |
| `useAdmin` | Admin overview, users, logs, status, collaboration | Swallows transient admin API failures |
| `useProjectTasks` | Older task hook | Present but not imported by the current UI |

### 6.4 Contexts

| Context | Responsibility |
| --- | --- |
| `AuthContext` | Login, register, logout, add account, switch account, profile updates, permissions, profile code |
| `ThemeContext` | Theme mode, preset, local persistence, server sync, guest lock |
| `NotificationsContext` | Notification feed, unread count, reminders, assignment lists, invite/assignment/reminder actions |

### 6.5 localStorage keys

| Key | Owner | Contents |
| --- | --- | --- |
| `pb_accounts` | `AuthContext` and `api/client.js` | Accounts and tokens authorized on this device |
| `pb_active_account` | `AuthContext` and `api/client.js` | Active account id |
| `pb_theme_mode` | `ThemeContext` | `dark` or `light` |
| `pb_theme_preset` | `ThemeContext` | Preset id |

No project, group, connection, notification, or admin data is stored in localStorage. The `pb_` prefix is legacy but intentionally retained.

### 6.6 API client

`frontend/src/api/client.js`:

- Reads the active token from `pb_accounts` and `pb_active_account`.
- Prefixes every request with `/api`.
- Sends JSON when a body exists.
- Attaches `Authorization: Bearer` when a token exists.
- Returns parsed JSON, including an empty body.
- Throws an error with `status` and `errors` for non-2xx responses.
- Logs method, path, status, and elapsed time in development only.
- Never logs request bodies, passwords, tokens, or response payloads.

### 6.7 Utility modules

- `frontend/src/utils/actionStatus.js` maps API failures to human-readable action states.
- `frontend/src/utils/events.js` broadcasts a group-changed event so the notification bell and group list stay in sync after invitation or assignment actions.

### 6.8 Component map

| Folder | Main pieces |
| --- | --- |
| `components/ui` | Button, Modal, ConfirmDialog, Field, Avatar, StatusBadge, StatusIcon, EmptyState, GuestLock, PageHeader |
| `components/layout` | AppShell, Sidebar, BottomNav, navItems, RequireAdmin, NotificationBell, NotificationPanel |
| `components/projects` | ProjectCard, ProjectFormModal, ProjectDetailsModal, TaskList, TaskItem, ProgressBar, StatGrid |
| `components/others` | SearchBar, UserResultCard, ProfileView, CreateGroupModal, JoinGroupModal, InviteMemberModal, AssignProjectModal, GroupCard, GroupDetailModal |
| `components/settings` | SettingShell, ProfileSection, ProfileCodeSection, ThemeSection, VisibilitySection, PermissionsSection, AccountSection, SwitchAccountModal, AuthModal |
| `components/admin` | AdminOverview, AdminData, AdminUserStats, AdminCollaboration, AdminWebStatus, AdminConsole |

### 6.9 UI state handling

The UI exposes loading, empty, error, and success states in the main task and group surfaces. `failure()` converts API errors into specific messages for invalid join codes, expired codes, already-connected, already-member, permission denied, and incomplete-project cases.

The project details modal disables Complete until tasks exist and all are done. The group details modal disables supervised Complete until tasks exist and all are done. Request Complete for collaborating groups requires only one task, because votes may start before the work is finished.

## 7. Backend structure

### 7.1 Route groups

- Public: health, register, login, directory search, and public profile view.
- `auth:sanctum`: account, projects, tasks, groups, assignments, reminders, notifications.
- `auth:sanctum` + `EnsureUserIsAdmin`: every `/api/admin/*` route.

Routes are declared in `backend/routes/api.php`. Local-only developer routes live in `backend/routes/web.php` and are registered only when `app()->isLocal()`.

### 7.2 Controllers

| Controller | Responsibility |
| --- | --- |
| `AuthController` | Register, login, logout, current user, add account, profile updates, profile codes, theme persistence |
| `ProjectController` | Personal project CRUD and compatibility progress endpoint |
| `ProjectTaskController` | Personal and group task CRUD, reorder, completion, reopen, supervised completion, completion votes |
| `ConnectionsController` | Public search, visibility-aware profiles, connection list and creation |
| `GroupController` | Group CRUD, join, invite, invitation response, direct add, remove, leave, group payload, legacy assignment alias |
| `AssignmentController` | List and create assignments, recipient response |
| `ReminderController` | Received reminders, send, mark read |
| `NotificationController` | Notification feed and read state |
| `AdminController` | Overview, users, logs, status, collaboration feed |
| `DevDbController` | Local-only database board |

### 7.3 Models

`User`, `Profile`, `UserPermission`, `Project`, `ProjectTask`, `Connection`, `Group`, `GroupInvitation`, `GroupProject`, `GroupProjectCompletionVote`, `Assignment`, `Reminder`, `UserNotification`, and `AdminLog`.

Models use Laravel 13 attribute declarations such as `#[Fillable([...])]` and `#[Hidden([...])]`.

### 7.4 Middleware and services

- `EnsureUserIsAdmin` protects every `/api/admin/*` route and returns 401/403 JSON.
- `LogRequests` records request activity without logging sensitive data.
- `AssignmentService` owns the permission-aware assignment rules and creates the resulting project or group project.
- `bootstrap/app.php` forces JSON errors for API requests and returns 401/404 JSON instead of web redirects.

### 7.5 Backend conventions

- Controllers live in `backend/app/Http/Controllers/Api/`.
- Validation uses Laravel validation and named JSON response keys.
- Ownership or membership is checked explicitly in controllers; frontend guards are never trusted.
- Seed data is idempotent and safe to re-run.
- The Colleris schema lives only in `colleris_db`. Never point migrations, seeders, or destructive commands at `laravel_db` or any unrelated local database.

## 8. Data model

The migration set defines 15 domain tables plus Sanctum's `personal_access_tokens` and the standard Laravel framework tables. The live schema previously reported 42 tables; that count was not re-verified and should not be read as the migration count.

### 8.1 Domain tables

| Table | Purpose | Key fields |
| --- | --- | --- |
| `users` | Accounts | `name`, `email`, `password`, `role`, `theme_mode`, `theme_preset` |
| `profiles` | Public identity | `user_id`, `handle`, `initials`, `profile_code`, `profile_code_expires_at`, `visibility`, `connections_count` |
| `user_permissions` | Handoff preferences | `project_assignment`, `guide_upload`, `feedback` |
| `projects` | Personal projects | `user_id`, `title`, `status`, `progress`, `due`, `tag` |
| `project_tasks` | Personal and shared tasks | `project_id`, `group_project_id`, `title`, `completed`, `position` |
| `connections` | Symmetric connections | `from_user_id`, `to_user_id` |
| `groups` | Collaboration groups | `owner_id`, `name`, `has_supervisor`, `supervisor_id`, `join_code`, `join_code_expires_at` |
| `group_members` | Group membership | `group_id`, `user_id` |
| `group_projects` | Shared projects | `group_id`, `assigner_user_id`, `title`, `status`, `progress`, `vote_status`, `vote_initiator_id` |
| `group_project_completion_votes` | Per-member completion votes | `group_project_id`, `user_id`, `vote`, `reason` |
| `group_invitations` | Group invitations | `group_id`, `inviter_id`, `invitee_id`, `status` |
| `assignments` | Permission-aware handoffs | `group_id`, `requester_id`, `recipient_id`, `title`, `status`, `rejected_reason`, `read_at` |
| `reminders` | Reminders | `sender_id`, `recipient_id`, `group_id`, `message`, `read_at` |
| `user_notifications` | Notification feed | `user_id`, `type`, `actor_id`, `payload`, `read_at` |
| `admin_logs` | Audit log | `type`, `message`, `detail`, `user_id` |

### 8.2 Relationship summary

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

### 8.3 Schema notes

- `project_tasks` does not enforce that exactly one parent column is set; the application sets one or the other.
- `connections` is unique on `(from_user_id, to_user_id)`; a pair is stored as two rows.
- `group_members` is unique on `(group_id, user_id)`.
- `group_project_completion_votes` is unique on `(group_project_id, user_id)`.
- `group_invitations` is unique on `(group_id, invitee_id)`.
- `group_projects.assigner_user_id` stores the assigned recipient despite the name. `assignee_user_id` remains accepted as a deprecated API alias.
- `group_projects` began with `assignee_user_id`; migration `2026_10_06_000000` renamed it and handles the foreign key idempotently.

## 9. API surface

Base path: `/api`. Authenticated routes require `Authorization: Bearer <token>`.

### 9.1 Public

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Health check |
| POST | `/register` | Create account and return token |
| POST | `/login` | Authenticate and return token |
| GET | `/users/search` | Directory search by `userId` or active, normalized `profileCode` |
| GET | `/users/{user}` | Visibility-aware public profile |

### 9.2 Account

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/me` | Current user payload |
| POST | `/logout` | Revoke current token |
| POST | `/add-account` | Create another account and return its token |
| PUT | `/profile` | Update name, visibility, permissions |
| POST | `/profile-code` | Generate a temporary profile code |
| PUT | `/theme` | Persist theme mode and preset |

### 9.3 Personal projects and tasks

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/projects` | Own projects with tasks |
| POST | `/projects` | Create project |
| GET | `/projects/{project}` | Show project |
| PUT | `/projects/{project}` | Update project |
| PATCH | `/projects/{project}/progress` | Compatibility endpoint; value ignored |
| DELETE | `/projects/{project}` | Delete project and tasks |
| GET | `/projects/{project}/tasks` | List tasks |
| POST | `/projects/{project}/tasks` | Add task |
| POST | `/projects/{project}/tasks/reorder` | Reorder exact task set |
| GET | `/tasks/{task}` | Show task |
| PATCH | `/tasks/{task}` | Update task |
| DELETE | `/tasks/{task}` | Delete task |
| PATCH | `/tasks/{task}/complete` | Toggle task completion |
| POST | `/projects/{project}/complete` | Complete project |
| POST | `/projects/{project}/reopen` | Reopen project |

### 9.4 Group projects, tasks, and votes

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/group-projects/{groupProject}/tasks` | List group tasks |
| POST | `/group-projects/{groupProject}/tasks` | Add group task; owner/supervisor in supervised groups, any member in collaborating groups |
| POST | `/group-projects/{groupProject}/tasks/reorder` | Reorder group tasks; same permission rule |
| POST | `/group-projects/{groupProject}/complete` | Supervised completion |
| POST | `/group-projects/{groupProject}/reopen` | Reopen project |
| POST | `/group-projects/{groupProject}/request-complete` | Start collaborating vote |
| POST | `/group-projects/{groupProject}/vote` | Approve or reject pending vote |
| GET | `/group-projects/{groupProject}/votes` | Vote detail |
| POST | `/group-projects/{groupProject}/cancel-vote` | Cancel pending vote |
| PATCH | `/group-projects/{groupProject}` | Edit assignment title/assignee; member in collaborating groups, owner/supervisor/current assignee in supervised groups |

### 9.5 Directory, connections, and groups

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/connections` | Connection ids |
| POST | `/connections/{user}` | Create symmetric connection |
| GET | `/groups` | Groups the current user belongs to |
| POST | `/groups` | Create group |
| GET | `/groups/{group}` | Group detail |
| POST | `/groups/join` | Join by join code |
| POST | `/groups/{group}/invite` | Invite user |
| GET | `/groups/{group}/invitations` | Group invitations |
| PATCH | `/groups/invitations/{invitation}` | Accept or decline invitation |
| POST | `/groups/{group}/members` | Direct add member |
| DELETE | `/groups/{group}/members/{user}` | Remove member |
| POST | `/groups/{group}/leave` | Leave group |
| POST | `/groups/{group}/projects` | Legacy assignment alias |

### 9.6 Assignments, reminders, and notifications

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/assignments` | Received and sent assignments |
| POST | `/assignments` | Create assignment |
| PATCH | `/assignments/{assignment}` | Respond or mark read |
| GET | `/reminders` | Received reminders |
| POST | `/reminders/{user}` | Send reminder |
| PATCH | `/reminders/{reminder}` | Mark reminder read |
| GET | `/notifications` | Notification feed and unread count |
| PATCH | `/notifications/{notification}` | Mark notification read |

### 9.7 Admin

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/overview` | Aggregate counts |
| GET | `/admin/users` | User directory rows |
| GET | `/admin/logs` | Latest 200 log entries |
| POST | `/admin/logs` | Write log entry |
| DELETE | `/admin/logs` | Clear logs |
| GET | `/admin/status` | Server status payload |
| GET | `/admin/collaboration` | Recent collaboration feed |

## 10. Design system

### 10.1 Three layers

1. **Primitive tokens** in `assets/design-tokens.json` hold raw values: neutral palette, semantic hues, type scale, spacing, radii, shadows, and durations.
2. **Semantic tokens** map those values to roles such as `--bg`, `--surface`, `--accent`, `--danger`, `--warn`, `--mint`, and `--status-*`.
3. **Component tokens** describe button, card, input, sidebar, and slider values.

`assets/design-tokens.json` is the source. `pnpm tokens:generate` writes `assets/design-tokens.css`; `pnpm tokens:copy` copies it to `frontend/src/tokens/tokens.css`; `pnpm tokens:sync` does both. `frontend/src/index.css` imports the token stylesheet and holds the composition layer. `tailwind.config.js` maps semantic variables to Tailwind names.

### 10.2 Themes and presets

`html[data-theme]` selects dark or light. `html[data-preset]` selects the hue set.

Preset ids:

- `default` (Amber — original Solar Gold, the default for all users)
- `blue`
- `cyan`
- `pink`
- `lavender`
- `mint`
- `cotton-candy`
- `nebula` (Nebula Purple — opt-in atmospheric preset: obsidian canvas, violet accents, `--hero-glow` ambient layer behind the Main header)

The default preset uses yellow `#edc025` for primary and active states. Core neutrals are warm near-black `#0b0b0a` and warm off-white `#f7f6f2`.

| Role | Default hue | Use |
| --- | --- | --- |
| Accent | Yellow `#edc025` | Primary actions, active navigation, progress, selection |
| Warn | Amber `#e8933c` | Attention and urgent states |
| Danger | Coral `#d85a50` | Destructive actions and errors only |
| Mint | `#5fbf97` | Success and completed |
| Cyan | `#4fb8cc` | Information and collaboration |
| Pink | `#e08a9e` | Personality and social accents |
| Purple | `#a58fd6` | AI and special states |

`cotton-candy` is the only dual-tone preset and uses Fredoka for display type. Preview colors live in `ThemeContext.jsx`; they are not derived from the danger color. Guests are locked to the `default` preset; custom presets require an account and are persisted through `PUT /api/theme`.

### 10.3 Typography and status

Inter is the display and body face. JetBrains Mono is used for technical labels, ids, counts, and metadata. Fredoka appears only in the cotton-candy preset.

Status uses four tokens and matching icons:

| Status | Label |
| --- | --- |
| `wait` | On-Wait |
| `progress` | In-Progress |
| `urgent` | Urgent |
| `completed` | Completed |

Status is never communicated by color alone. `StatusBadge` pairs color with an icon and text label. `StatusIcon` supplies the SVG shapes and progress spinner.

### 10.4 Visual direction

The interface targets a modern productivity SaaS feel with warm neutrals, flat surfaces, compact density, and restrained shadows. Transitions use primitive durations in the 150 to 200 ms range. Buttons and controls use semantic tokens, not raw hex values. The main exceptions are the intentionally hardcoded preview swatches in `ThemeContext.jsx` and a cyan Tailwind palette in the collaborating-group badge in `GroupCard.jsx`.

## 11. Local setup and commands

### 11.1 URLs

| Purpose | URL |
| --- | --- |
| Application | `http://colleris.test` |
| API health | `http://colleris.test/api/health` |
| Vite dev server | `http://localhost:5173` |
| Vite API proxy target | `http://127.0.0.1:8000` |
| Local DB board | `http://colleris.test/db` (local only) |

The Vite proxy points at `127.0.0.1:8000`, not at `colleris.test`. The root `.htaccess` forwards `colleris.test` requests to `backend/public`.

### 11.2 Frontend commands

From `frontend/`:

```powershell
pnpm install
pnpm dev
pnpm build
pnpm preview
pnpm tokens:sync
pnpm validate:tokens
```

There is no `frontend/start.bat`.

### 11.3 Backend commands

From `backend/`:

```powershell
php artisan migrate
php artisan db:seed
php artisan serve --host=127.0.0.1 --port=8000
php artisan tinker
```

First run on a fresh checkout, from `backend/`:

```powershell
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
```

### 11.4 Local services

MySQL and Apache are started manually on this Windows machine.

- MySQL data directory: `C:\laragon\data\mysql-8` (not `C:\laragon\data\mysql\mysql-8`).
- Apache: `C:\laragon\bin\apache\httpd-2.4.54-win64-VS16`.
- Vhost: `C:\laragon\etc\apache2\sites-enabled\auto.colleris.test.conf`.
- Database: `colleris_db`, MySQL, `utf8mb4`, credentials `root` / empty password.

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

### 11.5 Tests and validation

- The frontend has no test, lint, or typecheck script. Token validation is `pnpm validate:all`.
- The backend has `composer test` and PHPUnit, but only Laravel's example stubs exist. The suite passed on 2026-11-02 (2 tests, 2 assertions).
- There is no project test suite covering the collaboration, vote, or admin flows.
- The 2026-11-02 performance pass ran PHP syntax checks, `composer test`, `php artisan migrate --force`, and direct query-count probes; it did not rebuild the frontend.
- The 2026-11-02 assignment/directory/group-edit pass rebuilt the frontend (80 modules, 281.06 kB JS / 50.40 kB CSS), passed `composer test`, linted every modified PHP file, and probed active-code search, recipient notification, and group-project edits.
- The 2026-11-02 group-task pass rebuilt the frontend (80 modules, 281.61 kB JS / 50.47 kB CSS), linted the changed models/controller, and probed progress recalculation plus role-gated task actions.
- The 2026-11-02 group self-assignment pass rebuilt the frontend (80 modules, 282.04 kB JS / 50.47 kB CSS), linted the changed service/controller, and probed self/other assignment statuses, notification suppression, supervised reassignment guards, and personal rejection. Token validation reported the same 23 pre-existing warnings, with no new violations.
- `FINAL_REPORT.md` records a successful production build from the phase 2 V2 work; the current build is dated 2026-11-02.

## 12. Seed data

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

## 13. Changelog

Dates are reconstructed from file timestamps and migration filenames. No Git log is available. The order inside a date is approximate.

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
- No application code changed as part of that documentation pass.
- MySQL was offline during the pass, so the live migration state was not re-checked.

### 2026-11-02: Consolidated documentation

- `docs/COLLERIS.md` added as the product and engineering overview covering goals, features, structures, data model, API surface, design system, setup, changelog, gaps, and proposed roadmap.
- No application code changed as part of this documentation pass.
- The document was derived from the current source tree, `docs/PROJECT.md`, the app READMEs, `AGENTS.md`, `FINAL_REPORT.md`, and the brand guidelines.

### 2026-11-02: Query performance pass

- `backend/app/Models/Project.php` and `GroupProject.php`: task statistics now reuse the eager-loaded `tasks` relation when present and otherwise use one aggregate query. Progress recalculation only writes when `progress` or `status` changes; complete/reopen reuse the same statistics path.
- `backend/app/Http/Controllers/Api/ProjectController.php`: `index` now fetches project cards once with selected columns and eager-loaded tasks, then recalculates progress from the loaded relation. `show`, `update`, and progress updates reuse the loaded task set instead of re-querying.
- `backend/app/Http/Controllers/Api/GroupController.php`: added shared relation graphs for group and invitation payloads. Groups now eager-load members, member profiles, supervisors, group projects, tasks, votes, assigners, and assigner profiles. Per-project membership counts and authorization checks use loaded data.
- `backend/app/Http/Controllers/Api/AdminController.php`: the user list selects only management fields, uses `withCount('projects')`, and limits profile columns.
- `backend/app/Http/Controllers/Api/ConnectionsController.php`: directory search selects only result-card fields and eager-loads `user:id,name`; profile detail uses `loadMissing('profile')`.
- `backend/app/Http/Controllers/Api/AssignmentController.php`, `ReminderController.php`, and `NotificationController.php`: feed payloads eager-load the profile data needed for initials, select only response fields, and avoid lazy profile queries.
- `backend/app/Http/Controllers/Api/ProjectTaskController.php`: authorization loads only required project/group fields; mutation responses select task and vote columns; parent payloads refresh once with the response fields instead of using repeated `fresh()->load()` calls.
- `backend/database/migrations/2026_11_02_000000_add_query_indexes_for_performance.php`: added indexes for project ownership, project-task ordering, profile handle/code lookup, assignment and reminder recipients, and notification ownership. The migration was applied to `colleris_db`.
- Validation completed with `php -l`, `composer test` (2 tests passed), and direct query-count probes. No frontend source changed; TanStack Query cache updates and feed pagination remain recommended follow-ups.
- Updated `docs/COLLERIS.md` and `docs/PROJECT.md` snapshot dates, data-model index notes, validation history, and changelog entries for this pass.

### 2026-11-02: Assignment, directory, and group-project edit fixes

- `backend/app/Http/Controllers/Api/ConnectionsController.php`: profile-code search now uppercases and strips spaces/hyphens from the query, compares normalized profile codes, returns exact matches first, filters out expired codes, and falls back to a null-safe user name.
- `backend/app/Services/AssignmentService.php`: auto-approved personal assignments now create a notification for the recipient in the same transaction as the assignment and derived project.
- `backend/app/Http/Controllers/Api/GroupController.php`: added `updateProject` for editing a group project's title and assignee. It authorizes members, restricts supervised groups to owner/supervisor/current assignee, rejects completed projects, validates that the new assignee belongs to the group, supports the legacy assignee column, notifies the new assignee, and exposes `assignerName`/`assigneeName` in group payloads.
- `backend/routes/api.php`: added `PATCH /group-projects/{groupProject}`.
- `frontend/src/context/NotificationsContext.jsx`: reloads notifications when the active user changes, clears guest state, refreshes on focus/visibility, and polls every 45 seconds.
- `frontend/src/components/layout/NotificationBell.jsx`: refreshes the feed when the bell opens.
- `frontend/src/components/others/AssignProjectModal.jsx`: excludes the current user from personal assignment recipients, defaults to the first other connection, and shows an empty state when none are available.
- `frontend/src/hooks/useConnections.js`: added `updateGroupProject` and reloads groups after the PATCH.
- `frontend/src/pages/OthersPage.jsx`: passes `onUpdateProject`, derives the open group from the latest group list, refreshes groups when a group is opened, and avoids stale modal data after mutations.
- `frontend/src/components/others/GroupDetailModal.jsx`: added an inline assignment editor (title, assignee, cancel/save), hides the assign action for unauthorized supervised members, and shows assignee names.
- Validation: frontend production build passed (80 modules, 281.06 kB JS / 50.40 kB CSS); `composer test` passed (2 tests); PHP lint passed on all modified backend files; direct probes confirmed normalized/active-only code search, recipient assignment notification plus received feed, and group-project title/assignee edits appearing in the group payload.

### 2026-11-02: Group task completion and permissions

- `backend/app/Models/Project.php` and `GroupProject.php`: fixed `taskStats()` aggregate aliases. `SUM(completed)` was aliased as `completed`, which collided with the `ProjectTask` boolean cast, so any sum above 1 was read as `1`. Progress could stall at 33% on a three-task project. The fix uses `total_count`/`completed_count`.
- `backend/app/Http/Controllers/Api/ProjectTaskController.php`: supervised-group task management is now owner/supervisor only. Members (including the assigned member) keep read access and can toggle completion; toggles recalculate derived progress. Collaborating groups keep member-wide task CRUD.
- `frontend/src/components/projects/TaskList.jsx` and `TaskItem.jsx`: added `canAdd`, `canToggle`, `canEdit`, and `canDelete` props. The add form, inline rename, move controls, and delete button disappear when the viewer lacks permission; completion stays available.
- `frontend/src/components/others/GroupDetailModal.jsx`: passes role-aware task permissions for supervised groups and keeps the collaborator experience unchanged.
- Validation: production build passed (80 modules, 281.61 kB JS / 50.47 kB CSS); `composer test` passed (2 tests); PHP lint passed; probes confirmed supervised progress `33 → 66 → 100`, successful project completion, member `403` on add/rename/delete, owner add/delete success, collaborating member task CRUD, and personal progress `0 → 66 → 100`.

### 2026-11-02: Group self-assignment

- `backend/app/Services/AssignmentService.php`: group members can self-assign. Self-assignment is always `approved`, ignores the `project_assignment` value, creates the group project immediately, and sends no self notification. Personal self-assignment stays rejected. Supervised groups now allow member self-assignment while keeping owner/supervisor-only assignment to other members.
- `backend/app/Http/Controllers/Api/GroupController.php`: supervised-group members who are the current assignee can edit the title but cannot change the assignee; only the owner/supervisor can reassign.
- `frontend/src/components/others/AssignProjectModal.jsx`: includes the current member as `(you)`, defaults to another recipient where allowed, limits supervised non-managers to self, and adds self-specific button/result copy.
- `frontend/src/components/others/GroupDetailModal.jsx`: shows the assign action to supervised members, disables reassignment for non-manager assignees, and updates the permission copy.
- Validation: production build passed (80 modules, 282.04 kB JS / 50.47 kB CSS); `composer test` passed (2 tests); PHP lint passed; probes confirmed personal self-assignment `422`, supervised/collaborating self-assignment `approved` with zero notifications, other-member requests still `pending` with a notification, member-to-other assignment `403`, and title-edit `200` versus reassign `403` for a self-assigned member.

## 14. Known gaps and limitations

These are current-code observations, not a promise that every item is a defect. Some are intentional tradeoffs; others need a decision.

### Behaviour and data

- **`assigner_user_id` stores the assignee.** Resolved — column renamed to `assigned_user_id` via migration `2026_11_11_000000`. Legacy aliases removed from runtime code on 2026-11-16. API response still exposes `assignerName`/`assigneeName` aliases for backward compat.
- **Removing a supervisor clears flags correctly.** `removeMember()` now detects when the removed user was the supervisor and sets `supervisor_id = null` and `has_supervisor = false` inside the transaction. Verified working as of 2026-11-16.
- **Collaborating groups are described as invite-only but still joinable by code.** Direct member add is blocked for collaborating groups, yet the join code is visible and `/groups/join` accepts it. The UI line "Invite-only · use Invite" is also shown without an Invite button in collaborating group details.
- **Supervised groups render two Invite buttons.** `GroupDetailModal` renders one in the mode ternary and another in the supervised-only block.
- **Collaborating group task CRUD is member-wide.** Any member can add/edit/delete/reorder tasks on any project in the group, including those assigned to other members — this is intentional by current design but will be scoped per-assignee in a planned fix (DEV_NOTES T1). Toggle-complete remains open to all members everywhere.
- **Vote finalisation can stall.** If every member approves before all tasks are complete, the server returns 422 and keeps the vote pending. The UI then shows "You approved" for every member and hides the Approve button. There is no finalise endpoint and no automatic re-check after the last task is completed. Rejecting or cancelling and restarting is the current workaround.
- **Duplicate connection returns 200.** The API returns `Already connected` with a 200 status. `FINAL_REPORT.md` describes a 409. The frontend handles the message, so this is mostly a documentation mismatch in the historical report.
- **Group list reads write progress.** `GroupController::index` and `show` recalculate and save task-backed progress while serving a GET request. It keeps the response fresh, but reads are not side-effect free.
- **Admin connection totals correct.** Overview divides `sum(connections_count) / 2` to account for symmetric pairs. Verified as of 2026-11-16.
- **Notification labels are incomplete.** The UI maps only five labels. `supervised_complete`, the vote types, and `supervisor_task_override` render as raw type strings. Those types also have no inline actions. The mapped `connection` type has no current writer, so it is legacy. Cancelling a vote writes `completion_vote_rejected`, so the feed reports a cancellation as a rejection.
- **Reminder group ids are only existence-checked.** `ReminderController::store` accepts any valid `group_id` without checking that the recipient belongs to that group.
- **Group creation does not set join-code expiry.** The column and active-code check exist, but the create path leaves the expiry null, so seeded and newly created codes do not expire.
- **Zero-task legacy projects can retain progress.** New projects start at 0, but a seeded completed project with no tasks can keep its 100% display until it is reopened or recalculated. Task-backed projects are consistent.

### Dead or transitional frontend code

- `frontend/src/hooks/useProjectTasks.js` exists but is not imported by the current pages.
- `useProjects.updateProgress` is still returned for compatibility but no current UI should call it.
- `useConnections.fetchGroupVotes` exists but the group UI uses the votes embedded in the group payload.

### Frontend code drift

- `GroupCard.jsx` uses a hardcoded Tailwind cyan palette for the collaborating badge instead of the semantic token set.
- `ProjectFormModal` still sends `progress` on create and shows a status selector, even though the server ignores progress and controls completion through tasks.

### Documentation drift

- `FINAL_REPORT.md` is a phase 2 V2 snapshot. It does not cover the October group-mode and vote changes.
- `FINAL_REPORT.md` describes duplicate connections as 409. The current API returns 200.
- `FINAL_REPORT.md` says a legacy `ProjectProgress` file was kept. It is not in the current tree.
- No current automated test suite validates the vote flow, group reorder, assigner rename, or admin UI.

## 15. Proposed roadmap

The following items are proposed next steps, not committed features. They are ordered by likely impact on correctness and maintainability.

### 15.1 Correctness and data integrity

1. **Fix completion-vote finalisation.** Add a finalise or auto-recheck path so a unanimous vote completes when the last task is finished, rather than stalling with no Approve button.
2. **Clear supervision on supervisor removal.** When a supervisor is removed, set `supervisor_id = null` and `has_supervisor = false`, and make owner/supervisor checks verify current membership.
3. **Set or intentionally disable join-code expiry.** Either set an expiry on creation or remove the misleading expiry column/check.
4. **Validate reminder group membership.** Reject a `group_id` when the recipient is not a member.
5. **Return 409 for duplicate connections.** Align the status code with the documented collaboration semantics, or update the documentation to match the intentional 200.

### 15.2 Collaboration UX

7. **Remove duplicate Invite buttons and align invite-only wording.** The supervised detail view renders two Invite actions, and collaborating groups describe themselves as invite-only while still accepting join codes.
8. **Complete the notification taxonomy.** Add labels and inline actions for supervised completion, vote events, and supervisor overrides. Distinguish cancellation from rejection.
9. **Add connection removal.** If the product wants connection lifecycle management, add a removal endpoint and update both profile counts.

### 15.3 Quality and maintainability

10. **Add a real test suite.** Cover auth, project/task progress, group permissions, assignments, reminders, notifications, votes, and admin authorization.
11. **Remove dead code.** Delete or wire `useProjectTasks`, `useProjects.updateProgress`, and `useConnections.fetchGroupVotes`.
12. **Normalize the assigner naming.** Prefer an unambiguous column such as `assigned_user_id`, with a compatibility migration and alias window.
13. **Replace remaining hardcoded colors.** Move `GroupCard` collaborating styling and preview swatches onto documented token exceptions.
14. **Make progress recalculation read-only or explicit.** Avoid writes during GET requests, or document them as intentional cache refresh.

### 15.4 Product expansion

15. **Wire the guide-upload and feedback permissions.** Either implement the corresponding features or remove the unused controls from Settings.
16. **Add real visitor analytics or remove mock figures.** The current Admin User Stats visitor numbers are labelled mock.
17. **Add sent-reminder history.** The current reminder API only exposes received reminders.
18. **Extend real-time collaboration updates.** The bell already polls every 45 seconds; move group lists and assignment feeds onto polling or WebSockets if collaboration volume grows.
19. **Document deployment and production hardening.** Add environment, backup, queue, and security guidance before production use.

## 16. Documentation index and sources

### Documentation index

| Document | Purpose |
| --- | --- |
| `docs/COLLERIS.md` | This consolidated product, feature, structure, and planning overview |
| `docs/PROJECT.md` | Canonical technical reference, full schema/API detail, and known gaps |
| `docs/brand-guidelines.md` | Brand voice, palette, typography, logo, and token contract |
| `AGENTS.md` | Local environment, commands, conventions, and agent notes |
| `FINAL_REPORT.md` | Historical phase 2 V2 build report |
| `frontend/README.md` | Frontend app-level guide |
| `backend/README.md` | Backend API and schema guide |

### Sources used for this document

- `docs/PROJECT.md`
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
