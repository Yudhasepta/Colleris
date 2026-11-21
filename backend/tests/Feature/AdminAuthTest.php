<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminAuthTest extends TestCase
{
    public function test_admin_endpoints_return_403_for_regular_user(): void
    {
        $user = User::factory()->create();
        \App\Models\Profile::firstOrCreate(['user_id' => $user->id], ['handle' => 'AU-0001', 'initials' => 'AU', 'visibility' => 'everyone']);
        \App\Models\UserPermission::firstOrCreate(['user_id' => $user->id], ['project_assignment' => 'request']);

        $this->actingAs($user);
        $this->getJson('/api/admin/overview')->assertStatus(403);
        $this->getJson('/api/admin/users')->assertStatus(403);
        $this->getJson('/api/admin/logs')->assertStatus(403);
        $this->getJson('/api/admin/status')->assertStatus(403);
        $this->getJson('/api/admin/collaboration')->assertStatus(403);
    }

    public function test_admin_endpoints_accessible_to_admin(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        \App\Models\Profile::firstOrCreate(['user_id' => $admin->id], ['handle' => 'AD-0001', 'initials' => 'AD', 'visibility' => 'private']);
        \App\Models\UserPermission::firstOrCreate(['user_id' => $admin->id], ['project_assignment' => 'allow']);

        $this->actingAs($admin);
        $this->getJson('/api/admin/overview')->assertStatus(200);
        $this->getJson('/api/admin/users')->assertStatus(200);
        $this->getJson('/api/admin/status')->assertStatus(200);
        $this->getJson('/api/admin/logs')->assertStatus(200);
        $this->getJson('/api/admin/collaboration')->assertStatus(200);
    }

    public function test_guest_cannot_access_admin(): void
    {
        $this->getJson('/api/admin/overview')->assertStatus(401);
    }

    public function test_admin_can_write_log_entries(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        \App\Models\Profile::firstOrCreate(['user_id' => $admin->id], ['handle' => 'AL-0001', 'initials' => 'AL', 'visibility' => 'private']);
        \App\Models\UserPermission::firstOrCreate(['user_id' => $admin->id], ['project_assignment' => 'allow']);

        $this->actingAs($admin);
        $response = $this->postJson('/api/admin/logs', [
            'type' => 'info',
            'message' => 'Test log entry',
            'detail' => 'Testing purposes',
        ]);
        $response->assertStatus(201);

        $this->assertDatabaseHas('admin_logs', [
            'type' => 'info',
            'message' => 'Test log entry',
            'user_id' => $admin->id,
        ]);
    }

    public function test_admin_can_clear_logs(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        \App\Models\Profile::firstOrCreate(['user_id' => $admin->id], ['handle' => 'AC-0001', 'initials' => 'AC', 'visibility' => 'private']);
        \App\Models\UserPermission::firstOrCreate(['user_id' => $admin->id], ['project_assignment' => 'allow']);

        // Create a log entry
        \App\Models\AdminLog::create(['type' => 'info', 'message' => 'Old log', 'user_id' => $admin->id]);

        $this->actingAs($admin);
        $response = $this->deleteJson('/api/admin/logs');
        $response->assertStatus(200);

        $this->assertDatabaseMissing('admin_logs', ['message' => 'Old log']);
    }

    public function test_admin_status_includes_version_info(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        \App\Models\Profile::firstOrCreate(['user_id' => $admin->id], ['handle' => 'AS-0001', 'initials' => 'AS', 'visibility' => 'private']);
        \App\Models\UserPermission::firstOrCreate(['user_id' => $admin->id], ['project_assignment' => 'allow']);

        $this->actingAs($admin);
        $response = $this->getJson('/api/admin/status');
        $response->assertStatus(200)
            ->assertJsonPath('app', config('app.name'));
    }
}
