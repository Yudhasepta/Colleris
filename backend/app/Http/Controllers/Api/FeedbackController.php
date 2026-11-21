<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Feedback;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $feedbacks = Feedback::query()
            ->receivedBy($request->user()->id)
            ->get()
            ->map(fn (Feedback $f) => $this->payload($f));

        $unreadCount = Feedback::where('recipient_id', $request->user()->id)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'feedbacks' => $feedbacks,
            'unreadCount' => $unreadCount,
        ]);
    }

    public function store(Request $request, User $user): JsonResponse
    {
        $me = $request->user();

        abort_if($me->id === $user->id, 422, 'You cannot send feedback to yourself.');

        $data = $request->validate([
            'message' => ['required', 'string', 'max:1000'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
        ]);

        // If a project_id was given, verify it belongs to the recipient
        if ($data['project_id'] !== null) {
            $owned = \App\Models\Project::whereKey($data['project_id'])
                ->where('user_id', $user->id)
                ->exists();
            abort_unless($owned, 422, 'That project does not belong to the recipient.');
        }

        $feedback = Feedback::create([
            'sender_id' => $me->id,
            'recipient_id' => $user->id,
            'project_id' => $data['project_id'] ?? null,
            'message' => $data['message'],
        ]);

        return response()->json(['feedback' => $this->payload($feedback)], 201);
    }

    public function update(Request $request, Feedback $feedback): JsonResponse
    {
        abort_unless($feedback->recipient_id === $request->user()->id, 403, 'Only the recipient can update this feedback.');

        $data = $request->validate([
            'read' => ['required', 'boolean'],
        ]);

        if ($data['read'] && $feedback->read_at === null) {
            $feedback->update(['read_at' => now()]);
        }

        return response()->json(['feedback' => $this->payload($feedback->fresh())]);
    }

    private function payload(Feedback $f): array
    {
        return [
            'id' => $f->id,
            'message' => $f->message,
            'read' => $f->read_at !== null,
            'createdAt' => $f->created_at?->getTimestamp() * 1000,
            'sender' => $f->sender ? [
                'id' => $f->sender->id,
                'name' => $f->sender->name,
                'initials' => $f->sender->initials(),
            ] : null,
            'project' => $f->project ? [
                'id' => $f->project->id,
                'title' => $f->project->title,
            ] : null,
        ];
    }
}
