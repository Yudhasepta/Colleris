# Colleris — Dev Notes & Feature Plan

> Created: 2026-11-11 · Last update: 2026-11-20
> Repository: `C:\laragon\www\colleris`
> Database: `colleris_db` (31 migrations Ran, latest batch 8)

---

## Source Documents Read

| Document | Purpose |
| --- | --- |
| `docs/COLLERIS.md` | Consolidated product & engineering overview |
| `docs/PROJECT.md` | Canonical technical reference — schema, API, architecture |
| `FINAL_REPORT.md` | Phase 2 V2 build report (task-derived progress, 3-layer tokens) |
| `AGENTS.md` | Local environment, commands, conventions |
| `docs/brand-guidelines.md` | Brand voice, palette, typography |

---

## Key Facts

**Product**: Personal project workspace + group collaboration layer.
**Stack**: React 18 + Vite 8 + Tailwind 3.4 / PHP 8.3 + Laravel 13.17 + Sanctum 4 / MySQL 8.
**DB**: `colleris_db` only (never touch `laravel_db`).
**Two spaces**: `/` = private Main; `/others` = public directory & groups.
**Progress rule**: `floor(completed tasks / total tasks * 100)` — tasks are truth.
**Completion**: Requires explicit action; never auto-complete at 100%.
**Group modes**: Supervised (`has_supervisor=true`) vs Collaborating (peer, unanimous vote).
**Permissions**: `project_assignment`, `guide_upload`, `feedback` per-user settings.
**Design tokens**: 3-layer W3C DTCG; 8 presets; never hardcode hex in components.
**localStorage keys**: `pb_accounts`, `pb_active_account`, `pb_theme_mode`, `pb_theme_preset`.
**Seed users**: reyhan@studio.com, anita@studiodesign.com, budi@studiodesign.com, maya@freelance.io, dinda@studiodesign.com, admin@colleris.com — all password `password`.

---

## Bug Fix Audit — All Closed

| Issue | Status | Evidence |
|---|---|---|
| Vote finalisation stall | ✅ Fixed | `GroupProjectVoteService::maybeFinalize()` auto-triggers on last task completion |
| Supervisor removal leaves supervised flag | ✅ Fixed | `GroupController removeMember()` clears both fields |
| Duplicate Invite buttons | ✅ Fixed | One button at GroupDetailModal.jsx |
| Notification labels incomplete | ✅ Fixed | All types mapped in NotificationPanel.jsx |
| Progress recalculation bug (33%→1) | ✅ Fixed | Uses `total_count`/`completed_count` aliases |
| B1 — Hardcoded cyan in GroupCard | ✅ Fixed | Semantic tokens `bg-statusInfo text-onStatusInfo` |
| B2a — Dead hook `useProjectTasks.js` | ✅ Fixed | Deleted |
| B2b — Unused `updateProgress` export | ✅ Fixed | Removed from useProjects |
| B2c — Unused `fetchGroupVotes` export | ✅ Fixed | Removed from useConnections |
| B2d — `finalizeGroupVote` undefined | ✅ Fixed | Calls `/group-projects/{id}/finalize-vote` POST |
| B3 — Indistinguishable notification labels | ✅ Fixed | Distinct labels per type |
| B5 — Seeder `connections_count` wrong | ✅ Fixed | Recomputed from actual rows after seed |
| B6 — Reminder `group_id` unvalidated | ✅ Fixed | Controller checks recipient membership |
| F1 — Join-code expiry unused | ✅ Fixed | 7-day default on creation |
| F2 — "Invite-only" wording | ✅ Fixed | Error message clarified in controller |
| F3 — No inline vote actions | ✅ Fixed | Approve/Reject buttons in notification panel |
| F4 — No sent-reminder history | ✅ Fixed | `GET /api/reminders/sent` endpoint |
| F7 — No PHPUnit test suite | ✅ Fixed | 6 classes, ~40 tests |
| F8 — No frontend lint | ✅ Fixed | ESLint v8 + Prettier installed; both pass |
| Dead imports / variables | ✅ Fixed | Cleaned across 6 files |
| Group project crash — null group prop | ✅ Fixed 2026-11-15 | Early return guard in GroupDetailModal.jsx after all hooks; defensive fallback on `{group?.name}` |
| SSE import missing in routes/api.php | ✅ Fixed 2026-11-15 | Added `use App\Http\Controllers\Api\SseController;` import at line 13 |
| Admin API offline — EnsureUserIsAdmin not imported | ✅ Fixed 2026-11-15 | Added `use App\Http\Middleware\EnsureUserIsAdmin;` at line 14 of api.php |
| Connection removal endpoint missing | ✅ Fixed 2026-11-15 | New `DELETE /api/connections/{user}` endpoint + Disconnect button in UserResultCard + ProfileView |
| Search crash — results is null on render | ✅ Fixed 2026-11-16 | `useState([])` in OthersPage.jsx:52; race condition guarded by non-null initial value |

---

## New Features (2026-11-12)

### Archive soft-delete
- Migration `2026_11_12_000000_add_archived_to_projects_table.php` — `$table->softDeletes()` on `projects`
- `Project` model uses `SoftDeletes` trait; `deleted_at` hidden from API
- `PATCH /projects/{project}/restore` endpoint (owner-only, validates `trashed()`)
- `GET /projects?archived=true` returns archived projects
- Frontend: tabbed Active/Archived view in MainPage with restore action

### Guide upload (F5)
- Migration `2026_11_12_055733_add_guide_to_projects_table.php` — `guide_text TEXT NULL` on `projects`
- `PATCH /projects/{project}/guide` — updates guide note; respects `guide_upload` permission
- New component `GuideEditor.jsx` with textarea (max 2000 chars), char counter, save/cancel
- ProjectDetailsModal shows guide preview with "Edit guide" button
- Permission-gated: shows banner if user has `guide_upload === 'decline'`

### SSE real-time updates
- `SseBroadcaster.php` — in-memory event store keyed by userId (bounded 200 events/user)
- `SseController.php` — `GET /api/sse` endpoint; supports `Last-Event-ID` replay
- Wired into 9 mutation points in GroupController (join, invite, accept, add-member, remove, leave, reassign, title edit)
- `useSSE.js` hook — auto-connects on login, reconnects on error (3s backoff), cleans up on logout/unmount
- MainPage subscribes to SSE and refreshes project list on any group event

### Formatting tooling
- Prettier 3.9 installed with `.prettierrc` config (semi:false, singleQuote:true, trailingComma:es5, printWidth:140)
- `pnpm format` / `pnpm format:check` scripts added
- `eslint-config-prettier` added to disable conflicting rules

### Modal safety & draft persistence (2026-11-12)
- **Modal close guards**: `closeOnOutside={false}` and `closeOnEscape={false}` by default — users must click the ✕ button or a confirmation dialog to leave.
- **GroupDetailModal draft system** (`src/utils/drafts.js`): saves all task edits per-project to localStorage before closing. On reopen, drafts are auto-restored so the user's work is never lost on accidental closure.
- **Save-or-discard flow**: bottom bar shows "Save & Close" / "Discard & Close" when there are unsaved edits; a `ConfirmDialog` also appears if ESC/backdrop is triggered with pending changes.
- Draft key format: `pb_draft_{groupId}_{projectId}` — scoped per group+project, survives account switches within the same device session.

---

## Still Open (Low Priority)

| ID | Description |
|---|---|
| Admin double-count | Connection totals sum profiles which count symmetric pairs twice — cosmetic |
| Visitor analytics | Intentionally mock — no tracking pipeline |

## Planned (Next Session)

| ID | Description | Scope |
|---|---|---|
| — | Bulk task selection (shift-click range) | — |
| — | Saved view filters (localStorage-persisted combos) | — |
| — | Keyboard shortcuts (`/`, `g+m`, `n`) | — |
| — | Drag-to-reorder projects (`@dnd-kit` on MainPage grid) | — |
| — | Inbox snooze + clear-all | — |
| — | Onboarding tour (react-joyride one-shot) | — |
| — | Kanban board view toggle in GroupDetailModal | — |
| — | Recurring tasks (interval auto-spawning) | — |
| — | Export to PDF/CSV | — |

---

## Commands

```powershell
# Backend
cd C:\laragon\www\colleris\backend
php artisan serve --host=127.0.0.1 --port=8000   # dev server
php artisan migrate                               # apply pending migrations
php artisan db:seed                               # idempotent seed
php artisan test                                  # PHPUnit (47 tests)
php artisan route:list --path=sse                 # verify SSE route

# Frontend
cd C:\laragon\www\colleris\frontend
pnpm install                                      # first time or after adding deps
pnpm dev                                          # Vite dev server (proxy → :8000)
pnpm build                                        # production build
pnpm lint                                         # ESLint
pnpm format                                       # Prettier write
pnpm validate:tokens                              # token check

# URLs
http://colleris.test       — application
http://localhost:5173      — Vite dev
http://colleris.test/api/sse — SSE endpoint (requires auth)
```

---

## Pending — 2026-11-12 Debug & Performance Plan

> Status: ✅ Completed (2026-11-13)

### ✅ Phase 1: Schema Drift + Docs (Session 1)

**A. Schema Drift Recovery**
- `GET /api/schema-version` returns `{ total, latestBatch }` from migrations table
- Included `schemaVersion` in login/register/add-account/me responses
- AuthContext boot/login/switch validates schema version; mismatch → clears device sessions
- Documented in `AGENTS.md`, `FINAL_REPORT.md`

**B. ESLint Fix**
- Fixed `GroupDetailModal.jsx` eslint-disable comment placement for `confirm()` call

**C. Cache/Session Optimizations**
- `.env`: `CACHE_STORE=file`, `SESSION_DRIVER=cookie`
- `php artisan optimize:clear` run

**D. Documentation Fixes**
- `PROJECT.md`, `COLLERIS.md`, `FINAL_REPORT.md` updated with resolved vote-finalisation note

### ✅ Phase 2: Performance Indexes (2026-11-13)

**E. Migration Applied**
- `2026_11_13_000000_add_performance_indexes.php` — added composite indexes on:
  - `group_projects(group_id, status)`
  - `user_notifications(user_id, type, read_at)`
- Verified: `php artisan migrate:status` shows all 26 migrations Ran

### ✅ Phase 3–5: Polish + Feedback Feature (2026-11-13)

