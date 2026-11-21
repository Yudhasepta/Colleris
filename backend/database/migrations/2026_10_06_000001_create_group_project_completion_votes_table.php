<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('group_project_completion_votes')) {
            return;
        }
        Schema::create('group_project_completion_votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_project_id')->constrained('group_projects')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('vote')->default('pending'); // pending|approved|rejected
            $table->string('reason')->nullable();
            $table->timestamps();
            $table->unique(['group_project_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_project_completion_votes');
    }
};
