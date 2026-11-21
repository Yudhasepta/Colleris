# Colleris — Backend (Laravel 13 API)

The Colleris API is available at `http://colleris.test` through the root `.htaccess` → `backend/public`, or at `http://127.0.0.1:8000` via `php artisan serve` for Vite development. MySQL `colleris_db` runs behind it; see `../AGENTS.md` for the scope rule (never target `laravel_db` or other databases) and local service setup.

## Stack

- Laravel 13, PHP 8.3, Sanctum personal-access tokens (Bearer), MySQL 8 (`utf8mb4`).
- Attribute-style models (`#[Fillable([...])]`, `#[Hidden([...])]`) per Laravel 13 conventions.
- JSON (401/404) error rendering configured in `bootstrap/app.php`.

## Local commands

```bash
php artisan migrate                 # apply pending migrations
php artisan db:seed                 # idempotent dev seed
php artisan migrate:fresh --seed    # local rebuild only; drops Colleris tables
php artisan serve --host=127.0.0.1 --port=8000
php artisan tinker                  # ad-hoc queries
```

`php artisan serve` is the standard dev target for the Vite proxy (`127.0.0.1:8000`). Apache serves `http://colleris.test` directly when running. Health check: `GET http://colleris.test/api/health` or `GET http://127.0.0.1:8000/api/health`.

## Seed data (dev only)

6 accounts, every password is `password`:

| Email | Role | Handle |
| --- | --- | --- |
| `reyhan@studio.com` | user | RN-1042 |
| `anita@studiodesign.com` | user (test/connection) | AT-2201 |
| `budi@studiodesign.com` | user | BS-0087 |
| `maya@freelance.io` | user | MK-5510 |
| `dinda@studiodesign.com` | user | DP-3390 |
| `admin@colleris.com` | admin | AD-0001 |

Also seeds: 7 personal projects (5 Reyhan, 2 Anita); four connection rows forming two symmetric pairs (Reyhan-Anita, Reyhan-Maya); two groups; task sets for four Reyhan projects and all three group projects; a pending group invitation; a pending assignment; a reminder with its notification; and three admin logs.

- **Design Studio**: supervised by Anita, join code `DS-7F4Q`, members Reyhan, Anita, Budi, Maya, and Dinda. Contains "Brand deck for pitch" (Budi) and "Icon set revisions" (Maya).
- **Freelance Pool**: collaborating, join code `FP-2B9M`, members Reyhan and Maya. Contains "Landing page copy" (Reyhan).
- **Dinda** is already a Design Studio member and also has a pending invitation to it, so accepting the invitation returns 409 and leaves it pending.
- `connections_count` values do not match the rows: Anita and Maya show 2, Budi and Dinda show 1, and the seeder does not recompute them.

Anita has an active profile code `X7K9-QP`; Maya `H2N4-RT`. Never surface these credentials in public UI.

## Auth model

- Register/login return `{ token, user }` (Bearer Sanctum token + full user payload).
- Passwords hashed with `Password::defaults()`; tokens are per-session personal access tokens. Logout revokes the current token.
- Roles: `user` (default) / `admin`. Admin endpoints are protected by the `EnsureUserIsAdmin` middleware (401/403 JSON).
- **No `/switch-account` endpoint exists** (deliberately removed): switching only happens between sessions stored on the same device. `POST /add-account` creates a new user account while authenticated and returns its token.

### User payload (shared by /me, login, register, add-account, profile updates)

```jsonc
{ id, name, initials, userId, handle, email, role, connections,
  visibility, theme_mode, theme_preset,
  profileCode,              // null when expired/none
  profileCodeExpiresAt,     // ms timestamp
  permissions: { projectAssignment, guideUpload, feedback } } // allow|request|decline
```

## Routes (`routes/api.php`)

Public:

- `GET /health` — `{status, app}`.
- `POST /register` — `{name, email, password, password_confirmation}`.
- `POST /login` — `{email, password}`.

Authenticated (`auth:sanctum`):

