<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('groups', function (Blueprint $table) {
            $table->string('join_code', 12)->nullable()->after('supervisor_id');
            $table->timestamp('join_code_expires_at')->nullable()->after('join_code');

            $table->unique('join_code');
        });
    }

    public function down(): void
    {
        Schema::table('groups', function (Blueprint $table) {
            $table->dropUnique(['join_code']);
            $table->dropColumn(['join_code', 'join_code_expires_at']);
        });
    }
};