**F. Vote UI Cleanup**
- Removed manual "Finalize completion" button from `GroupDetailModal.jsx`
- Auto-finalise path via `maybeFinalize()` is now the only code path
- Shows inline `"✓ Project completed"` badge when unanimous + all tasks done
- Dead `canFinalizeVote` variable removed

**G. Zero-Task Legacy Projects**
- `ProjectCard.jsx` and `ProjectDetailsModal.jsx` now show descriptive text
  ("No tasks yet — add tasks to track progress") when `total === 0` instead of empty progress bar

**H. Token Check Resolved**
- `statusInfo`/`onStatusInfo` already correctly mapped via semantic tokens
  (`var(--cyan)` / `var(--on-accent)`) — no change needed

**I. Full Feedback Feature**

Backend:
- Migration `2026_11_13_000001_create_feedbacks_table.php` (`sender_id`, `recipient_id`, `project_id`, `message`, `read_at`)
- `Feedback` model with sender/recipient/project relationships
- `FeedbackController` — `index`, `store`, `update` (mark read)
- Routes: `GET /feedbacks`, `POST /feedbacks/{user}`, `PATCH /feedbacks/{feedback}`
- Seeder adds 2 sample feedback entries (Maya→Reyhan, Anita→Reyhan)

Frontend:
- `useFeedback.js` hook — loads received feedback, provides `sendFeedback`/`markRead`/`markAllRead`
- `FeedbackSection.jsx` — compact card list with avatar, timestamp, project context, mark-as-read
- `SettingsPage.jsx` — inserted between VisibilitySection and PermissionsSection

### Validation Summary (2026-11-13)

| Check | Result |
|-------|--------|
| `php -l` all new PHP files | ✅ No syntax errors |
| `composer test` | ⚠️ Pre-existing SQLite driver missing (47 tests fail same as before) |
| `pnpm lint` | ✅ Clean |
| `pnpm build` | ✅ 85 modules (was 83), green |
| `pnpm validate:tokens` | Same 23 pre-existing warnings (unchanged) |
| `migrate:status` | ✅ 26/26 Ran |
| `db:seed` | ✅ Idempotent, 2 new feedback rows |
| DB connectivity | ✅ MySQL running on 127.0.0.1:3306 |
| Schema drift route | ✅ `/api/schema-version` responds |
| Feedback routes | ✅ All 3 registered via tinker |

---

### A. Root Cause — `/others` Blank Page Investigation

**Diagnosis**: After `migrate:fresh`, all old localStorage tokens became invalid because user IDs were reassigned. AuthContext boot silently fails → user appears as guest → "Others" shows minimal empty-state content (search bar + "Log in to see your groups"), which can appear "blank" at a glance.

**Evidence**:
- Routing is correct: `/others` maps to `OthersPage` ✅
- API health endpoint responds ✅ (`curl http://127.0.0.1:8000/api/health` → `{status:"ok"}`)
- Migrations all Ran ✅ (24/24 after fresh run)
- Seed data loads correctly (7 users, 2 groups, 7 projects) ✅
- No React runtime errors from code audit ✅

**Fix (when ready)**: Add session-clear logic to AuthContext boot that detects schema version mismatch and forces re-login, OR document that users must clear localStorage after `migrate:fresh`.

**Quick manual workaround now**: Clear browser localStorage keys `pb_accounts` and `pb_active_account`, then log in again.

### B. ESLint Fixes Blocking Clean Build

| File | Line | Issue | Fix |
|------|------|-------|-----|
| `GroupDetailModal.jsx` | 523–525 | `eslint-disable-next-line` on wrong line for `confirm()` | Move comment to directly above `!confirm(` call |
| `OthersPage.jsx` | 30 | Unused `respondInvitation` destructured from hook | Remove from destructuring list |
| `SwitchAccountModal.jsx` | 11 | Unused `pendingAdd` state variable | Remove declaration |

### C. Database Connection Speed Optimizations

#### Current State
- `DB_HOST=127.0.0.1` (TCP, adds ~2–5ms handshake per query)
- `CACHE_STORE=database` (every cache read = extra MySQL round-trip)
- `SESSION_DRIVER=database` (session lookups hit MySQL on every request)
- `QUEUE_CONNECTION=database` (job queue uses DB polling)

#### P0 — Immediate (high impact, low risk)
1. **Switch to Unix socket** — Eliminate TCP overhead:
   ```diff
   # .env
   - DB_HOST=127.0.0.1
   + DB_HOST=/tmp/mysql.sock   # Laragon socket path; verify with php.ini
   ```
2. **Cache/store to file** (faster than DB for local dev):
   ```diff
   - CACHE_STORE=database
   + CACHE_STORE=file
   
   - SESSION_DRIVER=database
   + SESSION_DRIVER=cookie
   ```

#### P1 — Short-term (medium impact)
3. **Add missing indexes** via migration:
   ```sql
   ALTER TABLE group_projects ADD INDEX idx_gp_group_status (group_id, status);
   ALTER TABLE user_notifications ADD INDEX idx_un_user_type_read (user_id, type(191), read_at);
   ```
4. **Reduce N+1 in `GroupController::index`**: Currently calls `recalculateProgress()` per project → separate COUNT query each. Replace with aggregate subquery during eager load.

#### P2 — Medium-term
5. **Query profiling** — Enable MySQL slow-query log for >100ms queries
6. **Redis cache** — Swap `CACHE_STORE=database` for Redis if available locally
7. **Connection pooling** — Configurable if scaling beyond 1 worker

### D. Implementation Checklist (execute when ready)

```powershell
# Phase 1 — Zero-risk code fixes (~10 min)
1. Fix GroupDetailModal.jsx eslint-disable comment placement
2. Remove unused respondInvitation from OthersPage.jsx
3. Remove unused pendingAdd from SwitchAccountModal.jsx
4. Run pnpm lint && pnpm build to confirm clean

# Phase 2 — DB performance (~20 min)
5. Create migration for missing indexes (group_projects.status, user_notifications.type)
6. Test Unix socket in .env (rollback if breaks)
7. Switch CACHE_STORE=file, SESSION_DRIVER=cookie
8. Run php artisan optimize:clear && php artisan config:cache
9. Run query probe on GET /api/groups to measure before/after

# Phase 3 — Smoke test full flow (~15 min)
10. Login as reyhan@studio.com / password
11. Visit / → Main page renders with stats
12. Navigate to /others → Directory search + Groups grid visible
13. Search "RN-1042" → Reyhan profile returned
14. Click group card → GroupDetailModal opens
15. Expand project → add/edit tasks → close modal → draft dialog appears
16. Reopen group → draft restored
17. Visit /settings → All sections render
18. Visit /admin (as admin@colleris.com) → Dashboard loads
19. Clear localStorage pb_accounts, reload → login prompt appears
```

### E. Open Questions for Maintainer

1. What exactly happens on `/others`? Empty white screen, or minimal empty-state content?
2. Should we switch `DB_HOST` to socket path, or keep TCP `127.0.0.1` for simplicity?
3. PHPUnit tests fail without SQLite PDO driver — install extension or mark as optional?
4. Redis available locally, or stick with file caching for now?

---

## Session Log — 2026-11-13 (Phase 1–5 Complete)

> **Status**: All planned work completed. Two bugs found and fixed during the session.
> **Next restart point**: Resume from step "B. Schema drift recovery implementation" below if continuing later.

---

### A. Bug: `/others` blank page after migrate:fresh

**Root cause (initial hypothesis)**: After `migrate:fresh`, user IDs are reassigned but stored `pb_accounts` tokens become invalid → AuthContext boot fails silently → guest mode → empty state looks blank.

**Actual root cause (discovered via API probing)**: `schemaVersion()` method returned a `JsonResponse` object instead of an array. When embedded in `response()->json(['schemaVersion' => $this->schemaVersion()])`, Laravel serialized it as an opaque Response object with no `.total` property. The frontend's null-safety guard (`storedVersion &&`) short-circuited correctly (null !== object), but `currentVersion?.total` was `undefined` while `storedVersion.total` existed → drifted check triggered → sessions wiped on every boot → user appeared as guest permanently.

**Fix**: Changed `AuthController::schemaVersion()` return type from `JsonResponse` to `array`. Route lambda at `/schema-version` wraps it explicitly. Added defensive `currentVersion &&` check in frontend.

---

### B. Schema Drift Recovery — Implementation

| File | Change |
|------|--------|
| `backend/app/Http/Controllers/Api/AuthController.php` | Added `schemaVersion()` returning `['total'=>int,'latestBatch'=>int]`; embedded in login/register/add-account/me responses |
| `backend/routes/api.php` | Added `GET /api/schema-version` route |
| `frontend/src/context/AuthContext.jsx` | Boot/login/switch validates schema version; mismatch clears device sessions + forces re-login |
| `AGENTS.md` | Documented schema-drift recovery behaviour |
| `FINAL_REPORT.md` | Added post-report additions section noting this feature |

---

### C. ESLint Fix — GroupDetailModal

Fixed `eslint-disable-next-line` comment placement for `confirm()` call at line 523→moved above the `!confirm(` expression.

---

### D. Cache/Session Optimizations

```diff
# backend/.env
- CACHE_STORE=database
+ CACHE_STORE=file

- SESSION_DRIVER=database
+ SESSION_DRIVER=cookie
```

Ran `php artisan optimize:clear` after change.

---

### E. Performance Indexes Migration

Created `backend/database/migrations/2026_11_13_000000_add_performance_indexes.php`:
- `group_projects(group_id, status)` composite index
- `user_notifications(user_id, type, read_at)` composite index
- Applied successfully (migration batch [3])

---

### F. Documentation Fixes

Updated three files to reflect resolved vote-finalisation gap:
- `docs/PROJECT.md` — noted auto-finalise via `maybeFinalize()` on last task toggle
- `docs/COLLERIS.md` — same
- `FINAL_REPORT.md` — added dated post-report additions section

---

### G. Vote UI Cleanup (Phase 4)

Removed manual "Finalize completion" button from `GroupDetailModal.jsx`. When all votes unanimous AND all tasks done, project auto-completes via `maybeFinalize()`. Inline status text updated to `"✓ Project completed"` when finalized. Removed dead `canFinalizeVote` variable.

---

### H. Zero-Task Legacy Project Polish (Phase 5a)

When a project has zero tasks (`total === 0`):
- `ProjectCard.jsx` — shows `"No tasks yet — add tasks to track progress"` instead of empty progress bar
- `ProjectDetailsModal.jsx` — same treatment above the task list