- Account: `GET /me`, `POST /logout`, `POST /add-account`, `PUT /profile` (`name`/`visibility`/`permissions.{project_assignment,guide_upload,feedback}`), `POST /profile-code` (`hours`: 1|24|168), `PUT /theme` (`mode`: dark|light, `preset`: default|blue|cyan|pink|lavender|mint|cotton-candy).
- Projects: `GET/POST /projects`, `GET/PUT/DELETE /projects/{project}`, `PATCH /projects/{project}/progress` (compatibility endpoint; the value is ignored and progress recalculates from tasks). `POST /projects/{project}/complete` requires at least one task and all tasks done; `POST /projects/{project}/reopen` keeps task completion.
- Personal tasks: `GET|POST /projects/{project}/tasks`, `POST /projects/{project}/tasks/reorder`, `GET|PATCH|DELETE /tasks/{task}`, `PATCH /tasks/{task}/complete`.
- Group tasks: `GET|POST /group-projects/{groupProject}/tasks`, `POST /group-projects/{groupProject}/tasks/reorder`, `POST /group-projects/{groupProject}/complete`, `POST /group-projects/{groupProject}/reopen` (direct complete is supervised-only), `POST /group-projects/{groupProject}/request-complete`, `POST /group-projects/{groupProject}/vote` (`approve`, `reason?`), `GET /group-projects/{groupProject}/votes`, `POST /group-projects/{groupProject}/cancel-vote`. Collaborating groups complete through the unanimous vote flow.
- Directory: `GET /users/search?mode=userId|profileCode&q=`, `GET /users/{user}` (visibility-aware profile, projects included only when allowed) — both **public** (guests can search; privacy is enforced at profile view). `GET /connections` (`{connectionIds:[...]}`), `POST /connections/{user}` (symmetric rows + counted both sides; duplicate returns 200 with `Already connected`).
- Groups: `GET|POST /groups` (`{name, has_supervisor, supervisor_id?}`; when supervised, the creator becomes supervisor if `supervisor_id` is omitted), `GET /groups/{group}` (member-only), `POST /groups/join` (`{join_code}` — 422 invalid/expired, 409 already member), `POST /groups/{group}/invite` (`{user_id}` → pending invitation + notification), `GET /groups/{group}/invitations`, `PATCH /groups/invitations/{invitation}` (`accepted`|`declined` — only the invitee), `POST /groups/{group}/members` (`{user_id}` — supervised groups only; owner/supervisor), `DELETE /groups/{group}/members/{user}` (owner/supervisor; owner cannot be removed), `POST /groups/{group}/leave` (owner deletes group only when alone), `POST /groups/{group}/projects` (legacy alias — permission-aware via AssignmentService).
- Assignments: `POST /assignments` (`{group_id, recipient_id, title}`), `GET /assignments` (`{received, sent}`), `PATCH /assignments/{assignment}` (`approved`|`declined`|`cancelled` by the recipient, or `read`). Recipient's `project_assignment` permission is authoritative: `allow`→assigned immediately, `request`→pending, `decline`→rejected (never silently assigned).
- Reminders: `POST /reminders/{user}` (`{message, group_id?}` — connections or supervised members only), `GET /reminders`, `PATCH /reminders/{reminder}` (`read`). Each send persists a row and creates a linked notification.
- Notifications: `GET /notifications` (`{notifications, unreadCount}`), `PATCH /notifications/{notification}` (`read`). Types written by the backend: `group_invite`, `assignment`, `reminder`, `group_activity`, `supervised_complete`, `completion_vote_requested`, `completion_vote_rejected`, `completion_vote_approved`, `supervisor_task_override`.

Admin (all protected by `EnsureUserIsAdmin`):

- `GET /admin/overview` — aggregate counts (+ pendingAssignments/pendingInvitations/reminders).
- `GET /admin/users` — directory rows (id, name, initials, userId, email, role, visibility, connections, projects, createdAt).
- `GET /admin/collaboration` — merged recent feed of group invitations / assignments / reminders.
- `GET /admin/logs`, `POST /admin/logs` (`type` info|success|warn|error|event), `DELETE /admin/logs`.
- `GET /admin/status` — server-reported checks (DB ping, API, auth, Laravel/PHP version, env), `source: live`.

## Schema summary

- `users` (+`role`, `theme_mode`, `theme_preset`) → `profiles` (handle, initials, profile_code+, connections_count, visibility) → `user_permissions` (project_assignment/guide_upload/feedback).
- `projects` (user-scoped, status/progress/due/tag) → `project_tasks` (`project_id` set for personal tasks).
- `connections` (two directed rows per pair, unique per direction).
- `groups` (+ owner_id, has_supervisor, supervisor_id, join_code, join_code_expires_at) → `group_members`, `group_projects` (title, status, derived progress, assigner_user_id, vote_status, vote_initiator_id) → `project_tasks` (`group_project_id` set for shared tasks) and `group_project_completion_votes` (group_project_id/user_id/vote/reason, unique per member).
- `group_invitations` (inviter_id/invitee_id/status), `assignments` (requester_id/recipient_id/status/rejected_reason/read_at), `reminders` (sender_id/recipient_id/message/read_at), `user_notifications` (user_id/type/actor_id/payload/read_at), `admin_logs`.
- Sanctum `personal_access_tokens`.

`group_projects.assigner_user_id` stores the assigned recipient despite the name. `assignee_user_id` remains accepted as a deprecated API alias. `project_tasks` rows link through either `project_id` or `group_project_id`.

## Tests

`composer test` runs PHPUnit. Only Laravel's example stubs exist (`tests/Feature/ExampleTest.php`, `tests/Unit/ExampleTest.php`); there is no project test suite.

## Known gaps

See `../docs/PROJECT.md` for the full list. Notable backend gaps: completion votes can stall if all approvals arrive before tasks finish; removing a supervisor does not clear `supervisor_id`/`has_supervisor`; duplicate connections return 200; join codes are created without an expiry; and `connection` is a legacy notification label with no current writer.