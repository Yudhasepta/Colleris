<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Services\AssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AssignmentController extends Controller
{
    public function __construct(private readonly AssignmentService $service)
    {
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'group_id' => ['nullable', 'integer', 'exists:groups,id'],
            'recipient_id' => ['nullable', 'integer', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
        ]);

        $recipientId = $data['recipient_id'] ?? null;
        abort_if(!$recipientId, 422, 'recipient_id is required.');

        [$assignment, $project] = $this->service->create(
            $request->user(),
            isset($data['group_id']) ? (int) $data['group_id'] : null,
            (int) $recipientId,
            $data['title'],
        );

        return response()->json([
            'assignment' => $this->payload($assignment->fresh($this->assignmentRelations())),
            'project' => $project ? [
                'id' => $project->id,
                'title' => $project->title,
                'status' => $project->status,
                'progress' => $project->progress,
            ] : null,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $me = $request->user();

        $columns = ['id', 'group_id', 'requester_id', 'recipient_id', 'title', 'status', 'rejected_reason', 'read_at', 'created_at'];

        $received = Assignment::query()
            ->select($columns)
            ->with($this->assignmentRelations())
            ->where('recipient_id', $me->id)
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn (Assignment $a) => $this->payload($a));

        $sent = Assignment::query()
            ->select($columns)
            ->with($this->assignmentRelations())
            ->where('requester_id', $me->id)
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn (Assignment $a) => $this->payload($a));

        return response()->json(['received' => $received, 'sent' => $sent]);
    }

    public function update(Request $request, Assignment $assignment): JsonResponse
    {
        $me = $request->user();

        $data = $request->validate([
            'status' => ['sometimes', 'string', 'in:approved,declined,cancelled'],
            'read' => ['sometimes', 'boolean'],
        ]);

        if (! empty($data['read'])) {
            abort_unless($assignment->recipient_id === $me->id, 403, 'Only the recipient can acknowledge this request.');
            $assignment->update(['read_at' => now()]);

            return response()->json(['assignment' => $this->payload($assignment->fresh($this->assignmentRelations()))]);
        }

        abort_unless(array_key_exists('status', $data), 422, 'A status or read flag is required.');
        abort_unless($assignment->recipient_id === $me->id, 403, 'Only the recipient can respond to this request.');

        $status = $data['status'];

        DB::transaction(function () use ($assignment, $status, $me) {
            $locked = Assignment::whereKey($assignment->id)->lockForUpdate()->firstOrFail();

            abort_unless($locked->status === 'pending', 422, 'This request is no longer pending.');
            $locked->update(['status' => $status]);

            if ($status === 'approved') {
                $this->service->approve($locked->fresh());

                return;
            }

            $this->service->notify($locked->requester_id, 'assignment', $locked->recipient_id, [
                'assignment_id' => $locked->id,
                'group_id' => $locked->group_id,
                'title' => $locked->title,
                'detail' => $status === 'declined'
                    ? "{$me->name} declined your assignment request “{$locked->title}”."
                    : "{$me->name} cancelled the assignment request “{$locked->title}”.",
            ]);
        });

        return response()->json(['assignment' => $this->payload($assignment->fresh($this->assignmentRelations()))]);
    }

    /** @return array<int, string> */
    private function assignmentRelations(): array
    {
        return [
            'requester:id,name',
            'requester.profile:user_id,initials',
            'recipient:id,name',
            'recipient.profile:user_id,initials',
            'group:id,name',
        ];
    }

    private function payload(Assignment $a): array
    {
        return [
            'id' => $a->id,
            'groupId' => $a->group_id,
            'groupName' => $a->group?->name,
            'title' => $a->title,
            'status' => $a->status,
            'rejectedReason' => $a->rejected_reason,
            'read' => $a->read_at !== null,
            'createdAt' => $a->created_at?->getTimestamp() * 1000,
            'requester' => $a->requester ? [
                'id' => $a->requester->id,
                'name' => $a->requester->name,
                'initials' => $a->requester->initials(),
            ] : null,
            'recipient' => $a->recipient ? [
                'id' => $a->recipient->id,
                'name' => $a->recipient->name,
                'initials' => $a->recipient->initials(),
            ] : null,
        ];
    }
}