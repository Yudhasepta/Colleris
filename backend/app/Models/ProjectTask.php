<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['project_id', 'group_project_id', 'title', 'completed', 'position'])]
class ProjectTask extends Model
{
    protected $table = 'project_tasks';

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function groupProject(): BelongsTo
    {
        return $this->belongsTo(GroupProject::class, 'group_project_id');
    }

    protected function casts(): array
    {
        return [
            'completed' => 'boolean',
            'position' => 'integer',
        ];
    }
}
