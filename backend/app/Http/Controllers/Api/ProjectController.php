<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()->projects();

        // Optional tag filter
        if ($request->filled('tag')) {
            $query->whereHas('tags', fn ($q) => $q->where('tags.name', $request->string('tag')));
        }

        if ($request->boolean('archived')) {
            $projects = $query->withTrashed()
                ->select(['id', 'title', 'status', 'progress', 'due', 'created_at', 'updated_at'])
                ->with(['tasks:id,project_id,title,completed,position', 'tags:id,name'])
                ->orderByDesc('id')
                ->get();
        } else {
            $projects = $query
                ->select(['id', 'title', 'status', 'progress', 'due', 'created_at', 'updated_at'])
                ->with(['tasks:id,project_id,title,completed,position', 'tags:id,name'])
                ->orderByDesc('id')
                ->get();
        }

        // Recalculate in memory from the eager-loaded tasks. Only changed rows are saved.
        foreach ($projects as $project) {
            $project->recalculateProgress();
        }

        return response()->json(['projects' => $projects]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'status' => ['required', 'string', 'in:wait,progress,urgent,completed'],
            'progress' => ['sometimes', 'integer', 'between:0,100'],
            'due' => ['nullable', 'string', 'max:255'],
            'tags' => ['sometimes', 'array'],
            'tags.*' => ['string', 'max:60'],
        ]);

        // Progress is derived — ignore client-supplied value for compatibility. New projects start at 0.
        unset($data['progress']);
        $data['progress'] = 0;
        // Cannot create directly as completed without tasks
        if (($data['status'] ?? null) === 'completed') {
            $data['status'] = 'wait';
        }

        $tags = $data['tags'] ?? [];
        unset($data['tags']);

        $project = $request->user()->projects()->create($data);

        if (!empty($tags)) {
            $tagIds = [];
            foreach ($tags as $tagName) {
                $tag = Tag::firstOrCreate(['name' => trim($tagName)]);
                $tagIds[] = $tag->id;
            }
            $project->tags()->attach(array_unique($tagIds));
        }

        $project->load(['tags:id,name', 'tasks:id,project_id,title,completed,position']);

        return response()->json(['project' => $project], 201);
    }

    public function show(Request $request, Project $project): JsonResponse
    {
        $this->authorizeOwnership($request, $project);
        $project->load(['tasks:id,project_id,title,completed,position', 'tags:id,name']);
        $project->recalculateProgress();

        return response()->json(['project' => $project]);
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        $this->authorizeOwnership($request, $project);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'in:wait,progress,urgent,completed'],
            'progress' => ['sometimes', 'integer', 'between:0,100'],
            'due' => ['nullable', 'string', 'max:255'],
            'tags' => ['sometimes', 'array'],
            'tags.*' => ['string', 'max:60'],
        ]);

        // Load tasks once so the derived checks below do not issue repeated count queries.
        $project->load(['tasks:id,project_id,title,completed,position']);
        $hasTasks = $project->tasks->isNotEmpty();

        // If tasks exist, client progress/status are derived — ignore arbitrary progress
        if ($hasTasks) {
            unset($data['progress']);
            // Prevent manual completed unless tasks allow via /complete
            if (($data['status'] ?? null) === 'completed') {
                $total = $project->tasks->count();
                $completed = $project->tasks->where('completed', true)->count();
                if ($total === 0 || $completed !== $total) {
                    unset($data['status']);
                }
            }
        }

        $tagNames = $data['tags'] ?? null;
        if ($tagNames !== null) {
            unset($data['tags']);
            $tagIds = [];
            foreach ($tagNames as $tagName) {
                $tag = Tag::firstOrCreate(['name' => trim($tagName)]);
                $tagIds[] = $tag->id;
            }
            $project->tags()->sync(array_unique($tagIds));
        }

        if (!empty($data)) $project->update($data);
        if ($hasTasks) $project->recalculateProgress();

        $project->load(['tags:id,name', 'tasks:id,project_id,title,completed,position']);

        return response()->json(['project' => $project]);
    }

    public function progress(Request $request, Project $project): JsonResponse
    {
        $this->authorizeOwnership($request, $project);

        $request->validate([
            'progress' => ['required', 'integer', 'between:0,100'],
        ]);

        // Progress is derived from tasks — arbitrary client values are always ignored.
        // Keeps the endpoint for backward compatibility but never trusts the payload.
        $project->load(['tasks:id,project_id,title,completed,position']);
        $project->recalculateProgress();

        return response()->json(['project' => $project, 'message' => 'Progress is derived from tasks.']);
    }

    public function destroy(Request $request, Project $project): JsonResponse
    {
        $this->authorizeOwnership($request, $project);

        $project->delete();

        return response()->json(['message' => 'Deleted']);
    }

    public function restore(Request $request, Project $project): JsonResponse
    {
        $this->authorizeOwnership($request, $project);

        abort_unless($project->trashed(), 400, 'Project is not archived.');

        $project->restore();
        $project->load(['tasks:id,project_id,title,completed,position']);
        $project->recalculateProgress();

        return response()->json(['project' => $project]);
    }

    /**
     * Update or clear the project's internal guide note.
     * Requires the user's guide_upload permission to be allow or request.
     */
    public function updateGuide(Request $request, Project $project): JsonResponse
    {
        $this->authorizeOwnership($request, $project);
        abort_if($project->trashed(), 400, 'Cannot edit an archived project.');

        $perm = $request->user()->permission?->guide_upload ?? 'request';
        if ($perm === 'decline') {
            abort(403, 'You do not have permission to upload guides.');
        }

        $data = $request->validate([
            'guide_text' => ['sometimes', 'string', 'max:2000'],
        ]);

        $project->guide_text = $data['guide_text'] ?? null;
        $project->save();

        return response()->json(['project' => $project->fresh(['tasks:id,project_id,title,completed,position'])]);
    }

    private function authorizeOwnership(Request $request, Project $project): void
    {
        abort_if($project->user_id !== $request->user()->id, 403, 'You are not authorised to manage this project.');
    }

    /** Return all tags currently in use (for autocomplete suggestions). */
    public function indexTags(Request $request): JsonResponse
    {
        $query = Tag::query()->select(['id', 'name']);
        if ($request->filled('q')) {
            $query->where('name', 'LIKE', '%' . $request->string('q') . '%');
        }
        $tags = $query->orderBy('name')->limit(20)->get();

        return response()->json(['tags' => $tags]);
    }
}
