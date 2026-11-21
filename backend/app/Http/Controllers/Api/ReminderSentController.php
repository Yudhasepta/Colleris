<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reminder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReminderSentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $reminders = Reminder::query()
            ->select(['id', 'sender_id', 'recipient_id', 'group_id', 'message', 'read_at', 'created_at'])
            ->with($this->reminderRelations())
            ->where('sender_id', $request->user()->id)
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn (Reminder $r) => $this->payload($r));

        return response()->json(['reminders' => $reminders]);
    }

    /** @return array<int, string> */
    private function reminderRelations(): array
    {
        return [
            'recipient:id,name',
            'recipient.profile:user_id,initials',
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
            'recipient' => $r->recipient ? [
                'id' => $r->recipient->id,
                'name' => $r->recipient->name,
                'initials' => $r->recipient->initials(),
            ] : null,
        ];
    }
}
