<?php

namespace App\Services;

use App\Models\Group;
use App\Models\GroupProject;
use App\Models\GroupProjectCompletionVote;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Support\Facades\DB;

/**
 * Unanimous completion votes for collaborating group projects.
 *
 * All state changes are transactional and lock the group + project rows so a
 * concurrent join/leave or a second approval cannot leave the vote in a state
 * that can never be finalised. Task completion calls maybeFinalize(), which
 * closes the old deadlock where everyone approved before the work was done.
 */
class GroupProjectVoteService
{
    public function start(GroupProject $groupProject, User $initiator): GroupProject
    {
        return DB::transaction(function () use ($groupProject, $initiator) {
            $project = $this->lockProject($groupProject);
            $group = $project->group;

            $this->ensureMember($group, $initiator);
            abort_if((bool) $group->has_supervisor, 403, 'Supervised Projects do not use voting — supervisor completes directly.');
            abort_if($project->status === 'completed', 422, 'Project already completed.');
            abort_if(($project->vote_status ?? 'none') === 'pending', 422, 'A completion vote is already pending.');
            abort_if($project->tasks()->count() === 0, 422, 'Add tasks before requesting completion.');

            $project->update([
                'vote_status' => 'pending',
                'vote_initiator_id' => $initiator->id,
            ]);

            $memberIds = $this->memberIds($group);

            foreach ($memberIds as $memberId) {
                GroupProjectCompletionVote::updateOrCreate(
                    ['group_project_id' => $project->id, 'user_id' => $memberId],
                    [
                        'vote' => $memberId === (int) $initiator->id ? 'approved' : 'pending',
                        'reason' => null,
                    ],
                );
            }

            foreach ($memberIds as $memberId) {
                if ($memberId === (int) $initiator->id) continue;

                $this->notify($memberId, 'completion_vote_requested', $initiator->id, [
                    'group_id' => $group->id,
                    'groupProjectId' => $project->id,
                    'title' => $project->title,
                    'groupName' => $group->name,
                    'detail' => "{$initiator->name} requested completion for “{$project->title}” — your approval is needed (unanimous). Tasks remain editable so you can catch up.",
                    'initiatorId' => $initiator->id,
                ]);
            }

            return $this->freshPayload($project);
        });
    }

    /** @return array{0: GroupProject, 1: string} */
    public function cast(GroupProject $groupProject, User $voter, bool $approve, ?string $reason): array
    {
        return DB::transaction(function () use ($groupProject, $voter, $approve, $reason) {
            $project = $this->lockProject($groupProject);
            $group = $project->group;

            $this->ensureMember($group, $voter);
            abort_if((bool) $group->has_supervisor, 403, 'Supervised Projects do not use voting.');
            abort_unless(($project->vote_status ?? 'none') === 'pending', 422, 'No completion vote is pending for this project.');

            GroupProjectCompletionVote::updateOrCreate(
                ['group_project_id' => $project->id, 'user_id' => $voter->id],
                [
                    'vote' => $approve ? 'approved' : 'rejected',
                    'reason' => $reason,
                ],
            );

            if (! $approve) {
                $project->update(['vote_status' => 'none', 'vote_initiator_id' => null]);

                foreach ($this->memberIds($group) as $memberId) {
                    $this->notify($memberId, 'completion_vote_rejected', $voter->id, [
                        'group_id' => $group->id,
                        'groupProjectId' => $project->id,
                        'title' => $project->title,
                        'groupName' => $group->name,
                        'reason' => $reason,
                        'detail' => "{$voter->name} rejected completion for “{$project->title}”.",
                    ]);
                }

                return [$this->freshPayload($project), 'Vote rejected — completion cancelled.'];
            }

            if ($this->isUnanimous($group, $project)) {
                if ($project->complete()) {
                    $this->finish($group, $project, $voter);

                    return [$this->freshPayload($project), 'Unanimous approval — project completed.'];
                }

                return [
                    $this->freshPayload($project),
                    'All members approved — complete the remaining tasks and the project will finalize automatically.',
                ];
            }

            $pending = $this->pendingApprovalCount($group, $project);
            $suffix = $pending === 1 ? '' : 's';

            return [
                $this->freshPayload($project),
                "Approved — awaiting {$pending} more approval{$suffix} (unanimous required).",
            ];
        });
    }

    public function finalize(GroupProject $groupProject, User $actor): GroupProject
    {
        return DB::transaction(function () use ($groupProject, $actor) {
            $project = $this->lockProject($groupProject);
            $group = $project->group;

            $this->ensureMember($group, $actor);
            abort_if((bool) $group->has_supervisor, 403, 'Supervised Projects do not use voting.');
            abort_unless(($project->vote_status ?? 'none') === 'pending', 422, 'No completion vote is pending for this project.');
            abort_unless($this->isUnanimous($group, $project), 422, 'All members must approve before finalizing.');
            abort_unless($project->complete(), 422, 'All tasks must be completed before finalizing.');

            $this->finish($group, $project, $actor);

            return $this->freshPayload($project);
        });
    }

