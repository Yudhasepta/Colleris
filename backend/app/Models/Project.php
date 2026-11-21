<?php

namespace App\Models;

use App\Models\Concerns\DerivesTaskProgress;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['user_id', 'title', 'status', 'progress', 'due', 'guide_text'])]
#[Hidden(['deleted_at'])]
class Project extends Model
{
    use DerivesTaskProgress;
    use SoftDeletes;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(ProjectTask::class)->orderBy('position')->orderBy('id');
    }

    public function tags(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'project_tags');
    }

    /** Backward-compat: returns comma-joined tag names for legacy consumers. */
    public function getTagAttribute(): string
    {
        return $this->tags->pluck('name')->join(', ');
    }

    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    public function statusDragGuess(int $value): void
    {
        if ($value >= 100) {
            $this->status = 'completed';
        } elseif ($value > 0 && $this->status === 'wait') {
            $this->status = 'progress';
        }
    }

    /** Recompute status from a raw progress drag, mirroring the frontend logic. */
    public function setProgress(int $value): void
    {
        // If tasks exist, ignore client-supplied progress (derived data)
        if ($this->hasTasks()) {
            $this->recalculateProgress();
            return;
        }
        $status = $this->status;
        if ($value >= 100) {
            $status = 'completed';
        } elseif ($value > 0 && $status === 'wait') {
            $status = 'progress';
        }

        $this->progress = $value;
        $this->status = $status;
        $this->save();
    }

    protected function casts(): array
    {
        return [
            'progress' => 'integer',
            'deleted_at' => 'datetime',
        ];
    }
}
