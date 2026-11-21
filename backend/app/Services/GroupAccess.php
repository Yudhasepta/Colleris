<?php

namespace App\Services;

use App\Models\Group;
use App\Models\User;

/**
 * Membership-verified group permissions.
 *
 * The supervisor id on a group is not enough: a supervisor who has been
 * removed from the member list must not keep management powers. Every check
 * here verifies current membership.
 */
class GroupAccess
{
    public function isMember(Group $group, User|int $user): bool
    {
        $userId = $this->userId($user);

        if ($group->relationLoaded('members')) {
            return $group->members->contains(fn (User $member) => (int) $member->id === $userId);
        }

        return $group->members()->where('user_id', $userId)->exists();
    }

    public function isOwner(Group $group, User|int $user): bool
    {
        return (int) $group->owner_id === $this->userId($user);
    }

    public function isSupervisor(Group $group, User|int $user): bool
    {
        $userId = $this->userId($user);

        return (bool) $group->has_supervisor
            && (int) $group->supervisor_id === $userId
            && $this->isMember($group, $userId);
    }

    public function isManager(Group $group, User|int $user): bool
    {
        return $this->isOwner($group, $user) || $this->isSupervisor($group, $user);
    }

    public function canManageTasks(Group $group, User|int $user): bool
    {
        return ! $group->has_supervisor || $this->isManager($group, $user);
    }

    public function canManageAssignment(Group $group, User|int $user, ?int $assigneeId): bool
    {
        if (! $group->has_supervisor) {
            return $this->isMember($group, $user);
        }

        return $this->isManager($group, $user)
            || ($assigneeId !== null && $assigneeId === $this->userId($user));
    }

    public function canReassign(Group $group, User|int $user): bool
    {
        return ! $group->has_supervisor || $this->isManager($group, $user);
    }

    private function userId(User|int $user): int
    {
        return $user instanceof User ? (int) $user->id : $user;
    }
}