    public function cancel(GroupProject $groupProject, User $actor): GroupProject
    {
        return DB::transaction(function () use ($groupProject, $actor) {
            $project = $this->lockProject($groupProject);
            $group = $project->group;

            $this->ensureMember($group, $actor);
            abort_unless(($project->vote_status ?? 'none') === 'pending', 422, 'No pending vote to cancel.');
            abort_unless(
                (int) $project->vote_initiator_id === (int) $actor->id || (int) $group->owner_id === (int) $actor->id,
                403,
                'Only the vote initiator or group owner can cancel.',
            );

            $project->update(['vote_status' => 'none', 'vote_initiator_id' => null]);
            GroupProjectCompletionVote::where('group_project_id', $project->id)->delete();

            foreach ($this->memberIds($group) as $memberId) {
                $this->notify($memberId, 'completion_vote_cancelled', $actor->id, [
                    'group_id' => $group->id,
                    'groupProjectId' => $project->id,
                    'title' => $project->title,
                    'groupName' => $group->name,
                    'detail' => "Completion vote for “{$project->title}” was cancelled by {$actor->name}.",
                ]);
            }

            return $this->freshPayload($project);
        });
    }

    /**
     * Finalize automatically when the last task is completed after everyone
     * has already approved. Returns true when the project was completed.
     */
    public function maybeFinalize(GroupProject $groupProject, ?User $actor = null): bool
    {
        if (($groupProject->vote_status ?? 'none') !== 'pending') {
            return false;
        }

        return DB::transaction(function () use ($groupProject, $actor) {
            $project = $this->lockProject($groupProject);

            if (($project->vote_status ?? 'none') !== 'pending') return false;

            $group = $project->group;
            if ($group->has_supervisor) return false;
            if (! $this->isUnanimous($group, $project)) return false;
            if (! $project->complete()) return false;

            $this->finish($group, $project, $actor);

            return true;
        });
    }

    /**
     * A pending vote is bound to the member set that existed when it started.
     * Any membership change resets it so stale rows cannot block a future vote.
     */
    public function reconcileMembership(Group $group): void
    {
        DB::transaction(function () use ($group) {
            $lockedGroup = Group::whereKey($group->id)->lockForUpdate()->first();
            if (! $lockedGroup) return;

            $projects = GroupProject::query()
                ->where('group_id', $lockedGroup->id)
                ->where('vote_status', 'pending')
                ->lockForUpdate()
                ->get();

            if ($projects->isEmpty()) return;

            $memberIds = $this->memberIds($lockedGroup);

            foreach ($projects as $project) {
                $project->update(['vote_status' => 'none', 'vote_initiator_id' => null]);
                GroupProjectCompletionVote::where('group_project_id', $project->id)->delete();

                foreach ($memberIds as $memberId) {
                    $this->notify($memberId, 'completion_vote_cancelled', null, [
                        'group_id' => $lockedGroup->id,
                        'groupProjectId' => $project->id,
                        'title' => $project->title,
                        'groupName' => $lockedGroup->name,
                        'detail' => "Completion vote for “{$project->title}” was reset because group membership changed.",
                    ]);
                }
            }
        });
    }

    private function finish(Group $group, GroupProject $project, ?User $actor): void
    {
        $project->update(['vote_status' => 'none', 'vote_initiator_id' => null]);
        GroupProjectCompletionVote::where('group_project_id', $project->id)->delete();

        foreach ($this->memberIds($group) as $memberId) {
            $this->notify($memberId, 'completion_vote_approved', $actor?->id, [
                'group_id' => $group->id,
                'groupProjectId' => $project->id,
                'title' => $project->title,
                'groupName' => $group->name,
                'detail' => "“{$project->title}” was unanimously approved and marked complete.",
            ]);
        }
    }

    private function lockProject(GroupProject $groupProject): GroupProject
    {
        $group = Group::whereKey($groupProject->group_id)->lockForUpdate()->firstOrFail();
        $project = GroupProject::whereKey($groupProject->id)->lockForUpdate()->firstOrFail();
        $project->setRelation('group', $group);

        return $project;
    }

    private function ensureMember(Group $group, User $user): void
    {
        abort_unless(
            $group->members()->where('user_id', $user->id)->exists(),
            403,
            'You are not a member of this group.',
        );
    }

    /** @return array<int, int> */
    private function memberIds(Group $group): array
    {
        return $group->members()
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    private function isUnanimous(Group $group, GroupProject $project): bool
    {
        $memberIds = $this->memberIds($group);
        if (empty($memberIds)) return false;

        $approved = GroupProjectCompletionVote::query()
            ->where('group_project_id', $project->id)
            ->whereIn('user_id', $memberIds)
            ->where('vote', 'approved')
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->unique();

        return $approved->count() === count($memberIds);
    }

    private function pendingApprovalCount(Group $group, GroupProject $project): int
    {
        $memberIds = $this->memberIds($group);

        $approved = GroupProjectCompletionVote::query()
            ->where('group_project_id', $project->id)
            ->whereIn('user_id', $memberIds)
            ->where('vote', 'approved')
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->count();

        return max(0, count($memberIds) - $approved);
    }

    private function freshPayload(GroupProject $project): GroupProject
    {
        return $project->fresh([
            'tasks:id,project_id,group_project_id,title,completed,position',
            'votes:id,group_project_id,user_id,vote',
        ]);
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
}
