<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['group_project_id', 'user_id', 'vote', 'reason'])]
class GroupProjectCompletionVote extends Model
{
    protected $table = 'group_project_completion_votes';

    public function groupProject(): BelongsTo
    {
        return $this->belongsTo(GroupProject::class, 'group_project_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected function casts(): array
    {
        return [
            'group_project_id' => 'integer',
            'user_id' => 'integer',
        ];
    }
}
