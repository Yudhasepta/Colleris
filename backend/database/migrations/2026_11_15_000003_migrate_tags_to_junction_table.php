<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Driver-specific dialect: MySQL `INSERT IGNORE` + `NOW()` vs SQLite
        // `INSERT OR IGNORE` + `datetime('now')` (tests run on in-memory SQLite).
        $isSqlite = \DB::getDriverName() === 'sqlite';
        $ignore = $isSqlite ? 'OR IGNORE' : 'IGNORE';
        $now = $isSqlite ? "datetime('now')" : 'NOW()';

        // Tags may already exist from seed data — insert only what's missing.
        \DB::statement("
            INSERT {$ignore} INTO tags (name, created_at, updated_at)
            SELECT DISTINCT tag, {$now}, {$now}
            FROM projects
            WHERE tag IS NOT NULL AND tag != ''
              AND tag NOT IN (SELECT name FROM tags)
        ");

        // Migrate existing single-tag projects into the junction table (no timestamps on pivot).
        \DB::statement("
            INSERT {$ignore} INTO project_tags (project_id, tag_id)
            SELECT p.id, t.id
            FROM projects p
            JOIN tags t ON t.name = p.tag
            WHERE p.tag IS NOT NULL AND p.tag != ''
              AND NOT EXISTS (SELECT 1 FROM project_tags pt WHERE pt.project_id = p.id AND pt.tag_id = t.id)
        ");

        // Add nullable fallback column to group_projects for display convenience.
        if (!Schema::hasColumn('group_projects', 'tag')) {
            Schema::table('group_projects', function (Blueprint $table) {
                $table->string('tag')->nullable()->after('title');
            });
        }
    }

    public function down(): void
    {
        Schema::table('group_projects', function (Blueprint $table) {
            $table->dropColumn('tag');
        });

        \DB::table('group_project_tags')->truncate();
        \DB::table('project_tags')->truncate();
        \DB::table('tags')->truncate();
    }
};
