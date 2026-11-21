<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Connection;
use App\Models\Group;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConnectionsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $ids = $request->user()->connections()
            ->where('disconnected', false)
            ->pluck('to_user_id');

        return response()->json(['connectionIds' => $ids]);
    }

    /** Return full profile objects for all active connections (mutual friends). */
    public function profiles(Request $request): JsonResponse
    {
        $me = $request->user();

        $connectedIds = $me->connections()
            ->where('disconnected', false)
            ->pluck('to_user_id')
            ->all();

        if (empty($connectedIds)) {
            return response()->json(['profiles' => []]);
        }

        $users = User::whereIn('id', $connectedIds)
            ->with(['profile:user_id,initials,handle,visibility,connections_count'])
            ->orderBy('name')
            ->get();

        // Batch-load projects in a single query for users whose visibility permits it,
        // avoiding N+1 subqueries inside the map closure.
        $projectByUser = [];
        $usersWithProjects = $users->filter(fn (User $u) => match ($u->profile?->visibility ?? 'private') {
            'everyone', 'connections' => true,
            default => false,
        });
        if ($usersWithProjects->isNotEmpty()) {
            $rows = \DB::table('projects')
                ->select('user_id', 'id', 'title', 'status', 'progress', 'due', 'tag')
                ->whereIn('user_id', $usersWithProjects->pluck('id')->all())
                ->whereIn('status', ['wait', 'progress', 'urgent', 'completed'])
                ->orderByDesc('user_id')
                ->limit(500)
                ->get()
                ->groupBy('user_id');
            foreach ($rows as $uid => $ps) {
                $projectByUser[(int) $uid] = $ps->take(5)->values();
            }
        }

        $profiles = $users->map(function (User $u) use ($me, $projectByUser) {
            $profile = $u->profile;
            $canSeeProjects = match ($profile?->visibility ?? 'private') {
                'everyone' => true,
                'connections' => true,
                'supervisor' => false,
                default => false,
            };

            $visibilityLabel = match ($profile?->visibility ?? 'private') {
                'private' => 'Private / No One',
                'connections' => 'Visible to connections only',
                'supervisor' => 'Visible to their supervisor only',
                'everyone' => 'Visible to everyone',
                default => 'Not visible',
            };

            $data = [
                'id' => $u->id,
                'name' => $u->name,
                'initials' => $profile?->initials ?? $this->initials($u->name),
                'userId' => $profile?->handle,
                'connections' => $profile?->connections_count ?? 0,
                'visibility' => $profile?->visibility ?? 'private',
                'visibilityLabel' => $visibilityLabel,
            ];

            if ($canSeeProjects && isset($projectByUser[$u->id])) {
                $data['projects'] = $projectByUser[$u->id];
            }

                return $data;
            });

        return response()->json(['profiles' => $profiles]);
    }

    public function search(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mode' => ['required', 'in:userId,profileCode'],
            'q' => ['required', 'string', 'min:1', 'max:60'],
        ]);

        $query = Profile::query()
            ->select(['user_id', 'handle', 'initials', 'connections_count', 'visibility'])
            ->with('user:id,name')
            ->whereNotNull('handle');

        // People often paste IDs/codes without the hyphen or with spaces.
        // Compare a normalised value so "x7k9qp" still finds "X7K9-QP".
        $term = preg_replace('/[^A-Z0-9]/', '', strtoupper(trim($data['q'])));

        if ($term === '') {
            return response()->json(['results' => []]);
        }

        $normalisedColumn = "REPLACE(REPLACE(UPPER(%s), '-', ''), ' ', '')";

        if ($data['mode'] === 'userId') {
            $query->whereRaw(
                sprintf($normalisedColumn, 'handle').' LIKE ?',
                ['%'.$term.'%'],
            );
        } else {
            $query
                ->whereNotNull('profile_code')
                ->where('profile_code_expires_at', '>', now())
                ->whereRaw(
                    sprintf($normalisedColumn, 'profile_code').' LIKE ?',
                    ['%'.$term.'%'],
                );
        }

        $results = $query
            ->orderByRaw(
                sprintf($normalisedColumn, $data['mode'] === 'userId' ? 'handle' : 'profile_code').' = ? DESC',
                [$term],
            )
            ->orderBy('user_id')
            ->limit(20)
            ->get()
            ->map(fn (Profile $p) => [
                'id' => $p->user_id,
                'name' => $p->user?->name ?? 'Unknown user',
                'initials' => $p->initials,
                'userId' => $p->handle,
                'connections' => $p->connections_count,
                'visibility' => $p->visibility,
            ]);

        return response()->json(['results' => $results]);
    }

    public function store(Request $request, User $user): JsonResponse
    {
        $me = $request->user();

        if ($user->id === $me->id) {
            return response()->json(['message' => 'You cannot connect with yourself.'], 422);
        }

        $exists = Connection::where('from_user_id', $me->id)->where('to_user_id', $user->id)->exists();
        if ($exists) {
            return response()->json(['message' => 'Already connected']);
        }

        // Symmetric friendship: row both ways so counts and lookups agree.
        Connection::create([
            'from_user_id' => $me->id,
            'to_user_id' => $user->id,
            'disconnected' => false,
        ]);
        Connection::create([
            'from_user_id' => $user->id,
            'to_user_id' => $me->id,
            'disconnected' => false,
        ]);

        Profile::where('user_id', $me->id)->increment('connections_count');
        Profile::where('user_id', $user->id)->increment('connections_count');

        return response()->json(['message' => 'Connected']);
    }

    /** Remove a connection (soft mark as disconnected). */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $me = $request->user();

        if ($user->id === $me->id) {
            return response()->json(['message' => 'You cannot remove yourself as a connection.'], 422);
        }

        // Find and mark both symmetric rows as disconnected.
        $removedFrom = Connection::where('from_user_id', $me->id)->where('to_user_id', $user->id)->first();
        $removedTo = Connection::where('from_user_id', $user->id)->where('to_user_id', $me->id)->first();

        if (! $removedFrom && ! $removedTo) {
            return response()->json(['message' => 'Not connected.'], 404);
        }

        if ($removedFrom) {
            $removedFrom->update(['disconnected' => true]);
        }
        if ($removedTo) {
            $removedTo->update(['disconnected' => true]);
        }

        Profile::where('user_id', $me->id)->decrement('connections_count');
        Profile::where('user_id', $user->id)->decrement('connections_count');

        return response()->json(['message' => 'Connection removed']);
    }

    /** Public profile lookup for the Others page (visibility-aware, guest-safe). */
    public function profile(Request $request, User $user): JsonResponse
    {
        $me = $request->user(); // may be null for guests
        $user->loadMissing('profile');
        $profile = $user->profile;

        // Self-view: skip expensive permission queries — result is deterministic.
        $isSelfView = $me !== null && (int) $me->id === (int) $user->id;

        if ($isSelfView) {
            $canSeeProjects = match ($profile?->visibility ?? 'private') {
                'everyone', 'connections' => true,
                default => false,
            };
            $visibilityLabel = match ($profile?->visibility ?? 'private') {
                'private' => 'Private / No One',
                'connections' => 'Visible to connections only',
                'supervisor' => 'Visible to their supervisor only',
                'everyone' => 'Visible to everyone',
                default => 'Not visible',
            };
            $payload = [
                'id' => $user->id,
                'name' => $user->name,
                'initials' => $profile?->initials ?? $this->initials($user->name),
                'userId' => $profile?->handle,
                'connections' => $profile?->connections_count ?? 0,
                'visibility' => $profile?->visibility ?? 'private',
                'visibilityLabel' => $visibilityLabel,
                'isConnected' => true,
                'isMine' => true,
            ];
            if ($canSeeProjects) {
                $payload['projects'] = $user->projects()->orderByDesc('id')->limit(5)->get(['id', 'title', 'status', 'progress', 'due', 'tag']);
            }
            return response()->json(['profile' => $payload]);
        }

        $isConnected = $me
            ? Connection::where('from_user_id', $me->id)->where('to_user_id', $user->id)->exists()
            : false;

        $isSupervisorOfUser = $me && $this->isSupervisorOf($me, $user);

        $canSeeProjects = match ($profile?->visibility ?? 'private') {
            'everyone' => true,
            'connections' => $isConnected,
            'supervisor' => $isSupervisorOfUser,
            default => false,
        };

        $visibilityLabel = match ($profile?->visibility ?? 'private') {
            'private' => 'Private / No One',
            'connections' => 'Visible to connections only',
            'supervisor' => 'Visible to their supervisor only',
            'everyone' => 'Visible to everyone',
            default => 'Not visible',
        };

        $payload = [
            'id' => $user->id,
            'name' => $user->name,
            'initials' => $profile?->initials ?? $this->initials($user->name),
            'userId' => $profile?->handle,
            'connections' => $profile?->connections_count ?? 0,
            'visibility' => $profile?->visibility ?? 'private',
            'visibilityLabel' => $visibilityLabel,
            'isConnected' => $isConnected,
            'isMine' => false,
        ];

        if ($canSeeProjects) {
            $payload['projects'] = $user->projects()->orderByDesc('id')->limit(5)->get(['id', 'title', 'status', 'progress', 'due', 'tag']);
        }

        return response()->json(['profile' => $payload]);
    }

    private function isSupervisorOf(User $supervisor, User $member): bool
    {
        return Group::where('supervisor_id', $supervisor->id)
            ->whereHas('members', fn ($q) => $q->where('users.id', $member->id))
            ->exists();
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $out = '';
        foreach (array_slice($parts, 0, 2) as $p) {
            $out .= mb_substr($p, 0, 1);
        }

        return strtoupper($out);
    }
}