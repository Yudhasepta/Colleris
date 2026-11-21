<?php

namespace Tests\Feature;

use App\Models\Group;
use App\Models\GroupProject;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AssignmentTest extends TestCase
{
    private function makeUsers(): array
    {
        $owner = User::factory()->create(['email' => 'assign-owner@test.com']);
        $memberA = User::factory()->create(['email' => 'assign-a@test.com']);
        $memberB = User::factory()->create(['email' => 'assign-b@test.com']);
        foreach ([$owner, $memberA, $memberB] as $u) {
            \App\Models\Profile::firstOrCreate(['user_id' => $u->id], [
                'handle' => strtoupper(substr($u->email, 0, 2)) . '-AS-' . $u->id,
                'initials' => 'AU',
                'visibility' => 'everyone',
            ]);
        }
        \App\Models\UserPermission::firstOrCreate(['user_id' => $owner->id], ['project_assignment' => 'allow']);
        \App\Models\UserPermission::firstOrCreate(['user_id' => $memberA->id], ['project_assignment' => 'request']);
        \App\Models\UserPermission::firstOrCreate(['user_id' => $memberB->id], ['project_assignment' => 'decline']);
        return [$owner, $memberA, $memberB];
    }

    public function test_allow_permission_creates_project_immediately(): void
    {
        [$owner, $memberA, ] = $this->makeUsers();
        $this->actingAs($owner);

        $group = Group::create([
            'owner_id' => $owner->id,
            'name' => 'Assignment group',
            'has_supervisor' => false,
            'join_code' => 'ASGN-01',
            'join_code_expires_at' => now()->addDays(7),
        ]);
        $group->members()->attach([$owner->id, $memberA->id]);

        $response = $this->postJson('/api/assignments', [
            'group_id' => $group->id,
            'recipient_id' => $memberA->id,
            'title' => 'Design task',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('assignment.status', 'approved');
        $this->assertDatabaseHas('group_projects', [
            'group_id' => $group->id,
            'title' => 'Design task',
            'status' => 'wait',
        ]);
    }

    public function test_request_permission_creates_pending_assignment(): void
    {
        [$owner, $memberA, ] = $this->makeUsers();
        $this->actingAs($owner);

        $group = Group::create([
            'owner_id' => $owner->id,
            'name' => 'Request group',
            'has_supervisor' => false,
            'join_code' => 'REQ-01',
            'join_code_expires_at' => now()->addDays(7),
        ]);
        $group->members()->attach([$owner->id, $memberA->id]);

        $response = $this->postJson('/api/assignments', [
            'group_id' => $group->id,
            'recipient_id' => $memberA->id,
            'title' => 'Pending task',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('assignment.status', 'pending');
        $this->assertDatabaseMissing('group_projects', ['title' => 'Pending task']);
    }

    public function test_decline_permission_rejects_assignment(): void
    {
        [$owner, , $memberB] = $this->makeUsers();
        $this->actingAs($owner);

        $group = Group::create([
            'owner_id' => $owner->id,
            'name' => 'Decline group',
            'has_supervisor' => false,
            'join_code' => 'DEC-01',
            'join_code_expires_at' => now()->addDays(7),
        ]);
        $group->members()->attach([$owner->id, $memberB->id]);

        $response = $this->postJson('/api/assignments', [
            'group_id' => $group->id,
            'recipient_id' => $memberB->id,
            'title' => 'Will be declined',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('assignment.status', 'declined');
        $this->assertDatabaseMissing('group_projects', ['title' => 'Will be declined']);
    }

    public function test_self_assignment_in_group_is_always_approved(): void
    {
        [$owner, $memberA, ] = $this->makeUsers();
        $this->actingAs($memberA);

        $group = Group::create([
            'owner_id' => $owner->id,
            'name' => 'Self assign group',
            'has_supervisor' => false,
            'join_code' => 'SELF-01',
            'join_code_expires_at' => now()->addDays(7),
        ]);
        $group->members()->attach([$owner->id, $memberA->id]);

        // memberA has 'request' permission but self-assignment bypasses it
        $response = $this->postJson('/api/assignments', [
            'group_id' => $group->id,
            'recipient_id' => $memberA->id,
            'title' => 'My own task',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('assignment.status', 'approved');
        $this->assertDatabaseHas('group_projects', ['title' => 'My own task']);
    }

    public function test_personal_self_assignment_is_rejected(): void
    {
        [$owner, , ] = $this->makeUsers();
        $this->actingAs($owner);

        $response = $this->postJson('/api/assignments', [
            'recipient_id' => $owner->id,
            'title' => 'Personal self-assign',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'You cannot assign a personal project to yourself.');
    }

    public function test_assignee_column_stores_recipient_id(): void
    {
        [$owner, $memberA, ] = $this->makeUsers();
        $this->actingAs($owner);

        $group = Group::create([
            'owner_id' => $owner->id,
            'name' => 'Column group',
            'has_supervisor' => false,
            'join_code' => 'COL-01',
            'join_code_expires_at' => now()->addDays(7),
        ]);
        $group->members()->attach([$owner->id, $memberA->id]);

        $this->postJson('/api/assignments', [
            'group_id' => $group->id,
            'recipient_id' => $memberA->id,
            'title' => 'Column test',
        ]);

        $gp = GroupProject::where('title', 'Column test')->first();
        $this->assertEquals($memberA->id, $gp->assigned_user_id);
    }
}
