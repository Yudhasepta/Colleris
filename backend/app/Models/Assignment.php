<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['group_id', 'requester_id', 'recipient_id', 'title', 'status', 'rejected_reason', 'read_at'])]
class Assignment extends Model
{
    protected $table = 'assignments';

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }
}