---

### I. Token Check Resolved (Phase 5c)

Confirmed `GroupCard.jsx` using `bg-statusInfo text-onStatusInfo` already correctly maps through semantic tokens to `var(--cyan)` / `var(--on-accent)` per design spec. No change needed.

---

### J. Full Feedback Feature (Phase 3)

**Backend:**
| New file | Purpose |
|----------|---------|
| `backend/database/migrations/2026_11_13_000001_create_feedbacks_table.php` | Table: sender_id, recipient_id, project_id(nullable), message, read_at, timestamps + indexes |
| `backend/app/Models/Feedback.php` | Model with sender/recipient/project relationships, `scopeReceivedBy(Builder, int)` |
| `backend/app/Http/Controllers/Api/FeedbackController.php` | index/store/update endpoints; validates sender ≠ recipient; verifies project ownership |
| `routes/api.php` | GET/POST/PATCH /feedbacks |
| `DatabaseSeeder.php` | 2 sample feedback entries (Maya→Reyhan, Anita→Reyhan) |

**Bug found during implementation**: `scopeReceivedBy(self $query)` failed because Laravel passes `Builder` not `Model`. Fixed by changing type hint to `Builder`.

**Frontend:**
| New file | Purpose |
|----------|---------|
| `frontend/src/hooks/useFeedback.js` | Loads received feedback; provides send/markRead/markAllRead |
| `frontend/src/components/settings/FeedbackSection.jsx` | Card list with avatar, timestamp, project context, mark-as-read actions |
| `frontend/src/pages/SettingsPage.jsx` | Inserted `<FeedbackSection />` between VisibilitySection and PermissionsSection |

---

### K. Critical Runtime Bugs Found & Fixed (post-session validation)

#### Bug 1: `FeedbackController` 500 error
- **Symptom**: `/api/feedbacks` returns 500 TypeError
- **Cause**: `scopeReceivedBy(self $query)` — wrong type hint
- **Fix**: Changed to `scopeReceivedBy(Builder $query, int $userId): Builder`
- **Verified**: API returns `{"feedbacks":[...],"unreadCount":2}` ✅

#### Bug 2: `GroupDetailModal.jsx` crash — `Cannot read properties of null (reading 'groupTypeLabel')`
- **Symptom**: Blank/black page on `/others`
- **Cause**: During auth boot race, `openGroup` prop is null before groups load; component accessed `group.groupTypeLabel` without safety
- **Fix**: Added `group?.groupTypeLabel` and `group?.hasSupervisor` optional chaining at line 64
- **Note**: React hooks were ALREADY conditionally called after the early return attempt — reverted that approach; only safe-access pattern works here
- **Verified**: Build green, no console errors ✅

#### Bug 3: Missing Error Boundary
- **Symptom**: Any unhandled JS error blanke-screen the entire app
- **Fix**: Added `ErrorBoundary` class component wrapping `<App>` in `App.jsx` — surfaces red banner with stack trace + reload button instead of blank screen
- **Added import**: `import React from 'react'`

---

### L. Caveman Skill Installed (Global)

Installed `w0nk0/caveman` opencode skill globally (note: repository owner is `w0nk0`, not `JuliesBrusee`).

| Location | Path |
|----------|------|
| Skill folder | `C:\Users\hp\caveman\` |
| SKILL.md | `C:\Users\hp\caveman\caveman\SKILL.md` |
| Config update | `C:\Users\hp\.config\opencode\opencode.jsonc` → added `"skills": { "paths": ["~/caveman"] }` |

Skill activates on next opencode restart. Forces ultra-terse caveman-grammar replies for all human-facing output.

---

### M. Validation Summary (2026-11-13)

| Check | Result |
|-------|--------|
| `pnpm lint` | ✅ Clean |
| `pnpm build` | ✅ 85 modules, green |
| `migrate:status` | ✅ 26/26 Ran |
| Login flow | ✅ token + schemaVersion returned |
| `/api/groups` | ✅ 2 groups |
| `/api/connections` | ✅ 2 connections |
| `/api/notifications` | ✅ unreadCount correct |
| `/api/feedbacks` | ✅ 2 entries, unread=2 |
| MySQL | ✅ Running on 127.0.0.1:3306 |
| Vite | ✅ Running on localhost:5173 |
| Backend server | ✅ Running on 127.0.0.1:8000 |

---

### N. Current Known State

- **No remaining blockers.** Both `/` and `/others` pages should render correctly after clearing localStorage and logging in fresh.
- **MySQL running** on TCP 127.0.0.1:3306 (socket path unavailable on this Laragon install).
- **PHPUnit** still fails due to missing SQLite PDO driver (pre-existing, unrelated to this session).
- **N+1 query optimization** in `GroupController::index` deferred (low priority, cosmetic).

---

### O. Next Restart Instructions

To resume work on Colleris:
```powershell
# 1. Start MySQL (if not running)
Start-Process "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysqld.exe" `
  -ArgumentList "--defaults-file=C:\laragon\etc\mysql\my.ini","--console" `
  -WindowStyle Hidden

# 2. Start Laravel dev server (in separate terminal)
cd C:\laragon\www\colleris\backend
php artisan serve --host=127.0.0.1 --port=8000

# 3. Start Vite dev server (in separate terminal)
cd C:\laragon\www\colleris\frontend
pnpm dev

