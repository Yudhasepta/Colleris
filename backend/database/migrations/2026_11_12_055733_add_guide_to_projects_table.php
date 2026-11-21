<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('projects', 'guide_text')) return;
        Schema::table('projects', function (Blueprint $table) {
            $table->text('guide_text')->nullable()->after('tag');
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('projects', 'guide_text')) return;
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('guide_text');
        });
    }
};
