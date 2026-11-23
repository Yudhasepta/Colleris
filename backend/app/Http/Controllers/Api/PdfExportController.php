<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\GroupProject;
use App\Models\Project;
use App\Models\User;
use App\Services\GroupAccess;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

/**
 * Server-rendered PDF reports for project details.
 *
 * Personal projects are exported by their owner only; group projects by any
 * current member (the PDF embeds group context — type, join code, members,
 * vote state — alongside the project's tasks and progress).
 */
class PdfExportController extends Controller
{
    /** UI status vocabulary (see docs/PROJECT.md §6.4). */
    private const STATUS_LABELS = [
        'wait' => 'On-Wait',
        'progress' => 'In-Progress',
        'urgent' => 'Urgent',
        'completed' => 'Completed',
    ];

    /** Opaque status chip tones — Dompdf has no CSS-variable support. */
    private const STATUS_TONES = [
        'wait' => ['bg' => '#eceae2', 'fg' => '#57544a'],
        'progress' => ['bg' => '#f6e7d4', 'fg' => '#9c5a1a'],
        'urgent' => ['bg' => '#f6dcd9', 'fg' => '#a63a30'],
        'completed' => ['bg' => '#dcefe6', 'fg' => '#2e7d5d'],
    ];

    public function __construct(private readonly GroupAccess $access)
    {
    }

    /** GET /projects/{project}/pdf — owner-only personal project report. */
    public function projectPdf(Request $request, Project $project): Response
    {
        abort_if($project->user_id !== $request->user()->id, 403, 'You are not authorised to manage this project.');

        $project->load(['tasks:id,project_id,title,completed,position', 'tags:id,name']);
        $project->recalculateProgress();

        $user = $request->user()->load('profile');
        $tasks = $project->tasks->values();
        $status = $project->status;

        $data = [
            'title' => $project->title,
            'status' => $status,
            'statusLabel' => self::STATUS_LABELS[$status] ?? ucfirst($status),
            'statusTone' => self::STATUS_TONES[$status] ?? self::STATUS_TONES['wait'],
            'progress' => $project->progress,
            'taskTotal' => $tasks->count(),
            'taskCompleted' => $tasks->where('completed', true)->count(),
            'due' => $project->due,
            'tags' => $project->tags->pluck('name')->implode(', '),
            'guideText' => $project->guide_text,
            'tasks' => $tasks,
            'ownerName' => $user->name,
            'ownerHandle' => $user->profile?->handle,
            'ownerInitials' => $user->initials(),
            'createdAt' => $project->created_at?->format('Y-m-d'),
            'updatedAt' => $project->updated_at?->format('Y-m-d'),
            'generatedAt' => now()->format('Y-m-d H:i'),
        ];

        return $this->renderPdf(
            'exports.project',
            $data,
            'colleris-project-' . $this->slug($project->title, $project->id) . '-' . now()->format('Ymd') . '.pdf',
        );
    }

    /** GET /group-projects/{groupProject}/pdf — member-only report with group context. */
    public function groupProjectPdf(Request $request, GroupProject $groupProject): Response
    {
        $group = $groupProject->group()->with(['supervisor:id,name', 'members'])->first();

        abort_if(! $group, 404, 'Group not found.');
        abort_unless($this->access->isMember($group, $request->user()), 403, 'You are not a member of this group.');

        $groupProject->load([
            'tasks:id,group_project_id,title,completed,position',
            'tags:id,name',
            'votes',
            'assigned:id,name',
        ]);
        $groupProject->recalculateProgress();

        $user = $request->user()->load('profile');
        $tasks = $groupProject->tasks->values();
        $votes = $groupProject->votes;
        $status = $groupProject->status;

        $data = [
            'group' => [
                'name' => $group->name,
                'typeLabel' => $group->has_supervisor ? 'Supervised Projects' : 'Collaborating Team Projects',
                'joinCode' => $group->hasActiveJoinCode() ? $group->join_code : null,
                'supervisor' => $group->supervisor?->name,
                'members' => $group->members->map(fn (User $member) => [
                    'name' => $member->name,
                    'initials' => $member->initials(),
                    'role' => $this->memberRole($group, $member),
                ])->values(),
            ],
            'title' => $groupProject->title,
            'status' => $status,
            'statusLabel' => self::STATUS_LABELS[$status] ?? ucfirst($status),
            'statusTone' => self::STATUS_TONES[$status] ?? self::STATUS_TONES['wait'],
            'progress' => $groupProject->progress,
            'taskTotal' => $tasks->count(),
            'taskCompleted' => $tasks->where('completed', true)->count(),
            'tags' => $groupProject->tags->pluck('name')->implode(', '),
            'assignee' => $groupProject->assigned?->name,
            'voteStatus' => $groupProject->vote_status ?? 'none',
            'voteApproved' => $votes->where('vote', 'approved')->count(),
            'voteTotal' => $votes->count(),
            'tasks' => $tasks,
            'exportedBy' => $user->name,
            'exportedHandle' => $user->profile?->handle,
            'generatedAt' => now()->format('Y-m-d H:i'),
        ];

        return $this->renderPdf(
            'exports.group-project',
            $data,
            'colleris-' . $this->slug($group->name, $group->id) . '-' . $this->slug($groupProject->title, $groupProject->id) . '.pdf',
        );
    }

    /** Same role rule as GroupController::memberRole — owner, supervisor, or member. */
    private function memberRole(Group $group, User $member): string
    {
        if ((int) $group->owner_id === (int) $member->id) {
            return 'owner';
        }

        return ($group->has_supervisor && (int) $group->supervisor_id === (int) $member->id) ? 'supervisor' : 'member';
    }

    private function slug(string $text, int $id): string
    {
        $slug = Str::slug($text);

        return $slug !== '' ? $slug : (string) $id;
    }

    private function renderPdf(string $view, array $data, string $filename): Response
    {
        $dompdf = new Dompdf(new Options());
        $dompdf->loadHtml(view($view, $data)->render());
        $dompdf->setPaper('A4');
        $dompdf->render();

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }
}
