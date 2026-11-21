<?php

namespace App\Services;

use App\Models\Assignment;
use App\Models\Group;
use App\Models\GroupProject;
use App\Models\Project;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Permission-aware project/note assignment.
 *
 * The recipient's `UserPermission.project_assignment` value is authoritative:
 *   allow    -> assigned immediately (approved)
 *   request  -> a pending request the recipient can approve/decline
 *   decline  -> rejected up front, never silently assigned
 *
 * Group self-assignment is the exception: a member can claim a project for
 * themselves and it is always approved, regardless of that permission.
 */
class AssignmentService
{
    public function __construct(private readonly GroupAccess $access)
    {
    }

    public function create(User $requester, ?int $groupId, int $recipientId, string $title): array
    {
        $isSelf = (int) $requester->id === (int) $recipientId;

        // Personal self-assignment is still invalid. Group members may claim a
        // project for themselves; it is created immediately, even when their
        // project_assignment permission is "request".
        if ($isSelf && $groupId === null) {
            abort(422, 'You cannot assign a personal project to yourself.');
        }

        $recipient = User::findOrFail($recipientId);

        if ($groupId !== null) {
            $group = Group::findOrFail($groupId);
            abort_unless(
                $this->access->isMember($group, $requester),
                403,
                'You are not a member of this group.',
            );
            abort_unless(
                $this->access->isMember($group, $recipientId),
                422,
                'Assignee must be a group member.',
            );
            // Supervised groups: owner/supervisor can assign anyone. Other
            // members can only claim projects for themselves.
            if ($group->has_supervisor && ! $isSelf) {
                abort_unless($this->access->isManager($group, $requester), 403, 'Only the owner or supervisor can assign projects to other members in Supervised Projects.');
            }
        }

        $permission = $recipient->permissions?->project_assignment ?? 'request';

        $status = $isSelf ? 'approved' : match ($permission) {
            'allow' => 'approved',
            'decline' => 'declined',
            default => 'pending',
        };

        $assignment = Assignment::create([
            'group_id' => $groupId,
            'requester_id' => $requester->id,
            'recipient_id' => $recipientId,
            'title' => $title,
            'status' => $status,
            'rejected_reason' => $status === 'declined' ? 'permission' : null,
        ]);

        $project = null;

        if ($status === 'approved') {
            $project = $this->approve($assignment);
            if (! $isSelf) {
                $this->notify($recipientId, 'assignment', $requester->id, [
                    'assignment_id' => $assignment->id,
                    'group_id' => $groupId,
                    'title' => $title,
                    'detail' => "{$requester->name} assigned “{$title}” to you.",
                ]);
            }
        } elseif ($status === 'pending') {
            $this->notify($recipientId, 'assignment', $requester->id, [
                'assignment_id' => $assignment->id,
                'group_id' => $groupId,
                'title' => $title,
                'detail' => "{$requester->name} requested to assign “{$title}” to you.",
            ]);
        } else {
            $this->notify($requester->id, 'assignment', $recipientId, [
                'assignment_id' => $assignment->id,
                'group_id' => $groupId,
                'title' => $title,
                'detail' => "Your assignment request “{$title}” was declined.",
            ]);
        }

        return [$assignment, $project];
    }

    public function approve(Assignment $assignment): Model
    {
        return DB::transaction(function () use ($assignment) {
            $locked = Assignment::whereKey($assignment->id)->lockForUpdate()->firstOrFail();

            $project = $locked->group_id
                ? GroupProject::create([
                    'group_id' => $locked->group_id,
                    'assigned_user_id' => $locked->recipient_id,
                    'title' => $locked->title,
                    'status' => 'wait',
                    'progress' => 0,
                ])
                : Project::create([
                    'user_id' => $locked->recipient_id,
                    'title' => $locked->title,
                    'status' => 'wait',
                    'progress' => 0,
                    'due' => null,
                    'tag' => 'General',
                ]);

            if ((int) $locked->requester_id !== (int) $locked->recipient_id) {
                $this->notify($locked->requester_id, 'assignment', $locked->recipient_id, [
                    'assignment_id' => $locked->id,
                    'group_id' => $locked->group_id,
                    'title' => $locked->title,
                    'detail' => "“{$locked->title}” was assigned to {$locked->recipient->name}.",
                ]);
            }

            return $project;
        });
    }

    public function notify(int $userId, string $type, ?int $actorId, array $payload): UserNotification
    {
        return UserNotification::create([
            'user_id' => $userId,
            'type' => $type,
            'actor_id' => $actorId,
            'payload' => $payload,
        ]);
    }
}