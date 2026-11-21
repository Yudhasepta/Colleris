<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['type', 'message', 'detail', 'user_id'])]
class AdminLog extends Model
{
    protected $table = 'admin_logs';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}