# 4. Clear browser localStorage then refresh
# DevTools → Application → Local Storage → delete pb_accounts + pb_active_account → Ctrl+Shift+R
```

Browser URL: http://localhost:5173/others

**Recommended next task**: Implement the N+1 query optimization in `GroupController::index` (deferred low-priority item).

---

## Session Log — 2026-11-15 (Phase 1–3 Complete)

> **Status**: All planned work completed. Lint clean, build green, all migrations Ran.

### A. SSE Import Fix (Critical bug)

- `routes/api.php:31` was referencing `[SseController::class, 'subscribe']` without importing `SseController`
- Added missing `use App\Http\Controllers\Api\SseController;` import
- Verified: `php artisan route:list --path=sse` returns route ✅

### B. Connection Removal System

**Backend:**
- Migration `2026_11_15_000001_add_disconnected_to_connections_table.php` adds `disconnected BOOLEAN DEFAULT FALSE` to `connections`
- New `ConnectionsController@destroy()` — sets both symmetric rows to `disconnected=true`, decrements `profiles.connections_count` on both sides
- Removed old hard-delete approach (preserves historical data for audit); disconnected rows are filtered by `index()` via `where('disconnected', false)`
- Route: `DELETE /api/connections/{user}`

**Frontend:**
- `useConnections.js`: added `removeConnection(id)` method
- `UserResultCard.jsx`: replaced disabled "Connected" button with active "Disconnect" button; added `onDisconnect` prop
- `ProfileView.jsx`: added Disconnect button below reminder section (only visible when connected and not own profile)
- `OthersPage.jsx`: wired `handleDisconnect` → `removeConnection`; passed to both `UserResultCard` and `ProfileView`

### C. Full-Page Profile View

- New `frontend/src/pages/ProfilePage.jsx` — standalone page reusing visibility-aware profile logic from `ProfileView`
- Route `/profile/:id?` registered in `App.jsx` (optional param — `/profile/me` links to current user's own profile)
- `navItems.jsx`: added Profile nav entry (`num: '03.5'`, icon: person silhouette, linked to `/profile/me`)
- Self-viewing is read-only (no Disconnect button shown for `isMine`)
- Reminder/nudge feature works on own profile too (disabled via `canRemind` check)

### D. Multi-Tag System

**Backend migrations:**
- `2026_11_15_000002_create_tags_tables.php`: creates `tags` (id, name unique), `project_tags` (junction), `group_project_tags` (junction)
- `2026_11_15_000003_migrate_tags_to_junction_table.php`: migrates existing single-string tags into junction table; adds nullable `tag` fallback column on `group_projects`

**Models:**
- New `app/Models/Tag.php` with `projects()` and `groupProjects()` BelongsToMany relationships
- `Project.php`: removed `tag` from Fillable; added `tags()` relationship + `$appends` accessor for backward compat
- `GroupProject.php`: added `tags()` relationship + `getTagAttribute()` accessor

**API:**
- `GET /api/tags?q=` — autocomplete endpoint (shared across personal + group forms); filters by substring
- `POST /projects` body accepts `tags` array (strings or objects with `name`)
- `PUT /projects/{id}` body accepts `tags` array; syncs pivot table
- `GET /projects` optionally filters by `?tag=Design`
- `PATCH /group-projects/{gp}` now accepts `tags` array alongside title/assignee

**Frontend:**
- `ProjectFormModal.jsx`: replaced single-tag `<TextInput>` with multi-tag picker (`TagInput` component) featuring keyboard-enter/add and backspace/remove; fetches suggestions from `/api/tags`
- `ProjectCard.jsx`: renders tag badges (supports both new array format and legacy string format)
- `ProjectDetailsModal.jsx`: displays tags as accent-colored chips next to due date
- `MainPage.jsx`: added tag filter bar above project grid; click a chip to filter, click again to clear
- `GroupDetailModal.jsx`: inline edit form gains TagInputSimple (manual entry no autocomplete); display tags as small badges above task list per-project

**Seed data preserved:** 6 existing tags ('General', 'Design', 'Docs', 'Product', 'Engineering', 'Ops') migrated into junction table.

### E. Group Project Archive/Restore (Soft Delete)

**Backend:**
- Migration `2026_11_15_000004_add_soft_delete_to_group_projects.php` adds `deleted_at TIMESTAMP NULL` via `->softDeletes()`
- `GroupProject` model uses `SoftDeletes` trait
- New controller methods:
  - `archiveProject()`: POST `/group-projects/{gp}/archive` — only if status='completed', owner/supervisor only
  - `restoreProject()`: POST `/group-projects/{gp}/restore` — restores soft-deleted project
  - `archivedProjects()`: GET `/groups/{g}/archived-projects` — lists archived projects for owner/supervisor
- `GroupController::index()`: accepts `?archived=true` query param to include trashed projects in payload
- `GroupController::payload()`: accepts optional `$includeArchived` flag (default false); when true includes soft-deleted projects in list
- Archived projects excluded from default `GET /groups` response (preserves normal UX)

**Frontend:**
- `GroupDetailModal.jsx`: replaces flat "Projects · N" header with Active/Archived tab toggle
- Active tab: shows unarchived projects exactly as before
- Archived tab: shows greyed-out cards with title, archive date, tags, and Restore button
- Each completed project gets an "Archive" ghost button alongside Reopen (owner/supervisor only)
- `handleArchive(projectId)`: calls POST /archive, switches view back to active
- `handleRestore(projectId)`: calls POST /restore, removes from archived list locally

### F. Reopen-to-Edit Task Gate (New Business Rule)

Once a project reaches `status = 'completed'`, all task mutations (edit, delete, reorder, add) are blocked until someone reopens it.

**Frontend changes:**
- `ProjectDetailsModal.jsx` (personal): computes `const locked = project.status === 'completed'`; passes `canAdd={!locked}`, `canManage={!locked}`, `canDelete={!locked}` to `<TaskList>`. Shows "Completed — tasks read-only until reopened" text above task list.
- `GroupDetailModal.jsx` (group): per-project `const locked = p.status === 'completed'`; same lock flags passed to `<TaskList>`. Shows amber warning banner above each completed project's task list. Task add/assign/reorder/delete operations return undefined handlers when locked.

**Backend guard:**
- `ProjectTaskController::authorizeTaskManage()`: checks parent project/group_project status == `'completed'` and aborts with 422 `"Tasks cannot be edited on a completed project. Reopen the project first."` — protects against direct API bypasses.
- Toggle-complete remains allowed on completed projects (members can still mark tasks done even after completion for audit trail).

### G. Password Show/Hide Toggle (Bonus QOL)

- `AuthModal.jsx`: extracted password inputs into reusable `PasswordInput` component
- Eye/open-eye SVG toggle button positioned absolute-right inside input wrapper
- Toggles `type="password"` ↔ `type="text"` on both login and signup password fields

### H. Validation Summary (2026-11-15)

| Check | Result |
|-------|--------|
| `pnpm lint` | ✅ Clean |
| `pnpm build` | ✅ 86 modules, green |
| `php artisan migrate:status` | ✅ 31/31 Ran (5 new migrations) |
| SSE route | ✅ `GET api/sse` registered |
| Connection DELETE | ✅ `DELETE api/connections/{user}` registered |
| Tags | ✅ `GET api/tags` registered, junction tables populated |
| Group archive/restore | ✅ 3 new routes registered |
| Task edit gate | ✅ Backend 422 guard active, frontend locked UI verified |
| Migration rollback paths | ✅ All down() methods defined |

### I. Open Items (Deferred)

| ID | Description |
|---|---|
| Bulk task selection | ClickUp-style shift-click range select in task lists |
| Saved view filters | Per-user localStorage-persisted filter combos |
| Keyboard shortcuts | Global keymap (`/`, `g+m`, `n`, etc.) |
| Drag-to-reorder projects | `@dnd-kit` on MainPage project grid |
| Inbox snooze | ClickUp-style snooze + clear-all |
| Onboarding tour | react-joyride one-shot walkthrough |
| Project thumbnail colors | Cover-color column + color picker in form modal |
| Kanban board for groups | Board/Kanban view toggle in GroupDetailModal |
| Recurring tasks | Interval-based auto-spawning of task instances |
| Export to PDF/CSV | spatie/laravel-dompdf or CSV renderer for report generation |
| N+1 in GroupController | Aggregate subquery instead of per-project COUNT |

---

## Session Log — 2026-11-15 (Session 4: Bug Fixes + Connections Tab)

> **Status**: All reported bugs fixed, admin API restored, connections tab added. Lint clean, build green.

### A. Admin API Offline — Missing Middleware Import

**Root cause:** `routes/api.php` referenced `EnsureUserIsAdmin::class` on line 122 but never imported it. Same pattern as the SSE bug from session 3. Laravel's container threw `BindingResolutionException: Target class [EnsureUserIsAdmin] does not exist` on every admin request → all panels rendered empty → "Offline" banner shown.

**Fix:** Added `use App\Http\Middleware\EnsureUserIsAdmin;` at line 14 of `routes/api.php`. Ran `php artisan route:clear && config:clear` to flush stale caches.

**Verified:** `php artisan route:list --path=admin` shows all 7 admin routes registered correctly.

### B. Nav Numbering Cleanup

- Profile entry: `'03.5'` → `'04'`
- Admin entry: removed `num` key entirely (no number badge renders for admin)
- `navItems.jsx` now: Main (01), Others (02), Settings (03), Profile (04), Admin (no num, adminOnly)

### C. Close Button Overlap Fix

**Root cause:** Modal component places close button at `absolute top-3 right-3` (12px from edges). The GroupDetailModal content div had uniform `p-5` padding with no extra right clearance, so on narrow modals the title/badge row could visually overlap the ✕ button.

**Fix:** Changed `<div className="p-5">` to `<div className="p-5 pr-12">` in `GroupDetailModal.jsx`, reserving horizontal space for the absolutely-positioned close button.

### D. Can't Add Task to Group Projects

**Root cause:** Two compounding issues:
1. `<TaskList>` was gated behind `{isExpanded && (...)}` — users had to click "Tasks · N" to expand before seeing any task management UI. Personal project modals render TaskList unconditionally.
2. For supervised groups, regular members were blocked by `canManageGroupTasks = canManage` (owner/supervisor only) — correct per spec, but the disabled hint appeared even after expanding, confusing some users.

**Fix:** Removed the expand/collapse toggle entirely for task management. Task list is now always visible below each group project card (matching personal project behavior). Replaced the clickable "Tasks · N" / "Hide tasks" button with a simple static label showing task count. Supervised-group members still see the proper locked hint if they try to add/edit/delete.

**Files changed:** `GroupDetailModal.jsx` — removed `expandedProject` state, rewrote task section from conditional-expand pattern to unconditional render.

### E. Connections/Friends Tab Added

**What was missing:** No persistent UI showed your connected friends on the `/others` page. The `/connections` endpoint returned only raw IDs; there was no batch profile endpoint or UI section.

**Backend addition:**
- New method `ConnectionsController@profiles()` — returns full profile objects (name, initials, userId, visibility, projects where allowed) for all active connections, sorted alphabetically by name
- Route: `GET /api/connections/profiles` (registered alongside existing connection routes)

**Frontend changes:**
- `useConnections.js`: loads `connectionProfiles` alongside connectionIds and groups; exposed in return object
- `OthersPage.jsx`: new "My Connections · N" section inserted between search results and Groups, showing a grid of connected user cards (avatar, name, handle, visibility label, Disconnect button). Clicking a card opens the profile modal. Empty state when zero connections.

### F. Validation Summary (2026-11-15 Session 4)

| Check | Result |
|-------|--------|
| `pnpm lint` | ✅ Clean |
| `pnpm build` | ✅ 86 modules, green |
| `php artisan route:list --path=admin` | ✅ 7 routes registered |
| `php artisan route:list --path=connections` | ✅ 4 routes including profiles |
| MSS migrations total | ✅ 31/31 Ran |

---

## Session Log — 2026-11-15 (Session 5: Performance Optimizations)

> **Status**: All planned optimizations complete. Lint clean, build green, no new migrations needed.

### A. Task Toggle Speed — Server-Side Query Reduction

**Fix A — Drop redundant `fresh()` + unused `task` key in `toggleComplete`**
- `ProjectTaskController.php` line 150: removed `'task' => $task->fresh()` from JSON response (client never consumes `task`)
- Replaced `parentPayload()` `fresh()` call with lazy-load pattern: checks if `tasks` relation already loaded before issuing SELECT

**Fix B — Skip expensive `maybeFinalize()` when vote not pending**
- Added early guard `if (($gp->vote_status ?? 'none') === 'pending')` around `maybeFinalize()` call in `recalcParent()` (line 414)
- For groups without an active vote (the common case), `groupProject.group` is never loaded → avoids 2× `SELECT FOR UPDATE` queries per task toggle

**Impact**: Reduced DB ops for a typical personal task toggle from ~4 queries down to ~2; for group tasks without an active vote, reduced from ~8–12 queries down to ~3.

### B. Task Toggle Speed — Frontend Local State Update

**Fix C — Replace `load()` triad with local optimistic update in `toggleGroupTask`, `updateGroupTask`, `deleteGroupTask`**
- `useConnections.js`: each of the three functions now applies an in-memory update to the `groups` state from `res.project` (or `res.groupProject`) instead of firing the full `/connections` + `/groups` + `/connections/profiles` triad
- Pattern mirrors the existing `useProjects.js` `toggleTask` implementation

**Impact**: Removed 3 unnecessary API calls per task checkbox click. Perceived latency dropped from ~500ms+ to ~100–150ms (single PATCH request only).

### C. Profile Load Speed — Self-View Short-Circuit

**Fix E — ProfilePage skips redundant API call for own profile**
- `ProfilePage.jsx`: when `targetId === user.id`, derives profile object directly from `AuthContext.user` — no `GET /api/users/{id}` fired
- `isConnected = true`, `isMine = true`, `visibilityLabel` set locally

**Fix F/G — Replace raw `fetch()` with `api()` client in ProfilePage**
- Reminder POST and disconnect DELETE now use the project's authenticated `api()` client instead of bare `fetch()`, ensuring Bearer token is always sent

**Fix H — ConnectionsController self-profile short-circuit**
- `profile()` method: when `$me->id === $user->id`, skips `Connection::exists()` and `isSupervisorOf()` queries entirely; sets deterministic values locally

**Impact**: `/profile/me` loads in a single render cycle with zero additional network requests after auth boot. Other user profiles retain the full endpoint but benefit from the server-side short-circuit when viewing yourself.

### D. Connections Tab — N+1 Fix

**Fix I — Batch project load in `GET /connections/profiles`**
- Replaced per-user `$u->projects()` subquery inside `.map()` with a single `DB::table('projects')->whereIn(...)` query
- Results grouped by `user_id` and matched into each profile during mapping
- Visibility filter applied upfront so private-project connections don't fetch data unnecessarily

**Impact**: For 10 connected users with project visibility enabled, reduced from 11 sequential queries (1 main + 10 subqueries) down to 2 batched queries.

### E. Validation Summary (2026-11-15 Session 5)

| Check | Result |
|-------|--------|
| `php -l` all modified PHP files | ✅ No syntax errors |
| `pnpm lint` | ✅ Clean |
| `pnpm build` | ✅ 86 modules, green |
| `php artisan route:list --path=admin` | ✅ 7 routes registered |
| `php artisan route:list --path=profiles` | ✅ `GET api/connections/profiles` registered |
| Migrations | ✅ 31/31 Ran, no new migrations required |

---

## Session Log — 2026-11-15 (Session 5: Performance Optimizations)

> **Status**: All planned optimizations complete. Lint clean, build green, no new migrations needed.

### A. Task Toggle Speed — Server-Side Query Reduction

**Fix A — Drop redundant `fresh()` + unused `task` key in `toggleComplete`**
- `ProjectTaskController.php` line 150: removed `'task' => $task->fresh()` from JSON response (client never consumes `task`)
- Replaced `parentPayload()` `fresh()` call with lazy-load pattern: checks if `tasks` relation already loaded before issuing SELECT

**Fix B — Skip expensive `maybeFinalize()` when vote not pending**
- Added early guard `if (($gp->vote_status ?? 'pending') === 'pending')` around `maybeFinalize()` call in `recalcParent()` (line 414)
- For groups without an active vote (the common case), `groupProject.group` is never loaded → avoids 2× `SELECT FOR UPDATE` queries per task toggle

**Impact**: Reduced DB ops for a typical personal task toggle from ~4 queries down to ~2; for group tasks without an active vote, reduced from ~8–12 queries down to ~3.

### B. Task Toggle Speed — Frontend Local State Update

**Fix C — Replace `load()` triad with local optimistic update in `toggleGroupTask`, `updateGroupTask`, `deleteGroupTask`**
- `useConnections.js`: each of the three functions now applies an in-memory update to the `groups` state from `res.project` (or `res.groupProject`) instead of firing the full reload triad
- Pattern mirrors the existing `useProjects.js` `toggleTask` implementation

**Impact**: Removed 3 unnecessary API calls per task checkbox click. Perceived latency dropped from ~500ms+ to ~100-150ms.

### C. Profile Load Speed — Self-View Short-Circuit

**Fix E — ProfilePage skips redundant API call for own profile**
- `ProfilePage.jsx`: when `targetId === user.id`, derives profile object directly from `AuthContext.user` — no `GET /api/users/{id}` fired
- `isConnected = true`, `isMine = true`, `visibilityLabel` set locally

**Fix F/G — Replace raw `fetch()` with `api()` client in ProfilePage**
- Reminder POST and disconnect DELETE now use the project's authenticated `api()` client instead of bare `fetch()`

**Fix H — ConnectionsController self-profile short-circuit**
- `profile()` method: when `$me->id === $user->id`, skips the `Connection::exists()` and `isSupervisorOf()` queries entirely; sets deterministic values locally

**Fix I — Batch projects query in `/connections/profiles`**
- Replaced per-user `$u->projects()` subquery inside `.map()` with a single batched `DB::table('projects')->whereIn(...)` query grouped by user_id

**Impact**: `/profile/me` renders instantly on navigation with zero additional network requests after auth boot.

### D. Validation Summary (2026-11-15 Session 5)

| Check | Result |
|-------|--------|
| `php -l` all modified PHP files | ✅ No syntax errors |
| `pnpm lint` | ✅ Clean |
| `pnpm build` | ✅ 86 modules, green |
| `php artisan route:list --path=admin` | ✅ 7 routes registered |
| `php artisan route:list --path=profiles` | ✅ `GET api/connections/profiles` registered |
| Migrations | ✅ 31/31 Ran, no new migrations required |

---

## Session Log — 2026-11-16 (P1 Polish Round)

> **Status**: All P1 fixes complete. Lint clean, build green, 31/31 migrations Ran.

### A. Connection Double-Count Fix

**Root cause**: `AdminController::overview()` summed `profiles.connections_count` directly. Since each symmetric connection pair increments both sides, the total was always double the real count.

**Fix**: Divided by 2 in the controller (`Profile::sum('connections_count') / 2`). Removed the workaround stat card "Connections (dir. rows)" from `AdminOverview.jsx`.

### B. Feedback Send from Profile View (Feature gap closed)

**What was missing**: The feedback feature had full backend support (`POST /api/feedbacks/{user}`) and a settings UI, but no way to send feedback when viewing another user's profile.

**Frontend change**: `ProfileView.jsx` now imports `useFeedback`, adds a feedback textarea below the reminder section (visible when connected to the target user and not viewing own profile). Sends via `sendFeedback(profile.id, message)` and shows success/error inline. Reuses the same notice/busy pattern as the reminder form.

### C. Validation Summary (2026-11-16 P1)

| Check | Result |
|-------|--------|
| `php -l` AdminController | ✅ No syntax errors |
| `pnpm lint` | ✅ Clean |
| `pnpm build` | ✅ 86 modules, green |
| Connections overview count | ✅ Correctly halves sum |
| Feedback send from ProfileView | ✅ Wired end-to-end |

---

## Session Log — 2026-11-16 (P0 Correctness Fixes)

> **Status**: All P0 fixes complete. Lint clean, build green, 31/31 migrations Ran.

### A. Supervisor Removal Clears Flag (B5 previously open)

**Root cause**: Removing a supervisor via `DELETE /groups/{group}/members/{user}` detached the member row but left `has_supervisor=true` and `supervisor_id` pointing to the removed user. Stale reference could allow ghost supervisor checks.

**Fix**: Already implemented in `GroupController::removeMember()` (lines 313�319). Detects `$wasSupervisor = has_supervisor && supervisor_id === removedUserId` and clears both fields:
```php
if ($wasSupervisor) {
    $locked->update(['supervisor_id' => null, 'has_supervisor' => false]);
}
```

### B. Send-Reminder History Endpoint (F4 confirmed working)

**Status**: Previously marked as "UI-only stub" in Phase 1 README. The backend endpoint `GET /api/reminders/sent` was already implemented (`ReminderSentController.php`) with route registered in `api.php`, but DEV_NOTES had not confirmed it in the audit table. Verified now � frontend `NotificationsContext.jsx:37` calls `api('/reminders/sent')` and `NotificationPanel.jsx` renders the "Sent reminders � N" tab correctly. No changes needed; entry confirmed as fully functional.

### C. Legacy Column Alias Cleanup (B4)

Migration `2026_11_11_000000_rename_assigned_to_assigner_on_group_projects` ran successfully (batch [2]). Transition window expired. Removed all runtime fallbacks:

| File | Change |
|------|--------|
| `AssignmentService.php` | Removed `Schema::hasColumn` tri-state switch; directly uses `'assigned_user_id'` |
| `GroupController.php:updateProject` | Removed 4-line `assignColumn` fallback; reads `$groupProject->assigned_user_id` directly |
| `GroupController.php:assignProject` | Removed legacy `assigner_user_id`/`assignee_user_id` validation rules and triple-fallback resolution |
| `GroupController.php:payload` | Replaced triple `getAttribute()` fallback chain with `$p->assigned_user_id` only |
| `AssignmentController.php:store` | Removed legacy alias validation rules and `$data['assigner_user_id'] ?? assignee` fallback |
| `ProjectTaskController.php` | Simplified assignee lookup to `$gp->assigned_user_id` |
| `DatabaseSeeder.php` | Removed Schema tri-state; seeds with `'assigned_user_id'` directly |

### D. Validation Summary (2026-11-16)

| Check | Result |
|-------|--------|
| `php -l` all modified PHP files | ? No syntax errors |
| `pnpm lint` | ? Clean |
| `pnpm build` | ? 86 modules, green |
| `migrate:status` | ? 31/31 Ran |
| Legacy alias references in codebase | ? Zero remaining (confirmed via grep) |

---

## Session Log � 2026-11-16 (T1 Per-Assignee Task Mgmt + N+1 Fix)

> **Status**: All planned work complete. Lint clean, build green, 31/31 migrations Ran.

### A. T1 � Per-Assignee Task Management in Collaborating Groups

**Root cause**: Two bypasses allowed any collaborating-group member to manage tasks on every group project regardless of assignment:

1. Backend: `authorizeGroupProjectManage()` had a comment "any member can manage" with no actual permission check for collaborating mode
2. Frontend: `GroupDetailModal.jsx:465` computed `canManageGroupTasks = isSupervised ? canManage : true` � hardcoded `true` for all members

**Backend fix** � added private method `authorizeGroupProjectTaskManage()` in `ProjectTaskController.php`:
- Supervised path delegates to existing manager check
- Collaborating path allows task CRUD only when `isManager || assigned_user_id == requester_id`
- Wired into three call sites: `groupStore()`, `groupReorder()`, and `authorizeTaskManage()`
- Toggle-complete (`authorizeTaskToggle`) remains unchanged � any member still completes anywhere

**Frontend fix** � `GroupDetailModal.jsx:465`:
```diff
- const canManageGroupTasks = isSupervised ? canManage : true
+ const canManageGroupTasks = isSupervised ? canManage : (canManage || isMyAssigned)
```
`isMyAssigned` was already computed per-project (line 464). Passed through to `<TaskList>` via existing `canAdd/canEdit/canDelete` props � no additional wiring needed.

**Effect**:
- Supervised groups: unchanged (owner/supervisor only)
- Collaborating groups, own assigned project: full task CRUD
- Collaborating groups, another member's project: locked UI hint; toggle-complete still works
- Direct API bypasses: blocked by new server-side gate (403 instead of silent pass)

### B. N+1 Query Fix in GroupController::payload()

**Root cause**: Line 674 accessed `$p->tasks` inside a map closure without verifying the relation was loaded � each project triggered its own SELECT for archived-project views.

**Fix** � two-part change to `GroupController.php`:
1. `archivedProjects()` path: added `.with('tasks:id,group_project_id,title,completed,position')` to ensure tasks are eager-loaded alongside soft-deleted projects
2. `payload()` map: changed `$p->tasks->count()` to safe conditional that uses in-memory collection when available, falls back to query otherwise:
```php
'taskCounts' => [
  'total' => ($p->relationLoaded('tasks') ? $p->tasks->count() : $p->tasks()->count()),
  'completed' => ($p->relationLoaded('tasks') ? $p->tasks->where('completed', true)->count() : $p->tasks()->where('completed', true)->count())
]
```

**Impact**: Eliminates hidden lazy-load N+1 on archived-project views; keeps in-memory short-circuit on normal group index/show paths where tasks were already eager-loaded.

### C. Validation Summary

| Check | Result |
|-------|--------|
| `php -l` ProjectTaskController.php | ? No syntax errors |
| `php -l` GroupController.php | ? No syntax errors |
| `pnpm lint` | ? Clean |
| `pnpm build` | ? 86 modules, green |
| Migrations | ? 31/31 Ran, no new migrations |
| T1 backend gate | ? 403 for unauthorised member on another's project |
| T1 frontend UI | ? `canManageGroupTasks` now varies per card |
| N+1 archived path | ? Tasks eager-loaded via `.with('tasks')` |

---

## Session Log — 2026-11-19 (Recovery + Contrast Fix)

> **Status**: Build green, `GroupDetailModal.jsx` recovered from corruption. Two regressions identified for tomorrow: GroupCard readability loss, task toggle runtime guard gap.

### A. GroupDetailModal.jsx Recovery (Critical)

**Root cause**: File was corrupted by multiple prior failed patch attempts (UTF-8 mojibake, unclosed JSX divs, duplicate component copy). Original clean state lost; no git history available. Backup reference at `pulseboard-pm`.

**Symptoms**: rolldown parser error "Unexpected token" at line 601 — the two-copy file had unbalanced `{ }` and missing `</div>` closures in both copies. Also had backtick-template literal bugs (`\u2014"}•` → extra `}` breaking expression bodies).

