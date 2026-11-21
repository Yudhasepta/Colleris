<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    public function test_register_creates_user_profile_and_permissions(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('user.email', 'test@example.com')
            ->assertJsonPath('user.role', 'user')
            ->assertJsonPath('user.theme_mode', 'dark')
            ->assertJsonPath('user.theme_preset', 'default')
            ->assertMissing(['token' => null]);

        // Token is present and user has profile + permissions
        $this->assertNotNull($response->json('token'));
        $this->assertDatabaseHas('profiles', ['user_id' => 1, 'handle' => 'TE-0001']);
        $this->assertDatabaseHas('user_permissions', ['user_id' => 1]);
    }

    public function test_register_validates_required_fields(): void
    {
        $response = $this->postJson('/api/register', []);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_login_returns_token_and_user(): void
    {
        $user = User::factory()->create([
            'email' => 'login@test.com',
            'password' => Hash::make('password'),
        ]);
        // Profile and permissions are created on registration — simulate manually
        \App\Models\Profile::firstOrCreate(['user_id' => $user->id], [
            'handle' => 'LT-0001',
            'initials' => 'LT',
            'visibility' => 'everyone',
        ]);
        \App\Models\UserPermission::firstOrCreate(['user_id' => $user->id], [
            'project_assignment' => 'request',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'login@test.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('user.email', 'login@test.com');
        $this->assertNotNull($response->json('token'));
    }

    public function test_login_rejects_wrong_password(): void
    {
        $user = User::factory()->create([
            'email' => 'fail@test.com',
            'password' => Hash::make('correct-password'),
        ]);
        \App\Models\Profile::firstOrCreate(['user_id' => $user->id], ['handle' => 'FT-0001', 'initials' => 'FT', 'visibility' => 'everyone']);
        \App\Models\UserPermission::firstOrCreate(['user_id' => $user->id], ['project_assignment' => 'request']);

        $response = $this->postJson('/api/login', [
            'email' => 'fail@test.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401);
    }

    public function test_logout_revokes_token(): void
    {
        $user = User::factory()->create();
        \App\Models\Profile::firstOrCreate(['user_id' => $user->id], ['handle' => 'LU-0001', 'initials' => 'LU', 'visibility' => 'everyone']);
        \App\Models\UserPermission::firstOrCreate(['user_id' => $user->id], ['project_assignment' => 'request']);
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withToken($token)->postJson('/api/logout');
        $response->assertStatus(200);

        // Token should be revoked — subsequent requests fail
        $this->withToken($token)->getJson('/api/me')->assertStatus(401);
    }

    public function test_me_requires_auth(): void
    {
        $this->getJson('/api/me')->assertStatus(401);
    }
}
