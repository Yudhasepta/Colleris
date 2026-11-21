<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['owner_id', 'name', 'has_supervisor', 'supervisor_id', 'join_code', 'join_code_expires_at'])]
class Group extends Model
{
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'group_members');
    }

    public function projects(): HasMany
    {
        return $this->hasMany(GroupProject::class);
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(GroupInvitation::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(Assignment::class);
    }

    public function hasActiveJoinCode(): bool
    {
        return $this->join_code !== null
            && ($this->join_code_expires_at === null || $this->join_code_expires_at->isFuture());
    }

    protected function casts(): array
    {
        return [
            'has_supervisor' => 'boolean',
            'join_code_expires_at' => 'datetime',
        ];
    }
}