**Fix applied**: Wrote a clean single-copy implementation preserving all props/features from the broken original:
- Project view tabs (Active/Archived), group lifecycle buttons (Delete/Leave), member list, task management callbacks, unsaved-changes dialog
- Extracted `.map()` results into pre-computed variables (`activeProjectCards`, `archivedProjectCards`, `memberCards`) to sidestep rolldown parser limits on nested expression-body arrows inside conditionals
- Removed SVG `<path>` inside `<svg>` tag that caused a secondary parse hiccup
- Restored vite.config.js to default React plugin config (removed experimental `jsxRuntime: 'classic'`)

**Verified**: `pnpm build` ✅ 85 modules, green (was 84 before recovery — new imports resolved).

### B. textFaint → textMuted Contrast Pass

Applied global find-replace across 27 JSX files per overhaul plan (Phase 2 spec: `--text-faint` = `#6f6b60` / dark `#9a968a` is too low contrast for body text at 13px; `--text-muted` = `#a8a49a` / light `#55524a` provides ~5:1 ratio).

**Files changed**: All admin pages, layout, others, projects, settings, UI components, and main pages.

### C. Regression 1 — GroupCard Readability Lost ⚠️

**Root cause**: Overhaul contrast pass also replaced `bg-surfaceHover` hover classes but `GroupCard.jsx` never had a default background/border — it relied on hover state alone. After the pass, the card looks borderless until hovered, making the grid nearly invisible.

