<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Rename group_projects.assigner_user_id → assigned_user_id.
     *
     * The previous migration (2026_10_06) renamed assignee→assigner for clarity;
     * this migration corrects the name since the column stores the recipient
     * (assigned member), not the person doing the assigning.
     *
     * Idempotent: only runs when assigner_user_id exists and assigned_user_id
     * does not. Down reverts cleanly.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            if (Schema::hasColumn('group_projects', 'assigner_user_id') && ! Schema::hasColumn('group_projects', 'assigned_user_id')) {
                DB::statement('ALTER TABLE "group_projects" RENAME COLUMN "assigner_user_id" TO "assigned_user_id"');
            }

            return;
        }

        if (Schema::hasColumn('group_projects', 'assigner_user_id') && ! Schema::hasColumn('group_projects', 'assigned_user_id')) {
            try {
                DB::statement('ALTER TABLE `group_projects` DROP FOREIGN KEY `group_projects_assigner_user_id_foreign`');
            } catch (\Throwable $e) {
                // FK may not exist on some envs, ignore
            }

            DB::statement('ALTER TABLE `group_projects` CHANGE `assigner_user_id` `assigned_user_id` BIGINT UNSIGNED NULL');

            try {
                DB::statement('ALTER TABLE `group_projects` ADD CONSTRAINT `group_projects_assigned_user_id_foreign` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL');
            } catch (\Throwable $e) {
                // ignore if already exists
            }
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            if (Schema::hasColumn('group_projects', 'assigned_user_id') && ! Schema::hasColumn('group_projects', 'assigner_user_id')) {
                DB::statement('ALTER TABLE "group_projects" RENAME COLUMN "assigned_user_id" TO "assigner_user_id"');
            }

            return;
        }

        if (Schema::hasColumn('group_projects', 'assigned_user_id') && ! Schema::hasColumn('group_projects', 'assigner_user_id')) {
            try {
                DB::statement('ALTER TABLE `group_projects` DROP FOREIGN KEY `group_projects_assigned_user_id_foreign`');
            } catch (\Throwable $e) {
                // ignore
            }

            DB::statement('ALTER TABLE `group_projects` CHANGE `assigned_user_id` `assigner_user_id` BIGINT UNSIGNED NULL');

            try {
                DB::statement('ALTER TABLE `group_projects` ADD CONSTRAINT `group_projects_assigner_user_id_foreign` FOREIGN KEY (`assigner_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL');
            } catch (\Throwable $e) {
                // ignore
            }
        }
    }
};
