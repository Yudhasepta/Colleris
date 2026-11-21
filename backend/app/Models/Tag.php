<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name'])]
class Tag extends Model
{
    protected $casts = [
        'id' => 'integer',
    ];

    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_tags');
    }

    public function groupProjects(): BelongsToMany
    {
        return $this->belongsToMany(GroupProject::class, 'group_project_tags');
    }
}