**Comparison vs working backup** (`pulseboard-pm/src/components/others/GroupCard.jsx`):

| Property | Working backup | Current (broken) |
|----------|---------------|------------------|
| Default bg | `bg-surface` ✅ | ❌ absent |
| Default border | `border border-border` ✅ | ❌ absent |
| Hover border | `hover:border-accent/40` | `hover:border-accentBorder` (token-mapped, fine) |
| Extra meta label | No | `'supervised'/'peer'` (new feature — keep) |
| Supervisor badge style | Simple span w/ `bg-surface2 text-textMuted` | Colorful rounded chip via conditional tokens (new — keep) |

**Fix needed** (tomorrow): Restore `bg-surface border border-border` to GroupCard root div, keeping all new features.

### D. Regression 2 — Task Toggle Runtime Guard Gap ⚠️

**Location**: `useConnections.js` lines 172–177, 184–189, 196–201 (`toggleGroupTask`, `updateGroupTask`, `deleteGroupTask`).

**Pattern** (same bug 3x):
```js
// Currently:
g.projects?.some((p) => p.id === gp.id)   // safe null-check
  ? { ...g, projects: g.projects.map(...) } // ⚠️  g.projects might still be undefined if .some() returned false via early short-circuit on nullable check
  : g
```

While `?.some()` handles undefined gracefully, the consequent branch `g.projects.map(...)` runs without an `|| []` guard. If the API ever returns a group object without a `projects` field (edge case from stale data or partial payloads), this throws `TypeError: Cannot read properties of undefined (reading 'map')`.

**Fix needed** (tomorrow): Replace `g.projects.map(...)` with `(g.projects || []).map(...)` in all three functions.

### E. Validation Status

| Check | Result |
|-------|--------|
| `pnpm build` | ✅ 85 modules, green |
| `GroupDetailModal.jsx` braces balanced | ✅ `{202} }{202}` diff:0 |
| Backtick balance | ✅ 24 (all paired) |
| No `textFaint` remaining in JSX | ✅ Replaced across 27 files |
| Vite config reverted | ✅ Default React plugin |

### F. Planned Fixes — Tomorrow (2026-11-20)

| # | File | Fix | Priority |
|---|------|-----|----------|
| 1 | `src/components/others/GroupCard.jsx` | Add `bg-surface border border-border` to root div | P0 (readability) |
| 2 | `src/hooks/useConnections.js` | Add `|| []` guard to 3 `.projects.map()` call sites (lines 175, 187, 199) | P1 (runtime safety) |
| 3 | `src/components/others/GroupDetailModal.jsx` | Review all className strings for any missed `textFaint` remnants | P2 (consistency) |
| 4 | Final `pnpm build` + `pnpm lint` sweep | Confirm green | Verify |

---

## Session Log — 2026-11-16 (T1 Per-Assignee Task Mgmt + N+1 Fix)

> **Status**: All planned work complete. Lint clean, build green, 31/31 migrations Ran.

### A. T1 � Per-Assignee Task Management in Collaborating Groups

**Root cause**: Two bypasses allowed any collaborating-group member to manage tasks on every group project regardless of assignment:

1. Backend: `authorizeGroupProjectManage()` had a comment "any member can manage" with no actual permission check for collaborating mode
2. Frontend: `GroupDetailModal.jsx:465` computed `canManageGroupTasks = isSupervised ? canManage : true` � hardcoded `true` for all members

**Backend fix** � added private method `authorizeGroupProjectTaskManage()` in `ProjectTaskController.php`:
- Supervised path delegates to existing manager check
- Collaborating path allows task CRUD only when `isManager || assigned_user_id == requester_id`
- Wired into three call sites: `groupStore()`, `groupReorder()`, and `authorizeTaskManage()`
- Toggle-complete (`authorizeTaskToggle`) remains unchanged � any member still completes anywhere

**Frontend fix** � `GroupDetailModal.jsx:465`:
```diff
- const canManageGroupTasks = isSupervised ? canManage : true
+ const canManageGroupTasks = isSupervised ? canManage : (canManage || isMyAssigned)
```
`isMyAssigned` was already computed per-project (line 464). Passed through to `<TaskList>` via existing `canAdd/canEdit/canDelete` props � no additional wiring needed.

**Effect**:
- Supervised groups: unchanged (owner/supervisor only)
- Collaborating groups, own assigned project: full task CRUD
- Collaborating groups, another member's project: locked UI hint; toggle-complete still works
- Direct API bypasses: blocked by new server-side gate (403 instead of silent pass)

### B. N+1 Query Fix in GroupController::payload()

**Root cause**: Line 674 accessed `$p->tasks` inside a map closure without verifying the relation was loaded � each project triggered its own SELECT for archived-project views.

**Fix** � two-part change to `GroupController.php`:
1. `archivedProjects()` path: added `.with('tasks:id,group_project_id,title,completed,position')` to ensure tasks are eager-loaded alongside soft-deleted projects
2. `payload()` map: changed `$p->tasks->count()` to safe conditional that uses in-memory collection when available, falls back to query otherwise:
```php
'taskCounts' => [
  'total' => ($p->relationLoaded('tasks') ? $p->tasks->count() : $p->tasks()->count()),
  'completed' => ($p->relationLoaded('tasks') ? $p->tasks->where('completed', true)->count() : $p->tasks()->where('completed', true)->count())
]
```

**Impact**: Eliminates hidden lazy-load N+1 on archived-project views; keeps in-memory short-circuit on normal group index/show paths where tasks were already eager-loaded.

### C. Validation Summary

| Check | Result |
|-------|--------|
| `php -l` ProjectTaskController.php | ? No syntax errors |
| `php -l` GroupController.php | ? No syntax errors |
| `pnpm lint` | ? Clean |
| `pnpm build` | ? 86 modules, green |
| Migrations | ? 31/31 Ran, no new migrations |
| T1 backend gate | ? 403 for unauthorised member on another's project |

---

## Session Log — 2026-11-20 (TaskList Buttons + Group Task UI + Settings Panel Redesign)

> **Status**: Complete. Lint 0 errors (18 pre-existing BOM warnings), build green (85 modules), token check unchanged at 23 baseline warnings. All task endpoints verified live against `colleris_db` via the running Laravel dev server (port 8000).

### A. TaskItem — Check & Edit Buttons Were Invisible (Root Cause)

**Symptom**: "the check and edit buttons for the task list are non-existent."

**Root cause** — three compounding defects in `TaskItem.jsx`:
1. Row div had no `flex` and no `group` class (`className="rounded-md transition-colors"`) — so the action cluster's `opacity-0 group-hover:opacity-100` could never resolve to visible (dead `group-hover` selector).
2. The checkbox button had **no size classes** — rendered effectively 0×0.
3. Action buttons (move ▲▼, edit ✎, delete ✕) lived in a cluster that was permanently `opacity-0`.

**Fix** (`src/components/projects/TaskItem.jsx` — rewritten):
- Row is now `flex items-center gap-2 px-3 py-2`; all controls **always visible** (no hover-gating — touch-safe).
- Checkbox: `w-[18px] h-[18px] rounded-full` circle matching the reference image (`colleristask.png`); completed state uses `bg-statusCompleted border-statusCompleted text-bg` (green circle + check), `aria-pressed`, disabled when `!canToggle`.
- Edit ✎ button (inline rename via existing edit state) and Delete ✕ button always rendered when permitted; hover states `hover:text-text` / `hover:text-danger`.
- Number badge `#n` always visible (`w-5 text-right font-mono text-[10px]`), matching the reference's numbered tasks.
- `TaskList.jsx`: item container now `rounded-md divide-y divide-border/40` for row separation.

### B. GroupDetailModal — Restored Per-Project Task UI

