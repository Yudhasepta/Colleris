<?php

namespace App\Services;

use Illuminate\Support\Facades\File;

/**
 * File-backed SSE event queue (development).
 *
 * The Windows PHP dev server is single-worker (no forking / CLI workers on
 * this platform), so the long-lived /api/sse stream runs in a *separate*
 * `php artisan serve` instance from the API requests (Vite proxies /api/sse
 * to :8001, everything else to :8000). A per-process in-memory queue would
 * be invisible across those two processes, so each user's queue is a JSON
 * file under storage/app/sse guarded by an exclusive lock.
 *
 * Dev-only scale: 200 most-recent events per user, per-user monotonically
 * increasing event ids (Last-Event-ID replay compares only against that
 * user's own stream). Not a substitute for real pub/sub (e.g. Redis) in
 * production.
 */
class SseBroadcaster
{
    private const CAP = 200;

    public static function broadcast(int $userId, string $type, array $payload): void
    {
        $file = self::fileFor($userId);
        $fh = fopen($file, 'c+');
        if ($fh === false) {
            return; // storage unavailable — dev convenience stream, never fatal
        }
        flock($fh, LOCK_EX);
        $events = self::readUnlocked($file);
        $nextId = ($events ? (int) end($events)['id'] : 0) + 1;
        $events[] = ['id' => $nextId, 'type' => $type, 'payload' => $payload, 'ts' => time()];
        if (count($events) > self::CAP) {
            $events = array_slice($events, -self::CAP);
        }
        ftruncate($fh, 0);
        fseek($fh, 0);
        fwrite($fh, json_encode($events, JSON_UNESCAPED_UNICODE));
        fflush($fh);
        // Lock is released automatically when the handle closes at request end.
    }

    /**
     * Buffered events for a user, starting after $lastEventId (null = all).
     *
     * @return array<int, array<string, mixed>>|null
     */
    public static function getSince(int $userId, ?int $lastEventId = null): ?array
    {
        $file = self::fileFor($userId);
        $fh = @fopen($file, 'c+');
        if ($fh !== false) {
            flock($fh, LOCK_SH);
        }
        $events = self::readUnlocked($file);
        if ($fh !== false) {
            fclose($fh); // releases the shared lock
        }

        if ($lastEventId !== null) {
            $events = array_values(array_filter($events, fn ($e) => (int) ($e['id'] ?? 0) > $lastEventId));
        }

        return $events ?: null;
    }

    /** Newest event id for the user's stream (0 when empty) — the stream's starting cursor. */
    public static function latestEventIdFor(int $userId): int
    {
        $events = self::getSince($userId);
        return $events ? (int) end($events)['id'] : 0;
    }

    private static function fileFor(int $userId): string
    {
        $dir = storage_path('app/sse');
        File::ensureDirectoryExists($dir);

        return $dir . DIRECTORY_SEPARATOR . "user_{$userId}.json";
    }

    private static function readUnlocked(string $file): array
    {
        $raw = @file_get_contents($file);
        if ($raw === false || $raw === '') {
            return [];
        }
        $events = json_decode($raw, true);

        return is_array($events) ? $events : [];
    }
}
