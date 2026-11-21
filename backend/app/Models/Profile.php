<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'handle', 'initials', 'profile_code', 'profile_code_expires_at', 'visibility', 'connections_count'])]
class Profile extends Model
{
    protected function casts(): array
    {
        return [
            'profile_code_expires_at' => 'datetime',
            'connections_count' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function hasActiveCode(): bool
    {
        return $this->profile_code !== null && $this->profile_code_expires_at?->isFuture();
    }
}