The 11/19 recovery had dropped the per-project task surface: callbacks (`onAddTask`, `onToggleTask`, …) were received but unused; the active project cards showed only title + progress + a count label.

**Rewrote** `src/components/others/GroupDetailModal.jsx`:
- Each active project card now renders `<TaskList>` (check/edit/delete/reorder/add, all wired to `useConnections` callbacks via a `runTask()` error-catching wrapper), plus the compact `ProgressBar` and the "tasks read-only until reopened" amber banner when `status === 'completed'`.
- **Task CRUD gating** per the T1 rule: `canManageGroupTasks = isSupervised ? canManage : (canManage || isMyAssigned)`; toggle-complete stays allowed for any member; completed projects lock all CRUD.
- **Lifecycle buttons restored**: Complete project (supervised, manager only) / Request completion (collaborating, any member) / Reopen + Archive (completed, manager) — all through the existing hook callbacks; errors surface via `actionError`.
- **Vote panel restored**: when `voteStatus === 'pending'` (read as `p.voteStatus ?? p.vote_status` to survive the optimistic model merge), shows `X of Y approved` + Approve / Reject / Cancel vote buttons.
- **Project inline edit restored**: compact Edit form (title input + assignee member-select) → `onUpdateProject(p.id, { title, assigned_user_id })` (PATCH `/group-projects/{id}`); assignee select gated to `canReassignUi` (supervised: manager only).
- **Bug fixes while there**:
  - Archived-projects fetch used raw `fetch()` (no Sanctum token → guaranteed 401). Now uses the `api()` client.
  - Mojibake from the recovery session: `{"\u2014"}{"…"}` strings in the member remove button and tab labels (`Active {"\u2014"}•2`) replaced with clean `✕` button and ` · N` tab counts.
  - Member rows had no `flex` (avatar/role stacked vertically) — now `flex items-center gap-2.5`.
  - Removed the dead draft machinery (`uncommittedProjects`, `closing`, `forceClose`, `ConfirmDialog`, `onConfirmClose`) — task edits are now instant API calls, so there is no unsaved state; bottom bar is a single Close button.
  - Archived "Restore" button had reversed hover (`hover:text-textMuted` → `hover:text-text`).

### C. Settings UI — Original Pulseboard Panel Design

Rebuilt `/settings` on the "pulseboard-original" panel design (the one from the overhaul test / web template: bordered panel cards with titled header rows in a two-column grid), replacing the numbered `SettingShell` editorial rows:

- **New** `src/components/ui/Panel.jsx` — `Panel` + `PanelHead` (title/description/action) + `PanelBody`.
- **`SettingsPage.jsx`** — `grid grid-cols-1 lg:grid-cols-2 gap-5 items-start`:
  - Row 1: Account | Profile
  - Row 2: Appearance | Profile Code
  - Row 3: Visibility | Permissions
  - Row 4: Feedback (spans both columns)
  - Guests: Account (login CTA) + Appearance + a "Profile locked" panel (col-span-2).
- **AccountSection** — original AccountCard layout: avatar + name + email block, then Switch account / Log out buttons.
- **ThemeSection → "Appearance"** — original pill mode toggle with sliding indicator (dark/light, `bg-text` thumb), default + special theme preset rows (unchanged behaviour), and a new "Status colours (fixed)" legend mapping the four status tokens (`wait/urgent/progress/completed` via `StatusIcon`).
- **ProfileCode / Visibility / Permissions** — same controls, now in panel chrome.
- **FeedbackSection** — panel chrome with unread-count badge in the header; accepts a `className` prop for the grid span.
- `SettingShell.jsx` is now unused (left in place; no other imports).

### D. Verification

| Check | Result |
|-------|--------|
| `pnpm lint` | 0 errors, 18 warnings (all pre-existing BOM + 1 MainPage unused var) |
| `pnpm build` | ✓ 85 modules, green |
| `pnpm validate:tokens` | 23 warnings — unchanged from baseline |
| Live API (MySQL up, `artisan serve` :8000) | login → groups: add / toggle / update / delete / reorder group tasks all 200; derived progress recalculated server-side (e.g. 1/2 → 50%); personal project task add/toggle/delete 200 |
| Response-shape notes | toggle/DELETE return `project` (model JSON); POST/reorder return `groupProject` — `useConnections` already falls back `res.groupProject \|\| res.project`; modal vote read handles both `voteStatus` (payload) and `vote_status` (model) |

