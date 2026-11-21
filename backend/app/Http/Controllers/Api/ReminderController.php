<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Connection;
use App\Models\Group;
use App\Models\Reminder;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReminderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $reminders = Reminder::query()
            ->select(['id', 'sender_id', 'recipient_id', 'group_id', 'message', 'read_at', 'created_at'])
            ->with($this->reminderRelations())
            ->where('recipient_id', $request->user()->id)
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn (Reminder $r) => $this->payload($r));

        return response()->json(['reminders' => $reminders]);
    }

    public function store(Request $request, User $user): JsonResponse
    {
        $me = $request->user();

        abort_if($me->id === $user->id, 422, 'You cannot send a reminder to yourself.');

        $this->authorizeReminder($me, $user);

        $data = $request->validate([
            'message' => ['required', 'string', 'max:255'],
            'group_id' => ['nullable', 'integer', 'exists:groups,id'],
        ]);

        if ($data['group_id'] !== null) {
            $belongs = \App\Models\Group::whereKey($data['group_id'])->whereHas('members', fn ($q) => $q->where('users.id', $user->id))->exists();
            abort_unless($belongs, 422, 'The recipient is not a member of the specified group.');
        }

        $reminder = Reminder::create([
            'sender_id' => $me->id,
            'recipient_id' => $user->id,
            'group_id' => $data['group_id'] ?? null,
            'message' => $data['message'],
        ]);

        UserNotification::create([
            'user_id' => $user->id,
            'type' => 'reminder',
            'actor_id' => $me->id,
            'payload' => [
                'reminder_id' => $reminder->id,
                'message' => $data['message'],
                'detail' => "{$me->name} sent you a reminder.",
            ],
        ]);

        return response()->json(['reminder' => $this->payload($reminder->fresh($this->reminderRelations()))], 201);
    }

    public function update(Request $request, Reminder $reminder): JsonResponse
    {
        abort_unless($reminder->recipient_id === $request->user()->id, 403, 'Only the recipient can update this reminder.');

        $data = $request->validate([
            'read' => ['required', 'boolean'],
        ]);

        if ($data['read']) {
            $reminder->update(['read_at' => now()]);
        }

        return response()->json(['reminder' => $this->payload($reminder->fresh($this->reminderRelations()))]);
    }

    private function authorizeReminder(User $sender, User $recipient): void
    {
        $isConnection = Connection::where('from_user_id', $sender->id)->where('to_user_id', $recipient->id)->exists();
        $isSupervisor = Group::where('supervisor_id', $sender->id)
            ->whereHas('members', fn ($q) => $q->where('users.id', $recipient->id))
            ->exists();

        abort_unless($isConnection || $isSupervisor, 403, 'You can only remind connections or members you supervise.');
    }

    /** @return array<int, string> */
    private function reminderRelations(): array
    {
        return [
            'sender:id,name',
            'sender.profile:user_id,initials',
            'group:id,name',
        ];
    }

    private function payload(Reminder $r): array
    {
        return [
            'id' => $r->id,
            'groupId' => $r->group_id,
            'groupName' => $r->group?->name,
            'message' => $r->message,
            'read' => $r->read_at !== null,
            'createdAt' => $r->created_at?->getTimestamp() * 1000,
            'sender' => $r->sender ? [
                'id' => $r->sender->id,
                'name' => $r->sender->name,
                'initials' => $r->sender->initials(),
            ] : null,
        ];
    }
}