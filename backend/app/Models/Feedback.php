<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['sender_id', 'recipient_id', 'project_id', 'message', 'read_at'])]
#[Hidden(['sender_id', 'recipient_id', 'project_id'])]
class Feedback extends Model
{
    protected $table = 'feedbacks';

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }

    public function scopeReceivedBy(Builder $query, int $userId): Builder
    {
        return $query->where('recipient_id', $userId)
            ->with(['sender:id,name', 'sender.profile:user_id,initials', 'project:id,title'])
            ->orderByDesc('id')
            ->limit(50);
    }
}
