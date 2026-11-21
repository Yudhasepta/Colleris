<?php

namespace Tests\Feature;

use App\Models\Group;
use App\Models\GroupProject;
use App\Models\GroupProjectCompletionVote;
use App\Models\ProjectTask;
use App\Models\User;
use Tests\TestCase;

class VoteLifecycleTest extends TestCase
{
    private function makeUsers(): array
    {
        $owner = User::factory()->create(['email' => 'vote-owner@test.com']);
        $m1 = User::factory()->create(['email' => 'vote-m1@test.com']);
        $m2 = User::factory()->create(['email' => 'vote-m2@test.com']);
        foreach ([$owner, $m1, $m2] as $u) {
            \App\Models\Profile::firstOrCreate(['user_id' => $u->id], [
                'handle' => strtoupper(substr($u->email, 0, 2)) . '-VT-' . $u->id,
                'initials' => 'VT',
                'visibility' => 'everyone',
            ]);
        }
        \App\Models\UserPermission::firstOrCreate(['user_id' => $owner->id], ['project_assignment' => 'allow']);
        \App\Models\UserPermission::firstOrCreate(['user_id' => $m1->id], ['project_assignment' => 'request']);
        \App\Models\UserPermission::firstOrCreate(['user_id' => $m2->id], ['project_assignment' => 'request']);
        return [$owner, $m1, $m2];
    }

    private function createCollabGroup(array $users): Group
    {
        [$owner] = $users;
        $group = Group::create([
            'owner_id' => $owner->id,
            'name' => 'Vote group',
            'has_supervisor' => false,
            'join_code' => 'VOTE-01',
            'join_code_expires_at' => now()->addDays(7),
        ]);
        $group->members()->attach([$users[0]->id, $users[1]->id, $users[2]->id]);
        return $group;
    }

    public function test_start_vote_requires_collaborating_group(): void
    {
        [$owner, $m1, ] = $this->makeUsers();
        // Supervised group — no voting allowed
        $group = Group::create([
            'owner_id' => $owner->id,
            'name' => 'Supervised vote',
            'has_supervisor' => true,
            'supervisor_id' => $owner->id,
            'join_code' => 'SV-01',
            'join_code_expires_at' => now()->addDays(7),
        ]);
        $gp = GroupProject::create([
            'group_id' => $group->id,
            'title' => 'Vote project',
            'status' => 'wait',
            'progress' => 0,
        ]);
        ProjectTask::create(['group_project_id' => $gp->id, 'title' => 'Task one', 'completed' => false, 'position' => 0]);

        $this->actingAs($m1);
        $response = $this->postJson("/api/group-projects/{$gp->id}/request-complete");
        $response->assertStatus(403);
    }

    public function test_start_vote_creates_pending_vote_and_notifications(): void
    {
        $users = $this->makeUsers();
        [$owner, $m1, $m2] = $users;
        $group = $this->createCollabGroup($users);

        $gp = GroupProject::create([
            'group_id' => $group->id,
            'title' => 'Start vote test',
            'status' => 'progress',
            'progress' => 0,
        ]);
        ProjectTask::create(['group_project_id' => $gp->id, 'title' => 'A task', 'completed' => false, 'position' => 0]);

        $this->actingAs($m1);
        $response = $this->postJson("/api/group-projects/{$gp->id}/request-complete");
        $response->assertStatus(200);

        $gp->refresh();
        $this->assertEquals('pending', $gp->vote_status);
        $this->assertEquals($m1->id, $gp->vote_initiator_id);
        // Initiator auto-approved
        $this->assertTrue(GroupProjectCompletionVote::where('group_project_id', $gp->id)->where('user_id', $m1->id)->exists());
        // Other members have pending rows
        $this->assertTrue(GroupProjectCompletionVote::where('group_project_id', $gp->id)->where('user_id', $m2->id)->exists());
    }

    public function test_unanimous_approval_with_all_tasks_done_completes_project(): void
    {
        $users = $this->makeUsers();
        [$owner, $m1, $m2] = $users;
        $group = $this->createCollabGroup($users);

        $gp = GroupProject::create([
            'group_id' => $group->id,
            'title' => 'Unanimous complete',
            'status' => 'progress',
            'progress' => 0,
        ]);
        $task = ProjectTask::create(['group_project_id' => $gp->id, 'title' => 'Only task', 'completed' => false, 'position' => 0]);

        // Start vote as m1
        $this->actingAs($m1);
        $this->postJson("/api/group-projects/{$gp->id}/request-complete")->assertStatus(200);

        // m2 approves
        $this->actingAs($m2);
        $approve = $this->postJson("/api/group-projects/{$gp->id}/vote", ['approve' => true]);
        $approve->assertStatus(200);

        // Mark task complete so unanimous + all tasks → auto-complete via maybeFinalize
        $this->patchJson("/api/tasks/{$task->id}/complete")->assertStatus(200);
        $gp->refresh();
        $this->assertEquals('completed', $gp->status);
    }

    public function test_reject_cancelles_vote(): void
    {
        $users = $this->makeUsers();
        [$owner, $m1, $m2] = $users;
        $group = $this->createCollabGroup($users);

        $gp = GroupProject::create([
            'group_id' => $group->id,
            'title' => 'Reject vote',
            'status' => 'progress',
            'progress' => 0,
        ]);
        ProjectTask::create(['group_project_id' => $gp->id, 'title' => 'Task', 'completed' => false, 'position' => 0]);

        $this->actingAs($m1);
        $this->postJson("/api/group-projects/{$gp->id}/request-complete")->assertStatus(200);

        $this->actingAs($m2);
        $reject = $this->postJson("/api/group-projects/{$gp->id}/vote", ['approve' => false, 'reason' => 'Not ready']);
        $reject->assertStatus(200);

        $gp->refresh();
        $this->assertEquals('none', $gp->vote_status);
        $this->assertNull($gp->vote_initiator_id);
    }

    public function test_cancel_vote_only_by_initiator_or_owner(): void
    {
        $users = $this->makeUsers();
        [$owner, $m1, $m2] = $users;
        $group = $this->createCollabGroup($users);

        $gp = GroupProject::create([
            'group_id' => $group->id,
            'title' => 'Cancel test',
            'status' => 'progress',
            'progress' => 0,
        ]);
        ProjectTask::create(['group_project_id' => $gp->id, 'title' => 'Task', 'completed' => false, 'position' => 0]);

        $this->actingAs($m1);
        $this->postJson("/api/group-projects/{$gp->id}/request-complete")->assertStatus(200);

        // m2 is not the initiator or owner — cannot cancel
        $this->actingAs($m2);
        $cancel = $this->postJson("/api/group-projects/{$gp->id}/cancel-vote");
        $cancel->assertStatus(403);

        // Owner can cancel
        $this->actingAs($owner);
        $ok = $this->postJson("/api/group-projects/{$gp->id}/cancel-vote");
        $ok->assertStatus(200);
    }

    public function test_vote_on_completed_project_is_rejected(): void
    {
        $users = $this->makeUsers();
        $group = $this->createCollabGroup($users);
        [, $m1, ] = $users;

        $gp = GroupProject::create([
            'group_id' => $group->id,
            'title' => 'Already done',
            'status' => 'completed',
            'progress' => 100,
        ]);

        $this->actingAs($m1);
        $response = $this->postJson("/api/group-projects/{$gp->id}/request-complete");
        $response->assertStatus(422);
    }
}