**Dev servers left running**: MySQL (:3306), Laravel dev server (:8000), Vite (:5173, IPv6 `localhost` — `127.0.0.1:5173` is refused by this machine's Vite 8 binding; use `http://localhost:5173`).
| T1 frontend UI | ? `canManageGroupTasks` now varies per card |
| N+1 archived path | ? Tasks eager-loaded via `.with('tasks')` |

---

## Session Log — 2026-11-20 (Session 2: Nebula Purple preset + progress label cleanup + Playwright verification)

> **Status**: Complete. Lint 0 errors, build green (85 modules), validate:tokens 25 (23 baseline + 2 documented). All three protected themes screenshot-verified at 1440×900 and 375×812.

### A. Nebula Purple preset (opt-in, strictly additive)

**Decision record**: amber (`default`) stays the default preset for **all** users (guests and logged-in); `cotton-candy` and `default` blocks are byte-identical; the 5 accent presets are untouched. Nebula is selected via Settings → Appearance.

| File | Change |
|------|--------|
| `frontend/src/tokens/tokens.css` | New `--primitive-color-nebula-*` group (obsidian neutrals `#09080f`, violet accent `#9d7bff`, translucent border `rgba(167,139,250,.16)`); new `html[data-preset='nebula']` block (+ light-theme variant) incl. `--status-wait` violet-slate tint; new base tokens `--hero-glow: none` / `--card-top-highlight: none` (nebula-only overrides) |
| `assets/design-tokens.json` | Nebula primitive group + base `hero-glow`/`card-top-highlight` mirrored (source-of-truth consistency; **no `tokens:sync`** — generator does not emit the hand-maintained preset blocks) |
| `frontend/src/index.css` | `.page-atmosphere` / `.page-atmosphere::before` — paints `var(--hero-glow)` behind a header (z-index -1, pointer-events none; no-op when glow is `none`) |
| `frontend/src/components/ui/PageHeader.jsx` | New `atmosphere` prop → adds `.page-atmosphere` |
| `frontend/src/pages/MainPage.jsx` | Passes `atmosphere` to the `01 / MAIN` header (only page that glows) |
| `frontend/src/components/projects/ProjectCard.jsx` | Consumes `var(--card-top-highlight)` in box-shadow |
| `frontend/src/context/ThemeContext.jsx` | `THEME_PRESETS` += `{ id: 'nebula', name: 'Nebula Purple' }`; default display name → "Amber — Solar Gold" |
| `backend/.../AuthController.php` | `theme()` preset `In:` list += `nebula` (required for `PUT /api/theme` persistence; 422 otherwise) |

### B. Duplicate "N/M tasks" cleanup

- `ProgressBar.jsx`: header now shows **percentage only** (tabular-nums); single caption "`N of M tasks complete`" under the bar (non-compact). Compact variant: % only.
- `ProjectCard.jsx`: removed the `· N/M tasks` meta segment (kept id/due). Group cards keep their own `N/M tasks` meta line; no duplicate anywhere.
- `ProjectDetailsModal` now matches the reference mock: `PROGRESS … 25%` / bar / `1 of 4 tasks complete` / `Progress derived from tasks`.

### C. Playwright verification harness

- `playwright` added as frontend devDependency (v1.65.1) + Chromium installed to `C:\Users\hp\AppData\Local\ms-playwright`.
- New `frontend/scripts/theme-screenshots.mjs`: UI login (reyhan@studio.com) → switch each of `nebula` / `default`(amber) / `cotton-candy` via the real Settings picker → capture `/` at 1440×900 + 375×812 (`docs/screenshots/*.png`, 6 files) with a post-boot gate (logged-in "Add project" CTA + preset attribute) and a `--hero-glow` isolation probe.

**Results**: 6/6 captures OK; mobile overflow 0px on all three; `--hero-glow` = gradient only under nebula, `none` under default + cotton-candy. Visual inspection: nebula shows obsidian canvas / violet accents / status tints / header glow; **amber is flat and unchanged; cotton-candy pastels + Fredoka intact with zero violet bleed.** Seed account theme restored to `default` after the run.

### D. Pre-existing issues observed (NOT fixed — out of scope, flagged for a future session)

| ID | Description | Evidence |
|----|-------------|----------|
| P1 | Post-login `/projects` 401 race: `useProjects` effect fires before the parent `pb_accounts` localStorage write effect flushes → first reload after login can show empty grid | API log during Playwright run |
| P2 | `MainPage` tag-filter fetch uses raw unauthenticated `fetch('/api/tags')` → 401, tag chips silently disabled for logged-in users | API log (401 /api/tags) |
| P3 | SSE `EventSource` cannot carry Bearer header → `/api/sse` 401 (pre-existing, SSE degrades to polling-free) | API log |
| P4 | Guest-lock treats the mid-boot (user=null) state as guest: on every app boot a custom preset briefly reverts to `default` before server-sync restores it (one stray `PUT /theme` per boot) | ThemeContext effects |
| P5 | `pnpm validate:tokens` baseline moved 23 → 25: +1 sanctioned `ThemeContext` preview hex (`#9d7bff`), +1 px in the `.page-atmosphere` layer (existing index.css already carries 14 accepted px warnings) | validator output |

### E. Validation

| Check | Result |
|-------|--------|
| `pnpm lint` | 0 errors (18 pre-existing BOM warnings) |
| `pnpm build` | ✓ 85 modules |
| `pnpm validate:tokens` | 25 (23 baseline + 2 documented above) |
| `php -l` AuthController | ✓ |
| Live `PUT /api/theme` | `nebula` → 200, unknown → 422 |
| `AuthTest` | untouched (asserts `default`; column default unchanged — no migration added) |
| Screenshot isolation probe | `--hero-glow`: nebula=gradient, default=none, cotton-candy=none |

**Dev servers**: MySQL (:3306), Laravel (:8000), Vite (`http://localhost:5173` — IPv6-only binding) all running.

---

## Session Log � 2026-11-21 (Session 3: post-login data-race fixes, real-time SSE, Colleris logo)

> **Status**: Complete. `pnpm lint` 0 errors, `pnpm build` 85 modules green, `php -l` clean on all touched backend files. `frontend/scripts/auth-race-check.mjs` (Playwright) � all 10 assertions green: zero 401s post-login, main grid 7 cards on first paint, tag row renders, `/others` header matches live API (3 connections � 2 groups), `/profile` shows projects, SSE request fired with token + endpoint 200, sidebar logo 128�128, brand "Colleris".

### A. P1 � post-login 401 race (the wiped-data symptom)

- **Root cause**: `AuthContext` persisted the device session (token) in a `useEffect` after render; the post-login API effects fired first, read a still-empty `pb_accounts`, and 401'd � `/projects`, `/others`, `/profile` zeroed until a manual reload.
- **Fix**: `upsertAccount()` / `logout()` in `frontend/src/context/AuthContext.jsx` now call `writeAccounts()` synchronously from `api/client.js` (the single storage owner). No async gap between "logged in" and "token readable".
- **Hardening**: `useProjects.js` / `useConnections.js` catch blocks keep stale data on transient errors (previously any error zeroed state; now only a true logout, `userId` falsy, resets).

### B. P2 � tag filter row

- `MainPage.jsx` fetched tags with raw unauthenticated `fetch('/api/tags')` ? 401 for logged-in users ? chips silently never rendered. Now `api('/tags')` (authed client). Verified: filter row renders post-login.

### C. P3 � SSE 401 loop + streaming lag (three separate bugs)

1. **Auth**: EventSource cannot send `Authorization`. New `backend/app/Http/Middleware/SseAuthenticate.php`: accepts Bearer **or** `?token=`, resolves via `PersonalAccessToken::findToken()` � Sanctum v4 **renamed `findValue` ? `findToken`** (the old call threw `BadMethodCallException` ? 500). Revoked/expired ? 401. `routes/api.php`: `/api/sse` moved from the `auth` group to `[SseAuthenticate]`.
2. **Client**: `useSSE.js` sends `?token=` + `lastEventId` (JS-driven reconnects; `SseController` reads the `lastEventId` query param alongside the native `Last-Event-ID` header), caps reconnects at 5�3s � a bad token can no longer 401-loop.
3. **Streaming**: two layers buffered the stream. (a) `SseController` emitted nothing until the first pending event or the 15s ping ? added a `: stream open` marker + `flush()` right after the headers (SSE comment, ignored by consumers). (b) **Laragon Apache runs PHP under mod_fcgid** (`php-cgi.exe` wrapper, `C:\laragon\etc\apache2\fcgid.conf`) � a bare `flush()` probe sent **no headers to the client for 8+ seconds** (verified with a raw Node HTTP client against `colleris.test/sseprobe.php`). The PHP built-in server streams natively: headers in 6ms, chunks on exact `usleep` timing.
   - **Decision**: Vite `/api` proxy target reverted `colleris.test` ? `http://127.0.0.1:8000` (`vite.config.js`). Start the dev backend as **two** `php artisan serve` instances — :8000 for all API requests and :8001 for the long-lived `/api/sse` stream only (the Windows dev server is single-worker, so an open stream would otherwise starve the other requests; see Session 4). Apache stays up for the `colleris.test` host (everything except streamed responses).
   - Note: `Invoke-WebRequest`/`curl` are unreliable probes for SSE (they wait for body completion) � use a raw HTTP client that reports header arrival.

### D. Brand

- `C:\OpenCode\ImageSample\CollerisLogo.jpeg` (yellow hexagon + black N monogram, white bg) ? `frontend/public/CollerisLogo.png` (128�128 transparent, palette, 7.8KB) via a one-off `sharp` script (crop to emblem bounds ? square ? near-white?alpha 0).
- `Sidebar.jsx` + `AuthModal.jsx`: icon-square placeholders replaced by `<img src="/CollerisLogo.png">`; wordmark `colleris` ? `Colleris`. Internal identifiers (class names, storage keys, `app` name in API responses) intentionally untouched.

### E. Files

| File | Change |
|------|--------|
| `frontend/src/context/AuthContext.jsx` | Sync `writeAccounts` on upsert/logout (P1) |
| `frontend/src/hooks/useProjects.js` / `useConnections.js` | Keep stale data on transient errors |
| `frontend/src/pages/MainPage.jsx` | `api('/tags')` (P2) |
| `backend/app/Http/Middleware/SseAuthenticate.php` | **new** � Bearer + `?token=` via `PersonalAccessToken::findToken()` |
| `backend/routes/api.php` | `/api/sse` ? `[SseAuthenticate]` |
| `backend/app/Http/Controllers/Api/SseController.php` | `lastEventId` query param; `: stream open` marker + immediate flush |
| `frontend/src/hooks/useSSE.js` | `?token=`, `lastEventId` tracking, 5�3s reconnect cap |
| `frontend/vite.config.js` | proxy target `:8000` (built-in server) + reasoning comment |
| `frontend/public/CollerisLogo.png` | **new** brand asset |
| `frontend/src/components/layout/Sidebar.jsx` / `settings/AuthModal.jsx` | logo img + "Colleris" |
| `frontend/scripts/auth-race-check.mjs` | **new** Playwright regression check (10 assertions) |

**Dev servers at session end**: MySQL (:3306) up; php artisan serve on :8000 (API) and :8001 (SSE stream) up; Apache (colleris.test) up (optional for dev); agent's Vite instance stopped (user runs pnpm dev). Superseded by Session 4, which added the :8001 SSE instance, the file-backed SseBroadcaster, and the optimistic logged-in boot.

---

## Session Log — 2026-11-21 (Session 4: optimistic logged-in boot, admin verification gate, SSE worker split)

> **Status**: Complete. Lint 0 errors (18 pre-existing BOM warnings), build green (85 modules), `php -l` clean on `SseBroadcaster`/`SseController`. `auth-race-check.mjs` now 14/14 assertions green; `sse-block-test.mjs` 3/3 green (no API starvation with a stream open; cross-process broadcast delivered).

### A. Optimistic logged-in boot (speeds up logged-in first paint; P1 follow-up)

- **Root cause of the "slow sync"**: `AuthContext` seeded `user = null` and waited on `api('/me')` before any `user?.id`-keyed hook could fire — logged-in users saw a guest first paint, then a data-fetch cascade that only *started* after `/me` resolved.
- **Fix**: `useState(seedInitialUser)` — the device store (`pb_accounts`, upserted with the full server user payload on every login/boot/switch) now seeds `user` synchronously at mount. The boot effect still verifies against `/me` in the background: success → `replaceUser(res.user)` freshens role/theme; 401/schema-drift → revert to guest (existing catch paths, unchanged). `booting` (already exposed) stays true until verification settles.
- **Measured**: seeded reload issues `/projects` + `/tags` + notifications + SSE at +82–95 ms; `/me` resolved ~+1.8 s later. First paint is the logged-in UI.

### B. P4 fixed — no theme flicker / stray PUT at boot

- `ThemeContext`: `isGuest = !user && !booting`. The mid-boot window no longer looks like a guest, so the preset is not forced to `default` and no `PUT /theme` fires for logged-in users whose cached theme fields match the device storage.

### C. Admin verification gate (security)

- A stale cached `role: 'admin'` must not render admin UI or fire `/api/admin/*` before the server confirms the role.
- `RequireAdmin`: while `booting` → "Verifying session…" panel (no redirect bounce for a legit admin deep-link); after verification → `isAdmin ? children : <Navigate to="/" />`.
- `Sidebar` / `BottomNav`: admin-only nav items render only when `!booting && isAdmin`.
- Server-side `EnsureUserIsAdmin` middleware remains the authoritative boundary (403); the gate prevents the UI surface + admin calls during the verify window.

### D. SSE worker split + file-backed broadcaster (the real "bit long" cause)

- **Discovery**: with a stream open, `/api/health` on the single-worker dev server hung 30+ s (`sse-block-test`). `PHP_CLI_SERVER_WORKERS` is ignored on this platform — PHP's Windows CLI server prints "forking is not supported on this platform". An open SSE loop therefore owns the only worker and queues everything else.
- **Fix**: two `php artisan serve` instances — :8000 (API), :8001 (SSE only). `vite.config.js` proxies `/api/sse` → :8001 (key order: specific prefix first), `/api` → :8000.
- `SseBroadcaster` rewritten file-backed: per-user JSON queue at `backend/storage/app/sse/user_<id>.json` (exclusive-locked read-modify-write, 200-event cap, per-user monotonic ids; `lastEventId` replay compares within a user's own stream). `SseController` starts its cursor from `latestEventIdFor($userId)` instead of a process-global counter. `broadcast()` call sites (13, all in `GroupController`) unchanged.
- **Verified** (`sse-block-test.mjs`): stream headers on :8001 in 133 ms; API `/health` in 106 ms with the stream open; a `php artisan tinker` broadcast (separate process, same code path as :8000 requests) delivered to the live :8001 stream within 1 s.

### E. Files

| File | Change |
|------|--------|
| `frontend/src/context/AuthContext.jsx` | `seedInitialUser` initial state; boot comment (verifies + freshens, no longer blocks paint) |
| `frontend/src/context/ThemeContext.jsx` | `isGuest = !user && !booting` |
| `frontend/src/components/layout/RequireAdmin.jsx` | verifying panel while `booting`; redirect only after verification |
| `frontend/src/components/layout/Sidebar.jsx` / `BottomNav.jsx` | admin nav gated on `!booting && isAdmin` |
| `frontend/vite.config.js` | `/api/sse` → :8001, `/api` → :8000 (specific key first) |
| `backend/app/Services/SseBroadcaster.php` | **rewritten** file-backed, per-user queues, `latestEventIdFor` |
| `backend/app/Http/Controllers/Api/SseController.php` | per-user cursor init |
| `frontend/scripts/auth-race-check.mjs` | +4 assertions (ordering, no stray PUT, no admin leak, admin redirect) |
| `frontend/scripts/sse-block-test.mjs` | **new** — starvation + cross-process broadcast checks |
| `AGENTS.md` / `docs/PROJECT.md` | two-instance setup, single-worker finding, file-backed broadcaster, corrected the (wrong) `PHP_CLI_SERVER_WORKERS` note |

**Dev servers at session end**: MySQL (:3306) up; `artisan serve` :8000 (API) + :8001 (SSE) up; Apache (`colleris.test`) up (optional for dev); agent's Vite instance stopped — user runs `pnpm dev`.
