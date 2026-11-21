<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            // Covers "where user_id = ? order by id desc" used by the Main page.
            $table->index(['user_id', 'id'], 'projects_user_id_id_index');
        });

        Schema::table('project_tasks', function (Blueprint $table) {
            // Covers ordered task lists for personal and group projects.
            $table->index(['project_id', 'position', 'id'], 'project_tasks_project_order_index');
            $table->index(['group_project_id', 'position', 'id'], 'project_tasks_group_order_index');
        });

        Schema::table('profiles', function (Blueprint $table) {
            // Supports directory lookups. Leading-wildcard searches still cannot use these,
            // but exact/prefix searches and future query changes can.
            $table->index('handle', 'profiles_handle_index');
            $table->index('profile_code', 'profiles_profile_code_index');
        });

        Schema::table('assignments', function (Blueprint $table) {
            // Covers received/sent assignment feeds ordered by newest id.
            $table->index(['recipient_id', 'id'], 'assignments_recipient_id_id_index');
            $table->index(['requester_id', 'id'], 'assignments_requester_id_id_index');
        });

        Schema::table('reminders', function (Blueprint $table) {
            // Covers the received-reminder feed ordered by newest id.
            $table->index(['recipient_id', 'id'], 'reminders_recipient_id_id_index');
        });

        Schema::table('user_notifications', function (Blueprint $table) {
            // Covers the notification feed; the existing (user_id, read_at) index
            // continues to serve unread counts.
            $table->index(['user_id', 'id'], 'user_notifications_user_id_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('user_notifications', function (Blueprint $table) {
            $table->dropIndex('user_notifications_user_id_id_index');
        });

        Schema::table('reminders', function (Blueprint $table) {
            $table->dropIndex('reminders_recipient_id_id_index');
        });

        Schema::table('assignments', function (Blueprint $table) {
            $table->dropIndex('assignments_recipient_id_id_index');
            $table->dropIndex('assignments_requester_id_id_index');
        });

        Schema::table('profiles', function (Blueprint $table) {
            $table->dropIndex('profiles_handle_index');
            $table->dropIndex('profiles_profile_code_index');
        });

        Schema::table('project_tasks', function (Blueprint $table) {
            $table->dropIndex('project_tasks_project_order_index');
            $table->dropIndex('project_tasks_group_order_index');
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->dropIndex('projects_user_id_id_index');
        });
    }
};
