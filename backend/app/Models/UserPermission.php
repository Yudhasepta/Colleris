<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'project_assignment', 'guide_upload', 'feedback'])]
class UserPermission extends Model
{
    protected $table = 'user_permissions';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}