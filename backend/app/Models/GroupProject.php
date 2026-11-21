<?php

namespace App\Models;

use App\Models\Concerns\DerivesTaskProgress;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['group_id', 'assigned_user_id', 'title', 'status', 'progress', 'vote_status', 'vote_initiator_id'])]
class GroupProject extends Model
{
    use DerivesTaskProgress;
    use SoftDeletes;

    protected $table = 'group_projects';

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function assigned(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    // Deprecated alias — kept for transition; delegates to assigned
    public function assigner(): BelongsTo
    {
        return $this->assigned();
    }

    // Legacy assignee alias — kept for transition
    public function assignee(): BelongsTo
    {
        return $this->assigned();
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(ProjectTask::class, 'group_project_id')->orderBy('position')->orderBy('id');
    }

    public function tags(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'group_project_tags');
    }

    /** Backward-compat accessor for legacy display code. */
    public function getTagAttribute(): string
    {
        return $this->tags->pluck('name')->join(', ');
    }

    public function votes(): HasMany
    {
        return $this->hasMany(GroupProjectCompletionVote::class, 'group_project_id');
    }

    public function voteInitiator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'vote_initiator_id');
    }

    public function isSupervised(): bool
    {
        return (bool) ($this->group?->has_supervisor ?? false);
    }

    public function isVotePending(): bool
    {
        return ($this->vote_status ?? 'none') === 'pending';
    }

    public function isVoteUnanimous(): bool
    {
        if (! $this->group) return false;

        $memberIds = $this->group->members()
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        if (empty($memberIds)) return false;

        $approvedIds = $this->votes()
            ->where('vote', 'approved')
            ->whereIn('user_id', $memberIds)
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->unique();

        return $approvedIds->count() === count($memberIds);
    }

    public function hasMemberVoted(int $userId): bool
    {
        return $this->votes()->where('user_id', $userId)->exists();
    }

    protected function casts(): array
    {
        return [
            'progress' => 'integer',
        ];
    }
}