<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AssignmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ConnectionsController;
use App\Http\Controllers\Api\FeedbackController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ProjectTaskController;
use App\Http\Controllers\Api\ReminderController;
use App\Http\Controllers\Api\SseController;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\SseAuthenticate;
use Illuminate\Support\Facades\Route;

    // Health / public introspection
    Route::get('/health', fn () => response()->json(['status' => 'ok', 'app' => config('app.name')]))->name('api.health');
    Route::get('/schema-version', fn () => response()->json(['schemaVersion' => app(\App\Http\Controllers\Api\AuthController::class)->schemaVersion()]));

// Authentication (public)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Public directory access — guests may search and view visibility-aware profiles,
// but every collaboration action stays behind auth:sanctum.
Route::get('/users/search', [ConnectionsController::class, 'search']);
Route::get('/users/{user}', [ConnectionsController::class, 'profile']);

// Real-time SSE feed. EventSource cannot send an Authorization header, so
// this route authenticates via SseAuthenticate (Bearer header OR ?token=).
Route::get('/sse', [SseController::class, 'subscribe'])->middleware(SseAuthenticate::class)->name('api.sse');

// Everything below requires a valid Sanctum token.
Route::middleware('auth:sanctum')->group(function () {
    // Auth / account
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/add-account', [AuthController::class, 'addAccount']);
    Route::put('/profile', [AuthController::class, 'updateUser']);
    Route::post('/profile-code', [AuthController::class, 'profileCode']);
    Route::put('/theme', [AuthController::class, 'theme']);

    // Projects
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::put('/projects/{project}', [ProjectController::class, 'update']);
    Route::patch('/projects/{project}/progress', [ProjectController::class, 'progress']);
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);
    Route::post('/projects/{project}/restore', [ProjectController::class, 'restore']);
    Route::patch('/projects/{project}/guide', [ProjectController::class, 'updateGuide']);

    // Project tasks (persistent, derived progress)
    Route::get('/projects/{project}/tasks', [ProjectTaskController::class, 'index']);
    Route::post('/projects/{project}/tasks', [ProjectTaskController::class, 'store']);
    Route::post('/projects/{project}/tasks/reorder', [ProjectTaskController::class, 'reorder']);
    Route::get('/tasks/{task}', [ProjectTaskController::class, 'show']);
    Route::patch('/tasks/{task}', [ProjectTaskController::class, 'update']);
    Route::delete('/tasks/{task}', [ProjectTaskController::class, 'destroy']);
    Route::patch('/tasks/{task}/complete', [ProjectTaskController::class, 'toggleComplete']);
    Route::post('/projects/{project}/complete', [ProjectTaskController::class, 'complete']);
    Route::post('/projects/{project}/reopen', [ProjectTaskController::class, 'reopen']);

    // Group project tasks (shared — same model)
    Route::get('/group-projects/{groupProject}/tasks', [ProjectTaskController::class, 'groupIndex']);
    Route::post('/group-projects/{groupProject}/tasks', [ProjectTaskController::class, 'groupStore']);
    Route::post('/group-projects/{groupProject}/tasks/reorder', [ProjectTaskController::class, 'groupReorder']);
    Route::post('/group-projects/{groupProject}/complete', [ProjectTaskController::class, 'groupComplete']);
    Route::post('/group-projects/{groupProject}/reopen', [ProjectTaskController::class, 'groupReopen']);
    // Collaborating vote flow — unanimous, tasks stay editable
    Route::post('/group-projects/{groupProject}/request-complete', [ProjectTaskController::class, 'groupRequestComplete']);
    Route::post('/group-projects/{groupProject}/vote', [ProjectTaskController::class, 'groupVote']);
    Route::get('/group-projects/{groupProject}/votes', [ProjectTaskController::class, 'groupVotes']);
    Route::post('/group-projects/{groupProject}/finalize-vote', [ProjectTaskController::class, 'groupFinalizeVote']);
    Route::post('/group-projects/{groupProject}/cancel-vote', [ProjectTaskController::class, 'groupCancelVote']);

    // Directory + connections
    Route::get('/connections', [ConnectionsController::class, 'index']);
    Route::get('/connections/profiles', [ConnectionsController::class, 'profiles']);
    Route::post('/connections/{user}', [ConnectionsController::class, 'store']);
    Route::delete('/connections/{user}', [ConnectionsController::class, 'destroy']);

    // Shared tag autocomplete (used by both personal and group project forms)
    Route::get('/tags', [ProjectController::class, 'indexTags']);

    // Groups
    Route::get('/groups', [GroupController::class, 'index']);
    Route::post('/groups', [GroupController::class, 'store']);
    Route::get('/groups/{group}', [GroupController::class, 'show']);
    Route::post('/groups/join', [GroupController::class, 'join']);
    Route::post('/groups/{group}/invite', [GroupController::class, 'invite']);
    Route::get('/groups/{group}/invitations', [GroupController::class, 'invitations']);
    Route::patch('/groups/invitations/{invitation}', [GroupController::class, 'respondInvitation']);
    Route::post('/groups/{group}/members', [GroupController::class, 'addMember']);
    Route::delete('/groups/{group}/members/{user}', [GroupController::class, 'removeMember']);
    Route::post('/groups/{group}/leave', [GroupController::class, 'leave']);
    Route::post('/groups/{group}/projects', [GroupController::class, 'assignProject']);
    Route::patch('/group-projects/{groupProject}', [GroupController::class, 'updateProject']);
    Route::post('/group-projects/{groupProject}/archive', [GroupController::class, 'archiveProject']);
    Route::post('/group-projects/{groupProject}/restore', [GroupController::class, 'restoreProject']);
    Route::get('/groups/{group}/archived-projects', [GroupController::class, 'archivedProjects']);

    // Assignments (permission-aware project/note hand-off)
    Route::get('/assignments', [AssignmentController::class, 'index']);
    Route::post('/assignments', [AssignmentController::class, 'store']);
    Route::patch('/assignments/{assignment}', [AssignmentController::class, 'update']);

    // Reminders
    Route::get('/reminders', [ReminderController::class, 'index']);
    Route::post('/reminders/{user}', [ReminderController::class, 'store']);
    Route::patch('/reminders/{reminder}', [ReminderController::class, 'update']);
    Route::get('/reminders/sent', [\App\Http\Controllers\Api\ReminderSentController::class, 'index']);

    // Notifications (lightweight inbox)
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{notification}', [NotificationController::class, 'update']);

    // Feedback
    Route::get('/feedbacks', [FeedbackController::class, 'index']);
    Route::post('/feedbacks/{user}', [FeedbackController::class, 'store']);
    Route::patch('/feedbacks/{feedback}', [FeedbackController::class, 'update']);

    // Admin (server-authorised)
    Route::middleware(EnsureUserIsAdmin::class)->prefix('admin')->group(function () {
        Route::get('/overview', [AdminController::class, 'overview']);
        Route::get('/users', [AdminController::class, 'users']);
        Route::get('/logs', [AdminController::class, 'logs']);
        Route::post('/logs', [AdminController::class, 'storeLog']);
        Route::delete('/logs', [AdminController::class, 'clearLogs']);
        Route::get('/status', [AdminController::class, 'status']);
        Route::get('/collaboration', [AdminController::class, 'collaboration']);
    });
});