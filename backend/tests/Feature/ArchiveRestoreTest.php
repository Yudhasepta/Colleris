<?php

namespace Tests\Feature;

use App\Models\Group;
use App\Models\GroupProject;
use App\Models\Project;
use App\Models\Profile;
use App\Models\User;
use App\Models\UserPermission;
use Tests\TestCase;

/**
 * Archive/restore round-trips. Regression: implicit route-model binding
 * excludes SoftDeletes records, so without ->withTrashed() on the restore
 * routes both POSTs below 404'd before reaching the controller.
 */
class ArchiveRestoreTest extends TestCase
{
    private function makeUser(string $email): User
    {
        $user = User::factory()->create(['email' => $email]);
        Profile::firstOrCreate(['user_id' => $user->id], [
            'handle' => strtoupper(substr($email, 0, 2)) . '-' . str_pad((string) $user->id, 4, '0', STR_PAD_LEFT),
            'initials' => 'AR',
            'visibility' => 'everyone',
        ]);
        UserPermission::firstOrCreate(['user_id' => $user->id], ['project_assignment' => 'request']);

        return $user;
    }

    private function makeGroup(User $owner, string $name = 'Restore group'): Group
    {
        $group = Group::create([
            'owner_id' => $owner->id,
            'name' => $name,
            'has_supervisor' => false,
            'join_code' => strtoupper(substr(md5($name . $owner->id), 0, 8)),
            'join_code_expires_at' => now()->addDays(7),
        ]);
        // isMember() checks the members relation, not owner_id — the owner must
        // be attached for authorizeMember to pass.
        $group->members()->attach($owner->id);

        return $group;
    }

    public function test_personal_project_archive_restore_roundtrip(): void
    {
        $user = $this->makeUser('personal-restore@test.com');
        $this->actingAs($user);

        $id = $this->postJson('/api/projects', ['title' => 'Archivable', 'status' => 'wait'])
            ->assertStatus(201)
            ->json('project.id');

        $this->deleteJson("/api/projects/{$id}")->assertStatus(200);
        $this->assertNotNull(Project::withTrashed()->find($id)->deleted_at);

        $archived = $this->getJson('/api/projects?archived=true');
        $archived->assertStatus(200);
        $this->assertTrue(collect($archived->json('projects'))->pluck('id')->contains($id));

        $this->postJson("/api/projects/{$id}/restore")->assertStatus(200);
        $this->assertNull(Project::withTrashed()->find($id)->deleted_at);

        $active = $this->getJson('/api/projects');
        $this->assertTrue(collect($active->json('projects'))->pluck('id')->contains($id));
    }

    public function test_restoring_an_active_personal_project_is_rejected(): void
    {
        $user = $this->makeUser('personal-negative@test.com');
        $this->actingAs($user);

        $id = $this->postJson('/api/projects', ['title' => 'Active', 'status' => 'wait'])->json('project.id');

        $this->postJson("/api/projects/{$id}/restore")
            ->assertStatus(400)
            ->assertJsonPath('message', 'Project is not archived.');
    }

    public function test_group_project_archive_restore_roundtrip(): void
    {
        $owner = $this->makeUser('group-restore@test.com');
        $this->actingAs($owner);
        $group = $this->makeGroup($owner);

        $gp = GroupProject::create([
            'group_id' => $group->id,
            'title' => 'Group archivable',
            'status' => 'completed',
            'progress' => 0,
        ]);

        $this->postJson("/api/group-projects/{$gp->id}/archive")->assertStatus(200);
        $this->assertNotNull(GroupProject::withTrashed()->find($gp->id)->deleted_at);

        $archived = $this->getJson("/api/groups/{$group->id}/archived-projects");
        $archived->assertStatus(200);
        $this->assertTrue(collect($archived->json('archivedProjects'))->pluck('id')->contains($gp->id));

        $this->postJson("/api/group-projects/{$gp->id}/restore")->assertStatus(200);
        $this->assertNull(GroupProject::withTrashed()->find($gp->id)->deleted_at);

        // Back in the group's active project list
        $groups = $this->getJson('/api/groups');
        $payload = collect($groups->json('groups'))->firstWhere('id', $group->id);
        $this->assertTrue(collect($payload['projects'])->pluck('id')->contains($gp->id));
    }

    public function test_restoring_an_active_group_project_is_rejected(): void
    {
        $owner = $this->makeUser('group-negative@test.com');
        $this->actingAs($owner);
        $group = $this->makeGroup($owner, 'Negative group');

        $gp = GroupProject::create([
            'group_id' => $group->id,
            'title' => 'Active group project',
            'status' => 'wait',
            'progress' => 0,
        ]);

        $this->postJson("/api/group-projects/{$gp->id}/restore")
            ->assertStatus(400)
            ->assertJsonPath('message', 'Project is not archived.');
    }
}
