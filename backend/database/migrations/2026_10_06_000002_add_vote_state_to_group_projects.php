<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('group_projects', function (Blueprint $table) {
            if (! Schema::hasColumn('group_projects', 'vote_status')) {
                $table->string('vote_status')->default('none')->after('progress'); // none|pending
            }
            if (! Schema::hasColumn('group_projects', 'vote_initiator_id')) {
                $table->foreignId('vote_initiator_id')->nullable()->after('vote_status')->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('group_projects', function (Blueprint $table) {
            if (Schema::hasColumn('group_projects', 'vote_initiator_id')) {
                try {
                    $table->dropForeign(['vote_initiator_id']);
                } catch (\Throwable $e) {
                }
                $table->dropColumn('vote_initiator_id');
            }
            if (Schema::hasColumn('group_projects', 'vote_status')) {
                $table->dropColumn('vote_status');
            }
        });
    }
};
