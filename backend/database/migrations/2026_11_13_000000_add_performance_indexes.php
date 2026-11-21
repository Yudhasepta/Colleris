<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Add composite indexes used by the group list and notification feed queries. */
    public function up(): void
    {
        Schema::table('group_projects', function (Blueprint $table) {
            if (! Schema::hasIndex('group_projects', 'idx_gp_group_status')) {
                $table->index(['group_id', 'status'], 'idx_gp_group_status');
            }
        });

        Schema::table('user_notifications', function (Blueprint $table) {
            if (! Schema::hasIndex('user_notifications', 'idx_un_user_type_read')) {
                $table->index(['user_id', 'type', 'read_at'], 'idx_un_user_type_read');
            }
        });
    }

    public function down(): void
    {
        Schema::table('group_projects', function (Blueprint $table) {
            $table->dropIndex('idx_gp_group_status');
        });

        Schema::table('user_notifications', function (Blueprint $table) {
            $table->dropIndex('idx_un_user_type_read');
        });
    }
};
