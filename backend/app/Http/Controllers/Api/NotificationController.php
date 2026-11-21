<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $me = $request->user();

        $notifications = UserNotification::query()
            ->select(['id', 'user_id', 'type', 'actor_id', 'payload', 'read_at', 'created_at'])
            ->with(['actor:id,name', 'actor.profile:user_id,initials'])
            ->where('user_id', $me->id)
            ->orderByDesc('id')
            ->limit(60)
            ->get()
            ->map(fn (UserNotification $n) => $this->payload($n));

        $unread = UserNotification::where('user_id', $me->id)->whereNull('read_at')->count();

        return response()->json(['notifications' => $notifications, 'unreadCount' => $unread]);
    }

    public function update(Request $request, UserNotification $notification): JsonResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 403, 'You can only update your own notifications.');

        $data = $request->validate([
            'read' => ['required', 'boolean'],
        ]);

        if ($data['read'] && $notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json([
            'notification' => $this->payload($notification->fresh(['actor:id,name', 'actor.profile:user_id,initials'])),
            'unreadCount' => UserNotification::where('user_id', $notification->user_id)->whereNull('read_at')->count(),
        ]);
    }

    private function payload(UserNotification $n): array
    {
        return [
            'id' => $n->id,
            'type' => $n->type,
            'read' => $n->read_at !== null,
            'createdAt' => $n->created_at?->getTimestamp() * 1000,
            'actor' => $n->actor ? [
                'id' => $n->actor->id,
                'name' => $n->actor->name,
                'initials' => $n->actor->initials(),
            ] : null,
            'payload' => $n->payload ?? [],
        ];
    }
}