<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminLog;
use App\Models\Assignment;
use App\Models\Group;
use App\Models\GroupInvitation;
use App\Models\Profile;
use App\Models\Project;
use App\Models\Reminder;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $users = User::count();
        $registered = $users;
        $admins = User::where('role', 'admin')->count();
        $projects = Project::count();
        $inProgress = Project::whereIn('status', ['progress', 'urgent'])->count();
        $groups = Group::count();
        $connections = Profile::sum('connections_count') / 2;
        $pendingAssignments = Assignment::where('status', 'pending')->count();
        $pendingInvitations = GroupInvitation::where('status', 'pending')->count();
        $reminders = Reminder::count();

        return response()->json([
            'overview' => [
                'registered' => $registered,
                'admins' => $admins,
                'users' => $users,
                'projects' => $projects,
                'inProgress' => $inProgress,
                'groups' => $groups,
                'connections' => $connections,
                'pendingAssignments' => $pendingAssignments,
                'pendingInvitations' => $pendingInvitations,
                'reminders' => $reminders,
            ],
        ]);
    }

    /** Recent collaboration records for admin inspection. */
    public function collaboration(Request $request): JsonResponse
    {
        $invitations = GroupInvitation::with(['group:id,name', 'inviter:id,name', 'invitee:id,name'])
            ->latest()->limit(20)->get()->map(fn (GroupInvitation $i) => [
                'id' => $i->id,
                'kind' => 'group_invitation',
                'status' => $i->status,
                'group' => $i->group?->name,
                'actor' => $i->inviter?->name,
                'target' => $i->invitee?->name,
                'time' => $i->created_at?->getTimestamp() * 1000,
            ]);

        $assignments = Assignment::with(['group:id,name', 'requester:id,name', 'recipient:id,name'])
            ->latest()->limit(20)->get()->map(fn (Assignment $a) => [
                'id' => $a->id,
                'kind' => 'assignment',
                'status' => $a->status,
                'group' => $a->group?->name,
                'title' => $a->title,
                'actor' => $a->requester?->name,
                'target' => $a->recipient?->name,
                'time' => $a->created_at?->getTimestamp() * 1000,
            ]);

        $reminders = Reminder::with(['sender:id,name', 'recipient:id,name'])
            ->latest()->limit(20)->get()->map(fn (Reminder $r) => [
                'id' => $r->id,
                'kind' => 'reminder',
                'status' => $r->read_at ? 'read' : 'unread',
                'group' => null,
                'title' => $r->message,
                'actor' => $r->sender?->name,
                'target' => $r->recipient?->name,
                'time' => $r->created_at?->getTimestamp() * 1000,
            ]);

        $rows = collect([...$invitations, ...$assignments, ...$reminders])
            ->sortByDesc('time')
            ->values()
            ->take(40);

        return response()->json(['collaboration' => $rows]);
    }

    public function users(Request $request): JsonResponse
    {
        $rows = User::query()
            ->select(['id', 'name', 'email', 'role', 'created_at'])
            ->with(['profile:user_id,initials,handle,visibility,connections_count'])
            ->withCount('projects')
            ->orderBy('id')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'initials' => $u->profile?->initials ?? $u->initials(),
                'userId' => $u->profile?->handle,
                'email' => $u->email,
                'role' => $u->role,
                'visibility' => $u->profile?->visibility ?? 'private',
                'connections' => $u->profile?->connections_count ?? 0,
                'projects' => $u->projects_count,
                'createdAt' => $u->created_at?->toDateTimeString(),
            ]);

        return response()->json(['users' => $rows]);
    }

    public function logs(Request $request): JsonResponse
    {
        $logs = AdminLog::with('user:id,name')->orderByDesc('id')->limit(200)->get()->map(fn (AdminLog $l) => $this->logEntry($l));

        return response()->json(['logs' => $logs]);
    }

    public function storeLog(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', 'string', 'in:info,success,warn,error,event'],
            'message' => ['required', 'string', 'max:255'],
            'detail' => ['nullable', 'string', 'max:255'],
        ]);

        $log = AdminLog::create([
            'type' => $data['type'],
            'message' => $data['message'],
            'detail' => $data['detail'] ?? null,
            'user_id' => $request->user()->id,
        ]);

        return response()->json([
            'log' => $this->logEntry($log->fresh(['user:id,name'])),
        ], 201);
    }

    public function clearLogs(Request $request): JsonResponse
    {
        AdminLog::query()->delete();

        return response()->json(['message' => 'Logs cleared']);
    }

    private function logEntry(AdminLog $l): array
    {
        return [
            'id' => $l->id,
            'type' => $l->type,
            'message' => $l->message,
            'detail' => $l->detail,
            'time' => $l->created_at?->getTimestamp() * 1000,
            'user' => $l->user?->name,
        ];
    }

    public function status(Request $request): JsonResponse
    {
        try {
            \Illuminate\Support\Facades\DB::select('select 1');
            $db = true;
        } catch (\Throwable) {
            $db = false;
        }

        return response()->json([
            'status' => [
                ['label' => 'Database connection', 'ok' => $db, 'meta' => $db ? 'Operational' : 'Issue', 'detail' => config('database.default').'://'.config('database.connections.'.config('database.default').'.host')],
                ['label' => 'API layer', 'ok' => true, 'meta' => 'Live', 'detail' => route('api.health', [], false)],
                ['label' => 'Authentication', 'ok' => true, 'meta' => 'Sanctum', 'detail' => 'token-based'],
                ['label' => 'Laravel version', 'ok' => true, 'meta' => app()->version(), 'detail' => 'PHP '.PHP_VERSION],
                ['label' => 'Application environment', 'ok' => true, 'meta' => config('app.env'), 'detail' => 'debug '.(config('app.debug') ? 'on' : 'off')],
            ],
            'source' => 'live',
        ]);
    }
}