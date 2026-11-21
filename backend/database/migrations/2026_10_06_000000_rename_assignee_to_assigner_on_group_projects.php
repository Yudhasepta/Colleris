<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            if (Schema::hasColumn('group_projects', 'assignee_user_id') && ! Schema::hasColumn('group_projects', 'assigner_user_id')) {
                DB::statement('ALTER TABLE "group_projects" RENAME COLUMN "assignee_user_id" TO "assigner_user_id"');
            }

            return;
        }

        // Check if old column exists and new does not — idempotent
        if (Schema::hasColumn('group_projects', 'assignee_user_id') && ! Schema::hasColumn('group_projects', 'assigner_user_id')) {
            // Drop FK if exists
            try {
                DB::statement('ALTER TABLE `group_projects` DROP FOREIGN KEY `group_projects_assignee_user_id_foreign`');
            } catch (\Throwable $e) {
                // FK may not exist on some envs, ignore
            }

            // Rename column via CHANGE (preserves type)
            DB::statement('ALTER TABLE `group_projects` CHANGE `assignee_user_id` `assigner_user_id` BIGINT UNSIGNED NULL');

            // Re-add FK with new name
            try {
                DB::statement('ALTER TABLE `group_projects` ADD CONSTRAINT `group_projects_assigner_user_id_foreign` FOREIGN KEY (`assigner_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL');
            } catch (\Throwable $e) {
                // ignore if already exists
            }
        }
        // Ensure FK exists even if column already renamed (fresh DB)
        if (Schema::hasColumn('group_projects', 'assigner_user_id')) {
            $hasFk = collect(DB::select("SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_projects' AND COLUMN_NAME = 'assigner_user_id' AND REFERENCED_TABLE_NAME IS NOT NULL"))->isNotEmpty();
            if (! $hasFk) {
                try {
                    DB::statement('ALTER TABLE `group_projects` ADD CONSTRAINT `group_projects_assigner_user_id_foreign` FOREIGN KEY (`assigner_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL');
                } catch (\Throwable $e) {
                }
            }
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            if (Schema::hasColumn('group_projects', 'assigner_user_id') && ! Schema::hasColumn('group_projects', 'assignee_user_id')) {
                DB::statement('ALTER TABLE "group_projects" RENAME COLUMN "assigner_user_id" TO "assignee_user_id"');
            }

            return;
        }

        if (Schema::hasColumn('group_projects', 'assigner_user_id') && ! Schema::hasColumn('group_projects', 'assignee_user_id')) {
            try {
                DB::statement('ALTER TABLE `group_projects` DROP FOREIGN KEY `group_projects_assigner_user_id_foreign`');
            } catch (\Throwable $e) {
            }
            DB::statement('ALTER TABLE `group_projects` CHANGE `assigner_user_id` `assignee_user_id` BIGINT UNSIGNED NULL');
            try {
                DB::statement('ALTER TABLE `group_projects` ADD CONSTRAINT `group_projects_assignee_user_id_foreign` FOREIGN KEY (`assignee_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL');
            } catch (\Throwable $e) {
            }
        }
    }
};
