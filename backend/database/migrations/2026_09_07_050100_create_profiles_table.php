<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('handle')->nullable();          // e.g. RN-1042
            $table->string('initials', 4)->nullable();      // avatar fallback
            $table->string('profile_code', 12)->nullable();
            $table->timestamp('profile_code_expires_at')->nullable();
            $table->string('visibility')->default('connections'); // private|connections|supervisor|everyone
            $table->unsignedInteger('connections_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profiles');
    }
};