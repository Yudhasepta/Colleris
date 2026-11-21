<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GroupProject;
use App\Models\GroupProjectCompletionVote;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\UserNotification;
use App\Services\GroupAccess;
use App\Services\GroupProjectVoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class ProjectTaskController extends Controller
{
    public function __construct(
        private readonly GroupAccess $access,
        private readonly GroupProjectVoteService $votes,
    ) {
    }

    // Personal project tasks

    public function index(Request $request, Project $project): JsonResponse
    {
        $this->authorizeProject($request, $project);
        $tasks = $project->tasks()->orderBy('position')->orderBy('id')->get();
        return response()->json(['tasks' => $tasks]);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorizeProject($request, $project);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'position' => ['sometimes', 'integer'],
        ]);
        $max = $project->tasks()->max('position');
        $position = $data['position'] ?? (($max !== null ? $max + 1 : 0));
        $task = ProjectTask::create([
            'project_id' => $project->id,
            'title' => $data['title'],
            'completed' => false,
            'position' => $position,
        ]);
        $project->recalculateProgress();
        return response()->json(['task' => $task, 'project' => $project->load(['tasks:id,project_id,group_project_id,title,completed,position'])], 201);
    }

    public function reorder(Request $request, Project $project): JsonResponse
    {
        $this->authorizeProject($request, $project);
        $data = $request->validate([
            'ordered_ids' => ['required', 'array', 'min:1'],
            'ordered_ids.*' => ['integer', 'exists:project_tasks,id'],
        ]);
        $orderedIds = $data['ordered_ids'];
        $taskIds = $project->tasks()->pluck('id')->all();
        sort($taskIds);
        $sortedOrdered = $orderedIds;
        sort($sortedOrdered);
        abort_unless($taskIds === $sortedOrdered, 422, 'Ordered IDs must match exactly the project tasks.');
        foreach ($orderedIds as $idx => $id) {
            ProjectTask::where('id', $id)->update(['position' => $idx]);
        }
        return response()->json(['project' => $project->load(['tasks:id,project_id,group_project_id,title,completed,position'])]);
    }

    // Group project tasks

    public function groupIndex(Request $request, GroupProject $groupProject): JsonResponse
    {
        $this->authorizeGroupProject($request, $groupProject);
        $tasks = $groupProject->tasks()->orderBy('position')->orderBy('id')->get();
        return response()->json(['tasks' => $tasks]);
    }

    public function groupStore(Request $request, GroupProject $groupProject): JsonResponse
    {
        $this->authorizeGroupProjectTaskManage($request, $groupProject);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'position' => ['sometimes', 'integer'],
        ]);
        $max = $groupProject->tasks()->max('position');
        $position = $data['position'] ?? (($max !== null ? $max + 1 : 0));
        $task = ProjectTask::create([
            'group_project_id' => $groupProject->id,
            'title' => $data['title'],
            'completed' => false,
            'position' => $position,
        ]);
        $groupProject->recalculateProgress();
        return response()->json(['task' => $task, 'groupProject' => $groupProject->load(['tasks:id,project_id,group_project_id,title,completed,position'])], 201);
    }

    public function groupReorder(Request $request, GroupProject $groupProject): JsonResponse
    {
        // Supervised: only owner/supervisor/assigner can reorder; Collaborating: assigned member or manager
        $this->authorizeGroupProjectTaskManage($request, $groupProject);
        $data = $request->validate([
            'ordered_ids' => ['required', 'array', 'min:1'],
            'ordered_ids.*' => ['integer', 'exists:project_tasks,id'],
        ]);
        $orderedIds = $data['ordered_ids'];
        $taskIds = $groupProject->tasks()->pluck('id')->all();
        sort($taskIds);
        $sortedOrdered = $orderedIds;
        sort($sortedOrdered);
        abort_unless($taskIds === $sortedOrdered, 422, 'Ordered IDs must match exactly the group project tasks.');
        foreach ($orderedIds as $idx => $id) {
            ProjectTask::where('id', $id)->update(['position' => $idx]);
        }
        // Audit log for supervisor reorder in supervised groups
        $group = $groupProject->group;
        if ($group && $this->access->isManager($group, $request->user())) {
            $this->auditSupervisorAction($groupProject, $request->user()->id, 'reordered tasks');
        }
        return response()->json(['groupProject' => $groupProject->load(['tasks:id,project_id,group_project_id,title,completed,position', 'votes:id,group_project_id,user_id,vote'])]);
    }

    public function show(Request $request, ProjectTask $task): JsonResponse
    {
        $this->authorizeTask($request, $task);
        return response()->json(['task' => $task]);
    }

    public function update(Request $request, ProjectTask $task): JsonResponse
    {
        $this->authorizeTaskManage($request, $task);
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'completed' => ['sometimes', 'boolean'],
            'position' => ['sometimes', 'integer'],
        ]);
        $task->update($data);
        $this->recalcParent($task);
        return response()->json(['task' => $task->fresh(), 'project' => $this->parentPayload($task)]);
    }

    public function toggleComplete(Request $request, ProjectTask $task): JsonResponse
    {
        $this->authorizeTaskToggle($request, $task);
        $task->completed = ! $task->completed;
        $task->save();
        $this->recalcParent($task);
        // Return the already-saved task and parent project without extra DB reads.
        return response()->json(['project' => $this->parentPayload($task)]);
    }

    public function destroy(Request $request, ProjectTask $task): JsonResponse
    {
        $this->authorizeTaskManage($request, $task);
        $parent = $this->parentModel($task);
        $task->delete();

        if ($parent) {
            $parent->recalculateProgress();
            if ($parent instanceof GroupProject) {
                $this->votes->maybeFinalize($parent, $request->user());
            }
        }

        return response()->json(['message' => 'Deleted', 'project' => $parent ? $parent->fresh(['tasks:id,project_id,group_project_id,title,completed,position']) : null]);
    }

    public function complete(Request $request, Project $project): JsonResponse
    {
        $this->authorizeProject($request, $project);
        if (! $project->complete()) {
            return response()->json(['message' => 'All tasks must be completed before marking project complete.', 'project' => $project->load(['tasks:id,project_id,group_project_id,title,completed,position'])], 422);
        }
        return response()->json(['project' => $project->load(['tasks:id,project_id,group_project_id,title,completed,position'])]);
    }

    public function reopen(Request $request, Project $project): JsonResponse
    {
        $this->authorizeProject($request, $project);
        $project->reopen();
        return response()->json(['project' => $project->load(['tasks:id,project_id,group_project_id,title,completed,position'])]);
    }

    public function groupComplete(Request $request, GroupProject $groupProject): JsonResponse
    {
        $group = $groupProject->group;
        abort_unless($group, 404, 'Group not found.');
        $this->authorizeGroupProject($request, $groupProject);
        $isSupervised = (bool) $group->has_supervisor;

        if ($isSupervised) {
            abort_unless($this->access->isManager($group, $request->user()), 403, 'Only the owner or supervisor can complete Supervised Projects.');
            if (! $groupProject->complete()) {
                return response()->json(['message' => 'All tasks must be completed before marking project complete.', 'groupProject' => $groupProject->load(['tasks:id,project_id,group_project_id,title,completed,position', 'votes:id,group_project_id,user_id,vote'])], 422);
            }
            $groupProject->update(['vote_status' => 'none', 'vote_initiator_id' => null]);
            GroupProjectCompletionVote::where('group_project_id', $groupProject->id)->delete();
            foreach ($group->members()->pluck('user_id')->all() as $memberId) {
                if ((int) $memberId === (int) $request->user()->id) continue;
                UserNotification::create([
                    'user_id' => $memberId,
                    'type' => 'supervised_complete',
                    'actor_id' => $request->user()->id,
                    'payload' => [
                        'group_id' => $group->id,
                        'groupProjectId' => $groupProject->id,
                        'title' => $groupProject->title,
                        'groupName' => $group->name,
                        'detail' => "“{$groupProject->title}” in “{$group->name}” was marked complete by {$request->user()->name}.",
                    ],
                ]);
            }
            $this->auditSupervisorAction($groupProject, $request->user()->id, 'completed project');
            return response()->json(['groupProject' => $groupProject->load(['tasks:id,project_id,group_project_id,title,completed,position', 'votes:id,group_project_id,user_id,vote'])]);
        }

        abort(403, 'Collaborating Team Projects require unanimous vote — use Request Complete and vote.');
    }

    public function groupReopen(Request $request, GroupProject $groupProject): JsonResponse
    {
        $group = $groupProject->group;
        abort_unless($group, 404, 'Group not found.');
        $this->authorizeGroupProject($request, $groupProject);
        $isSupervised = (bool) $group->has_supervisor;

        if ($isSupervised) {
            abort_unless($this->access->isManager($group, $request->user()), 403, 'Only the owner or supervisor can reopen Supervised Projects.');
        }

        $groupProject->reopen();
        $groupProject->update(['vote_status' => 'none', 'vote_initiator_id' => null]);
        GroupProjectCompletionVote::where('group_project_id', $groupProject->id)->delete();
        if ($isSupervised) $this->auditSupervisorAction($groupProject, $request->user()->id, 'reopened project');
        return response()->json(['groupProject' => $groupProject->load(['tasks:id,project_id,group_project_id,title,completed,position', 'votes:id,group_project_id,user_id,vote'])]);
    }

    // ---- Collaborating vote flow (transactional, auto-finalizing on the last task) ----
    public function groupRequestComplete(Request $request, GroupProject $groupProject): JsonResponse
    {
        $groupProject = $this->votes->start($groupProject, $request->user());

        return response()->json([
            'groupProject' => $groupProject,
            'message' => 'Completion vote requested — notifying all members. Tasks remain editable.',
        ]);
    }

    public function groupVote(Request $request, GroupProject $groupProject): JsonResponse
    {
        $data = $request->validate([
            'approve' => ['required', 'boolean'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        [$groupProject, $message] = $this->votes->cast(
            $groupProject,
            $request->user(),
            (bool) $data['approve'],
            $data['reason'] ?? null,
        );

        return response()->json(['groupProject' => $groupProject, 'message' => $message]);
    }

    public function groupVotes(Request $request, GroupProject $groupProject): JsonResponse
    {
        $this->authorizeGroupProject($request, $groupProject);
        $votes = GroupProjectCompletionVote::where('group_project_id', $groupProject->id)->with('user:id,name')->get()->map(fn ($v) => [
            'id' => $v->id,
            'userId' => $v->user_id,
            'userName' => $v->user?->name,
            'vote' => $v->vote,
            'reason' => $v->reason,
        ]);
        return response()->json(['votes' => $votes, 'voteStatus' => $groupProject->vote_status ?? 'none', 'groupProject' => $groupProject->load(['tasks:id,project_id,group_project_id,title,completed,position', 'votes:id,group_project_id,user_id,vote'])]);
    }

    public function groupFinalizeVote(Request $request, GroupProject $groupProject): JsonResponse
    {
        $groupProject = $this->votes->finalize($groupProject, $request->user());

        return response()->json(['groupProject' => $groupProject, 'message' => 'Unanimous approval — project completed.']);
    }

    public function groupCancelVote(Request $request, GroupProject $groupProject): JsonResponse
    {
        $groupProject = $this->votes->cancel($groupProject, $request->user());

        return response()->json(['groupProject' => $groupProject]);
    }

    private function authorizeProject(Request $request, Project $project): void
    {
        abort_if($project->user_id !== $request->user()->id, 403, 'Not authorised to manage this project.');
    }

    private function authorizeGroupProject(Request $request, GroupProject $gp): void
    {
        $group = $gp->group;
        abort_if(! $group || ! $this->access->isMember($group, $request->user()), 403, 'Not a group member.');
    }

    private function authorizeGroupProjectManage(Request $request, GroupProject $gp): void
    {
        $this->authorizeGroupProject($request, $gp);
        $group = $gp->group;
        if (! $group) return;
        if ($group->has_supervisor) {
            // Supervised Projects: only the group admin (owner or supervisor) may
            // add, reorder, rename, or delete tasks. Members can only complete them.
            abort_unless($this->access->isManager($group, $request->user()), 403, 'Only the owner or supervisor can manage tasks in Supervised Projects.');
        }
        // Collaborating Team Projects: any member can manage — already checked membership
    }

    /** Permission gate for task CRUD in collaborating groups.
     *  Allows manager/owner OR the member who was assigned the project. */
    private function authorizeGroupProjectTaskManage(Request $request, GroupProject $gp): void
    {
        $this->authorizeGroupProject($request, $gp);
        $group = $gp->group;
        if (! $group) return;
        if ($group->has_supervisor) {
            abort_unless($this->access->isManager($group, $request->user()), 403, 'Only the owner or supervisor can manage tasks in Supervised Projects.');
            return;
        }
        // Collaborating: manager OR self-assigned member may manage tasks on that project
        $isManager = $this->access->isManager($group, $request->user());
        $isSelfAssigned = $gp->assigned_user_id && (int) $gp->assigned_user_id === (int) $request->user()->id;
        abort_unless($isManager || $isSelfAssigned, 403, 'You can only manage your own assigned tasks in this group.');
    }

    private function authorizeTask(Request $request, ProjectTask $task): void
    {
        if ($task->project_id) {
            $task->loadMissing('project:id,user_id,status,progress');
            $project = $task->project;
            abort_if(!$project || $project->user_id !== $request->user()->id, 403);
        } elseif ($task->group_project_id) {
            $task->loadMissing([
                'groupProject:id,group_id,assigned_user_id,status,progress,vote_status,vote_initiator_id',
                'groupProject.group:id,owner_id,has_supervisor,supervisor_id',
            ]);
            $gp = $task->groupProject;
            abort_if(! $gp || ! $gp->group || ! $this->access->isMember($gp->group, $request->user()), 403);
        } else {
            abort(404);
        }
    }

    private function authorizeTaskManage(Request $request, ProjectTask $task): void
    {
        $this->authorizeTask($request, $task);

        // Once the parent project is completed, task editing is locked until
        // a supervisor/owner explicitly reopens it — prevents accidental or
        // malicious modification of finished work.
        $parent = $this->parentModel($task);
        if ($parent && $parent->status === 'completed') {
            abort(422, 'Tasks cannot be edited on a completed project. Reopen the project first.');
        }

        if ($task->group_project_id) {
            $this->authorizeGroupProjectTaskManage($request, $task->groupProject);
        }
    }

    private function authorizeTaskToggle(Request $request, ProjectTask $task): void
    {
        // Toggle allowed for the personal owner or any current group member.
        // Supervised members may complete tasks even though CRUD is manager-only.
        $this->authorizeTask($request, $task);
    }

    private function auditSupervisorAction(GroupProject $gp, int $actorId, string $action): void
    {
        try {
            \App\Models\AdminLog::create([
                'type' => 'info',
                'message' => "Supervisor {$action} — “{$gp->title}”",
                'detail' => "Group project {$gp->id} in group {$gp->group_id} by user {$actorId}",
                'user_id' => $actorId,
            ]);
        } catch (\Throwable $e) {
            // audit failure should not block main action
        }
        // Also notify assignee if not actor
        $assigneeId = $gp->assigned_user_id;
        if ($assigneeId && (int) $assigneeId !== (int) $actorId) {
            try {
                UserNotification::create([
                    'user_id' => $assigneeId,
                    'type' => 'supervisor_task_override',
                    'actor_id' => $actorId,
                    'payload' => [
                        'group_id' => $gp->group_id,
                        'groupProjectId' => $gp->id,
                        'title' => $gp->title,
                        'detail' => "Supervisor updated “{$gp->title}”: {$action}.",
                    ],
                ]);
            } catch (\Throwable $e) {
            }
        }
    }

    private function recalcParent(ProjectTask $task): void
    {
        if ($task->project_id) {
            $task->project->recalculateProgress();
            return;
        }

        if (! $task->group_project_id) {
            return;
        }

        $gp = $task->groupProject;
        $gp->recalculateProgress();

        // Only attempt vote finalization when a vote is actually pending — avoids loading
        // the group relation entirely for the common case where no vote exists.
        if (($gp->vote_status ?? 'none') === 'pending') {
            $this->votes->maybeFinalize($gp, request()->user());
        }

        $group = $gp->group;
        if ($group && $group->has_supervisor) {
            $actor = request()->user();
            if ($actor && $this->access->isManager($group, $actor)) {
                $this->auditSupervisorAction($gp, $actor->id, 'managed task "' . $task->title . '"');
            }
        }
    }

    private function parentModel(ProjectTask $task)
    {
        if ($task->project_id) return $task->project;
        if ($task->group_project_id) return $task->groupProject;
        return null;
    }

    private function parentPayload(ProjectTask $task)
    {
        $parent = $this->parentModel($task);
        if (! $parent) return null;

        // Avoid an extra SELECT by reusing the in-memory model after recalculateProgress().
        // Load tasks once if not already loaded — cheaper than fresh().
        if (! $parent->relationLoaded('tasks')) {
            $parent->loadMissing(['tasks:id,project_id,group_project_id,title,completed,position']);
        }
        return $parent;
    }
}
