<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('group_project_id')->nullable()->constrained('group_projects')->cascadeOnDelete();
            $table->string('title');
            $table->boolean('completed')->default(false);
            $table->integer('position')->default(0);
            $table->timestamps();

            $table->index(['project_id', 'completed']);
            $table->index(['group_project_id', 'completed']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_tasks');
    }
};
