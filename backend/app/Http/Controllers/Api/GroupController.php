<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\GroupInvitation;
use App\Models\GroupProject;
use App\Models\Tag;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\AssignmentService;
use App\Services\GroupAccess;
use App\Services\GroupProjectVoteService;
use App\Services\SseBroadcaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class GroupController extends Controller
{
    public function __construct(
        private readonly AssignmentService $service,
        private readonly GroupAccess $access,
        private readonly GroupProjectVoteService $votes,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $query = $request->user()->groups()
            ->with($this->groupRelations());

        // When ?archived=true, include soft-deleted group projects in the payload
        $includeArchived = $request->boolean('archived');

        $groups = $query->get();

        foreach ($groups as $group) {
            foreach ($group->projects as $project) {
                $project->recalculateProgress();
            }
            // Clear eager-loaded tasks after reading — recalculateProgress
            // mutates and saves the model; doing this per-project above is
            // intentional so task-backed progress stays fresh on every read.
        }

        return response()->json([
            'groups' => $groups->map(fn (Group $group) => $this->payload($group, $request->user()->id, $includeArchived)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'has_supervisor' => ['required', 'boolean'],
            'supervisor_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $user = $request->user();

        $supervisorId = $data['has_supervisor']
            ? ($data['supervisor_id'] ?? $user->id)
            : null;

        $group = Group::create([
            'owner_id' => $user->id,
            'name' => $data['name'],
            'has_supervisor' => $data['has_supervisor'],
            'supervisor_id' => $supervisorId,
            'join_code' => $this->newJoinCode(),
            'join_code_expires_at' => now()->addDays(7),
        ]);

        $group->members()->attach($this->uniqueIds([$user->id, (int) $supervisorId]));

        return response()->json(['group' => $this->payload($group->fresh($this->groupRelations()), $user->id)], 201);
    }

    public function show(Request $request, Group $group): JsonResponse
    {
        $group->load($this->groupRelations());
        $this->authorizeMember($request, $group);

        foreach ($group->projects as $project) {
            $project->recalculateProgress();
        }

        return response()->json(['group' => $this->payload($group, $request->user()->id)]);
    }

    /** Return archived group projects for a group (owner/supervisor only). */
    public function archivedProjects(Request $request, Group $group): JsonResponse
    {
        $this->authorizeMember($request, $group);
        abort_unless($this->access->isManager($group, $request->user()), 403, 'Only the owner or supervisor can view archived projects.');

        $projects = $group->projects()
            ->withTrashed()
            ->whereNotNull('deleted_at')
            ->orderByDesc('deleted_at')
            ->get();

        return response()->json(['archivedProjects' => $projects->map(fn ($p) => [
            'id' => $p->id,
            'title' => $p->title,
            'status' => $p->status,
            'progress' => $p->progress,
            'tag' => $p->tag ?? null,
            'tags' => $p->tags->map(fn ($t) => ['id' => $t->id, 'name' => $t->name])->values(),
            'assigned_user_id' => $p->assigned_user_id,
            'assignedName' => $p->assigned?->name,
            'assignedInitials' => $p->assigned?->initials(),
            'deleted_at' => $p->deleted_at?->getTimestamp() * 1000,
            'taskCounts' => ['total' => $p->tasks()->count(), 'completed' => $p->tasks()->where('completed', true)->count()],
        ])]);
    }

    public function join(Request $request): JsonResponse
    {
        $data = $request->validate([
            'join_code' => ['required', 'string', 'min:3', 'max:12'],
        ]);

        $code = strtoupper(trim($data['join_code']));

        $group = Group::where('join_code', $code)->first();

        abort_unless($group, 422, 'This join code is not valid.');

        $hasExpired = $group->join_code_expires_at !== null && $group->join_code_expires_at->isPast();
        abort_if($hasExpired, 422, 'This join code has expired.');

        $user = $request->user();

        DB::transaction(function () use ($group, $user) {
            $locked = Group::whereKey($group->id)->lockForUpdate()->firstOrFail();
            abort_if($locked->members()->where('user_id', $user->id)->exists(), 409, 'You are already a member of this group.');

            $locked->members()->attach($user->id);
            $this->votes->reconcileMembership($locked);

            $this->notify($locked->owner_id, 'group_activity', $user->id, [
                'group_id' => $locked->id,
                'groupName' => $locked->name,
                'detail' => "{$user->name} joined “{$locked->name}”.",
            ]);

            // Broadcast to all group members via SSE
            \App\Services\SseBroadcaster::broadcast($user->id, 'member_joined', [
                'groupId' => $locked->id,
                'groupName' => $locked->name,
                'userId' => $user->id,
                'userName' => $user->name,
            ]);
        });

        return response()->json(['group' => $this->payload($group->fresh($this->groupRelations()), $user->id)], 201);
    }

    public function invite(Request $request, Group $group): JsonResponse
    {
        $this->authorizeMember($request, $group);

        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $me = $request->user();
        $inviteeId = (int) $data['user_id'];

        abort_if($inviteeId === $me->id, 422, 'You cannot invite yourself to your own group.');
        abort_if($group->members()->where('user_id', $inviteeId)->exists(), 409, 'That user is already a member.');

        $pending = $group->invitations()->where('invitee_id', $inviteeId)->whereIn('status', ['pending'])->exists();
        abort_if($pending, 409, 'That user already has a pending invitation.');

        $invitation = GroupInvitation::updateOrCreate(
            ['group_id' => $group->id, 'invitee_id' => $inviteeId],
            ['inviter_id' => $me->id, 'status' => 'pending'],
        );

        $this->notify($inviteeId, 'group_invite', $me->id, [
            'invitation_id' => $invitation->id,
            'group_id' => $group->id,
            'groupName' => $group->name,
            'detail' => "{$me->name} invited you to join “{$group->name}”.",
        ]);

        // Broadcast invite event to invitee via SSE
        \App\Services\SseBroadcaster::broadcast($inviteeId, 'group_invite_sse', [
            'groupId' => $group->id,
            'groupName' => $group->name,
            'inviterId' => $me->id,
            'inviterName' => $me->name,
        ]);

        return response()->json(['invitation' => $this->invitationPayload($invitation->fresh($this->invitationRelations())), 'group' => $this->payload($group->fresh($this->groupRelations()), $me->id)], 201);
    }

    public function invitations(Request $request, Group $group): JsonResponse
    {
        $this->authorizeMember($request, $group);

        $invitations = $group->invitations()
            ->with($this->invitationRelations())
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn (GroupInvitation $i) => $this->invitationPayload($i));

        return response()->json(['invitations' => $invitations]);
    }

    public function respondInvitation(Request $request, GroupInvitation $invitation): JsonResponse
    {
        $me = $request->user();

        abort_unless($invitation->invitee_id === $me->id, 403, 'Only the invited user can respond to this invitation.');

        $data = $request->validate([
            'status' => ['required', 'string', 'in:accepted,declined'],
        ]);

        DB::transaction(function () use ($invitation, $data, $me) {
            $lockedInvitation = GroupInvitation::whereKey($invitation->id)->lockForUpdate()->firstOrFail();
            if ($lockedInvitation->status !== 'pending') return;

            $group = Group::whereKey($lockedInvitation->group_id)->lockForUpdate()->firstOrFail();

            if ($data['status'] === 'accepted') {
                if (! $group->members()->where('user_id', $me->id)->exists()) {
                    $group->members()->attach($me->id);
                    $this->votes->reconcileMembership($group);

                    // Broadcast join to all group members via SSE
                    \App\Services\SseBroadcaster::broadcast($me->id, 'member_joined', [
                        'groupId' => $group->id,
                        'groupName' => $group->name,
                        'userId' => $me->id,
                        'userName' => $me->name,
                    ]);
                }
            }

            $lockedInvitation->update(['status' => $data['status']]);

            $this->notify($group->owner_id, 'group_activity', $me->id, [
                'group_id' => $group->id,
                'groupName' => $group->name,
                'detail' => "{$me->name} {$data['status']} the invitation to “{$group->name}”.",
            ]);
        });

        return response()->json([
            'invitation' => $this->invitationPayload($invitation->fresh($this->invitationRelations())),
            'joined' => $data['status'] === 'accepted',
        ]);
    }

    public function addMember(Request $request, Group $group): JsonResponse
    {
        $this->authorizeMember($request, $group);

        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $userId = (int) $data['user_id'];
        $me = $request->user();

        if (! $group->has_supervisor) {
            abort(403, 'Collaborating Team Projects only accept new members via invite or join code — direct add is disabled.');
        }

        DB::transaction(function () use ($group, $me, $userId) {
            $locked = Group::whereKey($group->id)->lockForUpdate()->firstOrFail();

            abort_unless($this->canAddMembers($me, $locked), 403, 'Only the owner or supervisor can add members directly.');
            abort_if($locked->members()->where('user_id', $userId)->exists(), 409, 'That user is already a member.');

            $locked->members()->attach($userId);
            $this->votes->reconcileMembership($locked);

            $this->notify($userId, 'group_activity', $me->id, [
                'group_id' => $locked->id,
                'groupName' => $locked->name,
                'detail' => "You were added to “{$locked->name}”.",
            ]);

            // Broadcast new member to all group members
            \App\Services\SseBroadcaster::broadcast((int) $userId, 'member_joined', [
                'groupId' => $locked->id,
                'groupName' => $locked->name,
                'userId' => $userId,
                'userName' => $me->id === $userId ? $me->name : User::findOrFail($userId)->name,
            ]);
        });

        return response()->json(['group' => $this->payload($group->fresh($this->groupRelations()), $me->id)]);
    }

    public function removeMember(Request $request, Group $group, User $user): JsonResponse
    {
        $me = $request->user();

        DB::transaction(function () use ($group, $user, $me) {
            $locked = Group::whereKey($group->id)->lockForUpdate()->firstOrFail();

            abort_unless($this->access->isMember($locked, $me), 403, 'You are not a member of this group.');
            abort_unless($locked->members()->where('user_id', $user->id)->exists(), 422, 'That user is not a member of this group.');
            abort_unless($this->canRemoveMember($me, $locked, $user), 403, 'You are not authorised to remove this member.');

            $wasSupervisor = (bool) $locked->has_supervisor && (int) $locked->supervisor_id === (int) $user->id;

            $locked->members()->detach($user->id);

            if ($wasSupervisor) {
                $locked->update(['supervisor_id' => null, 'has_supervisor' => false]);
            }

            $this->votes->reconcileMembership($locked);

            $this->notify($user->id, 'group_activity', $me->id, [
                'group_id' => $locked->id,
                'groupName' => $locked->name,
                'detail' => "You were removed from “{$locked->name}”.",
            ]);

            // Broadcast removal to all remaining members
            \App\Services\SseBroadcaster::broadcast($me->id, 'member_removed', [
                'groupId' => $locked->id,
                'groupName' => $locked->name,
                'removedUserId' => $user->id,
                'removedUserName' => $user->name,
            ]);
        });

        return response()->json(['group' => $this->payload($group->fresh($this->groupRelations()), $me->id)]);
    }

    public function leave(Request $request, Group $group): JsonResponse
    {
        $me = $request->user();
        $deleted = false;

        DB::transaction(function () use ($group, $me, &$deleted) {
            $locked = Group::whereKey($group->id)->lockForUpdate()->firstOrFail();

            abort_unless($locked->members()->where('user_id', $me->id)->exists(), 409, 'You are not a member of this group.');

            if ((int) $locked->owner_id === (int) $me->id) {
                $otherMembers = $locked->members()->where('user_id', '!=', $me->id)->count();
                abort_if($otherMembers > 0, 422, 'The owner cannot leave a group while other members remain.');
                $locked->delete();
                $deleted = true;

                return;
            }

            $supervisorLeft = (bool) $locked->has_supervisor && (int) $locked->supervisor_id === (int) $me->id;

            $locked->members()->detach($me->id);

            if ($supervisorLeft) {
                $locked->update(['supervisor_id' => null, 'has_supervisor' => false]);
            }

            $this->votes->reconcileMembership($locked);

            // Broadcast leave/deletion to remaining members
            if (! $deleted) {
                \App\Services\SseBroadcaster::broadcast((int) $me->id, 'member_left', [
                    'groupId' => $locked->id,
                    'groupName' => $locked->name,
                    'leftUserId' => $me->id,
                    'leftUserName' => $me->name,
                ]);
            }
        });

        return response()->json(['message' => $deleted ? 'Group deleted' : 'Left group']);
    }

    /**
     * Edit a group project's title or assigned member.
     *
     * Collaborating groups: any member can edit, matching their ability to
     * assign. Supervised groups: owner, supervisor, or the current assignee.
     */
    public function updateProject(Request $request, GroupProject $groupProject): JsonResponse
    {
        $group = $groupProject->group;
        abort_if(! $group, 404, 'Group not found.');
        $this->authorizeMember($request, $group);

        $me = $request->user();
        $currentAssignee = $groupProject->assigned_user_id;
        $isManager = $this->access->isManager($group, $me);

        if ($group->has_supervisor) {
            $isCurrentAssignee = $currentAssignee !== null && (int) $currentAssignee === (int) $me->id;
            abort_unless(
                $isManager || $isCurrentAssignee,
                403,
                'Only the owner, supervisor, or assignee can edit this assignment.',
            );
        }

        abort_if($groupProject->status === 'completed', 422, 'Reopen the project before editing its assignment.');

        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'assigned_user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'tags' => ['sometimes', 'array'],
            'tags.*' => ['string', 'max:60'],
        ]);

        $canReassign = $this->access->canReassign($group, $me);

        if (array_key_exists('assigned_user_id', $data) && ! $canReassign
            && (int) ($data['assigned_user_id'] ?? 0) !== (int) $currentAssignee) {
            abort(403, 'Only the owner or supervisor can reassign this project.');
        }

        if (array_key_exists('assigned_user_id', $data) && $data['assigned_user_id'] !== null) {
            abort_unless(
                $group->members()->where('user_id', $data['assigned_user_id'])->exists(),
                422,
                'Assignee must be a group member.',
            );
        }

        if (array_key_exists('title', $data)) {
            $groupProject->title = $data['title'];
        }

        $newAssignee = $currentAssignee;
        if (array_key_exists('assigned_user_id', $data)) {
            $newAssignee = $data['assigned_user_id'];
            $groupProject->assigned_user_id = $newAssignee;
        }

        // Sync tags if provided
        if (array_key_exists('tags', $data) && is_array($data['tags'])) {
            $tagIds = [];
            foreach ($data['tags'] as $tagName) {
                $tag = Tag::firstOrCreate(['name' => trim($tagName)]);
                $tagIds[] = $tag->id;
            }
            $groupProject->tags()->sync(array_unique($tagIds));
        }

        $groupProject->save();

        if ($newAssignee !== null && (int) $newAssignee !== (int) $currentAssignee) {
            $this->notify((int) $newAssignee, 'assignment', $me->id, [
                'group_id' => $group->id,
                'groupProjectId' => $groupProject->id,
                'title' => $groupProject->title,
                'detail' => "{$me->name} assigned “{$groupProject->title}” to you in {$group->name}.",
            ]);

            // Broadcast reassignment via SSE
            \App\Services\SseBroadcaster::broadcast((int) $newAssignee, 'project_assigned', [
                'groupId' => $group->id,
                'groupName' => $group->name,
                'projectId' => $groupProject->id,
                'title' => $groupProject->title,
                'status' => 'approved',
            ]);
        } elseif (array_key_exists('title', $data)) {
            // Broadcast title change to all group members
            foreach ($group->members()->pluck('user_id')->toArray() as $memberId) {
                \App\Services\SseBroadcaster::broadcast((int) $memberId, 'project_updated', [
                    'groupId' => $group->id,
                    'groupName' => $group->name,
                    'projectId' => $groupProject->id,
                    'title' => $groupProject->title,
                ]);
            }
        }

        return response()->json([
            'groupProject' => $groupProject->load([
                'tasks:id,group_project_id,title,completed,position',
                'votes:id,group_project_id,user_id,vote',
                'assigner:id,name',
                'assigner.profile:user_id,initials',
            ]),
        ]);
    }

    /** Legacy direct-assign alias — now permission-aware via AssignmentService. */
    public function assignProject(Request $request, Group $group): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'assigned_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        abort_if(! $data['assigned_user_id'], 422, 'assigned_user_id is required.');

        [$assignment, $project] = $this->service->create(
            $request->user(),
            $group->id,
            (int) $data['assigned_user_id'],
            $data['title'],
        );

        // Broadcast assignment event via SSE
        \App\Services\SseBroadcaster::broadcast((int) $data['assigned_user_id'], 'project_assigned', [
            'groupId' => $group->id,
            'groupName' => $group->name,
            'projectId' => $project?->id,
            'title' => $data['title'],
            'status' => $assignment->status,
        ]);

        return response()->json([
            'assignment' => [
                'id' => $assignment->id,
                'groupId' => $assignment->group_id,
                'title' => $assignment->title,
                'status' => $assignment->status,
                'rejectedReason' => $assignment->rejected_reason,
            ],
            'project' => $project ? ['id' => $project->id, 'title' => $project->title, 'status' => $project->status, 'progress' => $project->progress] : null,
        ], 201);
    }

    private function canAddMembers(User $me, Group $group): bool
    {
        return $this->access->isManager($group, $me);
    }

    private function canRemoveMember(User $me, Group $group, User $user): bool
    {
        $meId = (int) $me->id;
        $targetId = (int) $user->id;

        if ($targetId === (int) $group->owner_id) {
            return false; // owner can never be removed
        }

        if ($targetId === $meId) {
            return false; // use Leave group to remove yourself
        }

        if (! $this->access->isMember($group, $me)) {
            return false;
        }

        if ((bool) $group->has_supervisor && (int) $group->supervisor_id === $targetId) {
            return (int) $group->owner_id === $meId; // only the owner removes a supervisor
        }

        return $this->access->isManager($group, $me);
    }

    private function newJoinCode(): string
    {
        do {
            $code = strtoupper(substr(bin2hex(random_bytes(4)), 0, 4)).'-'.strtoupper(substr(bin2hex(random_bytes(2)), 0, 2));
        } while (Group::where('join_code', $code)->exists());

        return $code;
    }

    private function uniqueIds(array $ids): array
    {
        return array_values(array_unique(array_filter($ids)));
    }

    /** @return array<int, string> */
    private function groupRelations(): array
    {
        return [
            'members:id,name',
            'members.profile:user_id,initials',
            'supervisor:id,name',
            'supervisor.profile:user_id,initials',
            'projects:id,group_id,assigned_user_id,title,status,progress,vote_status,vote_initiator_id',
            'projects.tags:id,name',
            'projects.tasks:id,group_project_id,title,completed,position',
            'projects.votes:id,group_project_id,user_id,vote',
            'projects.assigned:id,name',
            'projects.assigned.profile:user_id,initials',
        ];
    }

    /** @return array<int, string> */
    private function invitationRelations(): array
    {
        return [
            'group:id,name',
            'inviter:id,name',
            'inviter.profile:user_id,initials',
            'invitee:id,name',
            'invitee.profile:user_id,initials',
        ];
    }

    private function payload(Group $group, int $currentUserId, bool $includeArchived = false): array
    {
        $groupType = $group->has_supervisor ? 'supervised' : 'collaborating';
        $groupTypeLabel = $group->has_supervisor ? 'Supervised Projects' : 'Collaborating Team Projects';
        // Exclude archived projects by default; include only when explicitly requested.
        // Re-eager-load tasks for archived projects so taskCounts stays single-query.
        $projects = $includeArchived
            ? $group->projects()->withTrashed()->with('tasks:id,group_project_id,title,completed,position')->get()
            : $group->projects;
        return [
            'id' => $group->id,
            'name' => $group->name,
            'hasSupervisor' => $group->has_supervisor,
            'supervisorId' => $group->supervisor_id,
            'groupType' => $groupType,
            'groupTypeLabel' => $groupTypeLabel,
            'supervisor' => $group->relationLoaded('supervisor') && $group->supervisor ? [
                'id' => $group->supervisor->id,
                'name' => $group->supervisor->name,
                'initials' => $group->supervisor->initials(),
            ] : null,
            'isOwner' => (int) $group->owner_id === (int) $currentUserId,
            'isSupervisor' => $this->access->isSupervisor($group, $currentUserId),
            'joinCode' => $group->hasActiveJoinCode() ? $group->join_code : null,
            'members' => $group->members->map(fn (User $m) => [
                'id' => $m->id,
                'name' => $m->name,
                'initials' => $m->initials(),
                'role' => $this->memberRole($group, $m),
            ]),
            'projects' => $projects->map(function (GroupProject $p) use ($group) {
                $assignerInitials = $p->assigned?->initials();
                $assignerName = $p->assigned?->name;
                $assignerId = $p->assigned_user_id;
                $votes = $p->relationLoaded('votes') ? $p->votes : $p->votes()->get();
                $voteCounts = [
                    'total' => $votes->count(),
                    'approved' => $votes->where('vote', 'approved')->count(),
                    'pending' => $votes->where('vote', 'pending')->count(),
                    'rejected' => $votes->where('vote', 'rejected')->count(),
                ];
                $memberIds = $group->members->pluck('id')->map(fn ($id) => (int) $id)->unique();
                $approvedIds = $votes->where('vote', 'approved')
                    ->pluck('user_id')
                    ->map(fn ($id) => (int) $id)
                    ->unique();
                $isUnanimous = $memberIds->isNotEmpty()
                    && $memberIds->every(fn (int $id) => $approvedIds->contains($id));
                return [
                    'id' => $p->id,
                    'title' => $p->title,
                    'status' => $p->status,
                    'progress' => $p->progress,
                    'tag' => $p->tag ?? $p->tags->pluck('name')->join(', '),
                    'tags' => $p->tags->map(fn ($t) => ['id' => $t->id, 'name' => $t->name])->values(),
                    'assigner' => $assignerInitials,
                    'assignerName' => $assignerName,
                    'assignerId' => $assignerId,
                    // deprecated aliases for transition
                    'assignee' => $assignerInitials,
                    'assigneeName' => $assignerName,
                    'assigneeId' => $assignerId,
                    'groupId' => $p->group_id,
                    'voteStatus' => $p->vote_status ?? 'none',
                    'voteInitiatorId' => $p->vote_initiator_id,
                    'votes' => $votes->map(fn ($v) => ['id' => $v->id, 'userId' => $v->user_id, 'vote' => $v->vote])->values(),
                    'voteCounts' => $voteCounts,
                    'isVoteUnanimous' => $isUnanimous,
                    'tasks' => $p->tasks->map(fn ($t) => ['id' => $t->id, 'title' => $t->title, 'completed' => (bool) $t->completed, 'position' => $t->position])->values(),
                     'taskCounts' => ['total' => ($p->relationLoaded('tasks') ? $p->tasks->count() : $p->tasks()->count()), 'completed' => ($p->relationLoaded('tasks') ? $p->tasks->where('completed', true)->count() : $p->tasks()->where('completed', true)->count())],
                ];
            }),
        ];
    }

    /** Archive a group project (soft-delete). Owner/supervisor only; completed projects only. */
    public function archiveProject(Request $request, GroupProject $groupProject): JsonResponse
    {
        $group = $groupProject->group;
        abort_if(! $group, 404, 'Group not found.');
        $this->authorizeMember($request, $group);

        abort_unless($groupProject->status === 'completed', 422, 'Only completed projects can be archived.');
        abort_unless($this->access->isManager($group, $request->user()), 403, 'Only the owner or supervisor can archive.');
        abort_if($groupProject->trashed(), 400, 'Project is already archived.');

        $groupProject->delete();

        return response()->json(['message' => 'Archived']);
    }

    /** Restore an archived group project. Owner/supervisor only. */
    public function restoreProject(Request $request, GroupProject $groupProject): JsonResponse
    {
        $group = $groupProject->group;
        abort_if(! $group, 404, 'Group not found.');
        $this->authorizeMember($request, $group);

        abort_unless($groupProject->trashed(), 400, 'Project is not archived.');
        abort_unless($this->access->isManager($group, $request->user()), 403, 'Only the owner or supervisor can restore.');

        $groupProject->restore();
        $groupProject->load(['tasks:id,project_id,group_project_id,title,completed,position']);
        $groupProject->recalculateProgress();

        return response()->json(['groupProject' => $groupProject]);
    }

    private function memberRole(Group $group, User $member): string
    {
        if ($group->owner_id === $member->id) {
            return 'owner';
        }

        return $group->has_supervisor && $group->supervisor_id === $member->id ? 'supervisor' : 'member';
    }

    private function invitationPayload(GroupInvitation $i): array
    {
        return [
            'id' => $i->id,
            'groupId' => $i->group_id,
            'groupName' => $i->group?->name,
            'status' => $i->status,
            'createdAt' => $i->created_at?->getTimestamp() * 1000,
            'inviter' => $i->inviter ? [
                'id' => $i->inviter->id,
                'name' => $i->inviter->name,
                'initials' => $i->inviter->initials(),
            ] : null,
            'invitee' => $i->invitee ? [
                'id' => $i->invitee->id,
                'name' => $i->invitee->name,
                'initials' => $i->invitee->initials(),
            ] : null,
        ];
    }

    private function notify(int $userId, string $type, ?int $actorId, array $payload): UserNotification
    {
        return UserNotification::create([
            'user_id' => $userId,
            'type' => $type,
            'actor_id' => $actorId,
            'payload' => $payload,
        ]);
    }

    private function authorizeMember(Request $request, Group $group): void
    {
        abort_unless(
            $this->access->isMember($group, $request->user()),
            403,
            'You are not a member of this group.',
        );
    }

    /**
     * Broadcast an SSE event to every member of $group.
     */
    private function broadcastGroupEvent(Group $group, string $type, array $extraPayload = []): void
    {
        $members = $group->members()->pluck('user_id')->map(fn (int $id) => (int) $id)->toArray();
        $payload = array_merge([
            'groupId' => $group->id,
            'groupName' => $group->name,
        ], $extraPayload);

        foreach ($members as $memberId) {
            SseBroadcaster::broadcast((int) $memberId, $type, $payload);
        }
    }
}