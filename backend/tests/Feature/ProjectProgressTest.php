<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProjectProgressTest extends TestCase
{
    private function setUpUser(): User
    {
        $user = User::factory()->create();
        \App\Models\Profile::firstOrCreate(['user_id' => $user->id], ['handle' => 'PP-0001', 'initials' => 'PP', 'visibility' => 'everyone']);
        \App\Models\UserPermission::firstOrCreate(['user_id' => $user->id], ['project_assignment' => 'request']);
        $this->actingAs($user);
        return $user;
    }

    public function test_new_project_starts_at_zero_progress(): void
    {
        $user = $this->setUpUser();
        $response = $this->postJson("/api/projects", [
            'title' => 'My project',
            'status' => 'wait',
            'tag' => 'General',
        ]);

        $response->assertStatus(201);
        $this->assertEquals(0, $response->json('project.progress'));
        $this->assertEquals('wait', $response->json('project.status'));
    }

    public function test_completed_status_is_coerced_to_wait_on_create(): void
    {
        $user = $this->setUpUser();
        $response = $this->postJson('/api/projects', [
            'title' => 'Already done',
            'status' => 'completed',
        ]);

        $response->assertStatus(201);
        $this->assertEquals('wait', $response->json('project.status'));
    }

    public function test_progress_is_derived_from_tasks_not_manual_set(): void
    {
        $user = $this->setUpUser();
        $project = Project::create(['user_id' => $user->id, 'title' => 'Derived progress', 'status' => 'wait', 'progress' => 0]);
        ProjectTask::create(['project_id' => $project->id, 'title' => 'Task one', 'completed' => true, 'position' => 0]);
        ProjectTask::create(['project_id' => $project->id, 'title' => 'Task two', 'completed' => false, 'position' => 1]);
        $project->recalculateProgress(); // 50%

        // Attempt to force arbitrary progress via PATCH
        $patch = $this->patchJson("/api/projects/{$project->id}/progress", ['progress' => 99]);
        $patch->assertStatus(200);
        $patch->assertJsonPath('project.progress', 50);
    }

    public function test_complete_requires_all_tasks_done(): void
    {
        $user = $this->setUpUser();
        $project = Project::create(['user_id' => $user->id, 'title' => 'Incomplete', 'status' => 'progress', 'progress' => 0]);
        ProjectTask::create(['project_id' => $project->id, 'title' => 'A', 'completed' => true, 'position' => 0]);
        ProjectTask::create(['project_id' => $project->id, 'title' => 'B', 'completed' => false, 'position' => 1]);
        $project->recalculateProgress();

        $response = $this->postJson("/api/projects/{$project->id}/complete");
        $response->assertStatus(422)
            ->assertJsonPath('message', 'All tasks must be completed.');
    }

    public function test_complete_succeeds_when_all_tasks_done(): void
    {
        $user = $this->setUpUser();
        $project = Project::create(['user_id' => $user->id, 'title' => 'All done', 'status' => 'progress', 'progress' => 0]);
        ProjectTask::create(['project_id' => $project->id, 'title' => 'A', 'completed' => true, 'position' => 0]);
        ProjectTask::create(['project_id' => $project->id, 'title' => 'B', 'completed' => true, 'position' => 1]);
        $project->recalculateProgress(); // 100%

        $response = $this->postJson("/api/projects/{$project->id}/complete");
        $response->assertStatus(200)
            ->assertJsonPath('project.status', 'completed')
            ->assertJsonPath('project.progress', 100);
    }

    public function test_reopen_retains_task_completion_state(): void
    {
        $user = $this->setUpUser();
        $project = Project::create(['user_id' => $user->id, 'title' => 'Reopened', 'status' => 'completed', 'progress' => 100]);
        ProjectTask::create(['project_id' => $project->id, 'title' => 'Done task', 'completed' => true, 'position' => 0]);
        ProjectTask::create(['project_id' => $project->id, 'title' => 'Left undone', 'completed' => false, 'position' => 1]);
        $project->recalculateProgress();

        $reopen = $this->postJson("/api/projects/{$project->id}/reopen");
        $reopen->assertStatus(200);
        $this->assertEquals('progress', $reopen->json('project.status'));

        // Task completion state preserved
        $tasks = $project->fresh()->tasks;
        $this->assertTrue($tasks->firstWhere('title', 'Done task')->completed);
        $this->assertFalse($tasks->firstWhere('title', 'Left undone')->completed);
    }

    public function test_project_progress_without_tasks_uses_stored_value(): void
    {
        $user = $this->setUpUser();
        $project = Project::create(['user_id' => $user->id, 'title' => 'Legacy', 'status' => 'progress', 'progress' => 75]);
        // No tasks exist — legacy behaviour keeps stored progress
        $show = $this->getJson("/api/projects/{$project->id}");
        $show->assertStatus(200)
            ->assertJsonPath('project.progress', 75);
    }
}
