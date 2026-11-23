<?php

namespace Tests\Feature;

use App\Models\Group;
use App\Models\GroupProject;
use App\Models\Profile;
use App\Models\ProjectTask;
use App\Models\User;
use App\Models\UserPermission;
use Tests\TestCase;

/**
 * PDF export endpoints: personal project reports (owner only) and group
 * project reports with group context (current members only).
 */
class PdfExportTest extends TestCase
{
    private function makeUser(string $email, string $initials = 'PE'): User
    {
        $user = User::factory()->create(['email' => $email, 'name' => str_replace('@', ' ', $email)]);
        Profile::firstOrCreate(['user_id' => $user->id], [
            'handle' => strtoupper(substr($email, 0, 2)) . '-' . str_pad((string) $user->id, 4, '0', STR_PAD_LEFT),
            'initials' => $initials,
            'visibility' => 'everyone',
        ]);
        UserPermission::firstOrCreate(['user_id' => $user->id], ['project_assignment' => 'request']);

        return $user;
    }

    private function makeGroup(User $owner, string $name = 'Export group', bool $attachOwner = true): Group
    {
        $group = Group::create([
            'owner_id' => $owner->id,
            'name' => $name,
            'has_supervisor' => false,
            'join_code' => strtoupper(substr(md5($name . $owner->id), 0, 8)),
            'join_code_expires_at' => now()->addDays(7),
        ]);
        if ($attachOwner) {
            $group->members()->attach($owner->id);
        }

        return $group;
    }

    public function test_owner_can_download_personal_project_pdf(): void
    {
        $user = $this->makeUser('pdf-owner@test.com');
        $this->actingAs($user);

        $id = $this->postJson('/api/projects', ['title' => 'Exportable project', 'status' => 'progress'])
            ->assertStatus(201)
            ->json('project.id');

        ProjectTask::create([
            'project_id' => $id,
            'title' => 'First task',
            'completed' => true,
            'position' => 0,
        ]);

        $response = $this->getJson("/api/projects/{$id}/pdf");
        $response->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('attachment', $response->headers->get('Content-Disposition'));
        $this->assertTrue(str_starts_with($response->getContent(), '%PDF'), 'Response body must be a PDF file.');
    }

    public function test_non_owner_cannot_download_personal_project_pdf(): void
    {
        $owner = $this->makeUser('pdf-owner2@test.com');
        $other = $this->makeUser('pdf-other@test.com');

        $projectId = $owner->projects()->create(['title' => 'Private project', 'status' => 'wait', 'progress' => 0])->id;

        $this->actingAs($other);
        $this->getJson("/api/projects/{$projectId}/pdf")->assertStatus(403);
    }

    public function test_guest_cannot_download_pdf(): void
    {
        $user = $this->makeUser('pdf-guest@test.com');
        $projectId = $user->projects()->create(['title' => 'Guest test', 'status' => 'wait', 'progress' => 0])->id;

        $this->getJson("/api/projects/{$projectId}/pdf")->assertStatus(401);
    }

    public function test_group_member_can_download_group_project_pdf(): void
    {
        $owner = $this->makeUser('pdf-member-owner@test.com');
        $member = $this->makeUser('pdf-member@test.com');

        $group = $this->makeGroup($owner, 'Export team');
        $group->members()->attach($member->id);

        $gp = GroupProject::create([
            'group_id' => $group->id,
            'title' => 'Shared deliverable',
            'status' => 'progress',
            'progress' => 0,
            'assigned_user_id' => $member->id,
        ]);
        ProjectTask::create([
            'group_project_id' => $gp->id,
            'title' => 'Joint task',
            'completed' => false,
            'position' => 0,
        ]);

        $this->actingAs($member);
        $response = $this->getJson("/api/group-projects/{$gp->id}/pdf");
        $response->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type'));
        $this->assertTrue(str_starts_with($response->getContent(), '%PDF'), 'Response body must be a PDF file.');
    }

    public function test_non_member_cannot_download_group_project_pdf(): void
    {
        $owner = $this->makeUser('pdf-group-owner@test.com');
        $outsider = $this->makeUser('pdf-outsider@test.com');

        $group = $this->makeGroup($owner, 'Export team B');
        $gp = GroupProject::create([
            'group_id' => $group->id,
            'title' => 'Locked down project',
            'status' => 'wait',
            'progress' => 0,
        ]);

        $this->actingAs($outsider);
        $this->getJson("/api/group-projects/{$gp->id}/pdf")->assertStatus(403);
    }

    public function test_owner_can_download_archived_personal_project_pdf(): void
    {
        $user = $this->makeUser('pdf-archived-owner@test.com');
        $this->actingAs($user);

        $project = $user->projects()->create(['title' => 'Archived report', 'status' => 'completed', 'progress' => 100]);
        $project->delete();

        $response = $this->getJson("/api/projects/{$project->id}/pdf");
        $response->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type'));
        $this->assertTrue(str_starts_with($response->getContent(), '%PDF'), 'Response body must be a PDF file.');
    }

    public function test_member_can_download_archived_group_project_pdf(): void
    {
        $owner = $this->makeUser('pdf-archived-group-owner@test.com');
        $member = $this->makeUser('pdf-archived-member@test.com');

        $group = $this->makeGroup($owner, 'Archived export team');
        $group->members()->attach($member->id);

        $gp = GroupProject::create([
            'group_id' => $group->id,
            'title' => 'Archived shared deliverable',
            'status' => 'completed',
            'progress' => 100,
        ]);
        $gp->delete();

        $this->actingAs($member);
        $response = $this->getJson("/api/group-projects/{$gp->id}/pdf");
        $response->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type'));
        $this->assertTrue(str_starts_with($response->getContent(), '%PDF'), 'Response body must be a PDF file.');
    }
}
