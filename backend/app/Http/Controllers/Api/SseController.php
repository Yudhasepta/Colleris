<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SseBroadcaster;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SseController extends Controller
{
    public function subscribe(Request $request): Response
    {
        $user = $request->user();
        $userId = (int) $user->id;

        // Parse replay position: Last-Event-ID header (native EventSource
        // reconnects) or the lastEventId query param (JS-driven reconnects).
        $lastEventIdHeader = $request->header('Last-Event-ID');
        $lastEventIdQuery = $request->query('lastEventId');
        $lastEventIdSource = $lastEventIdHeader !== null ? $lastEventIdHeader : $lastEventIdQuery;
        $lastEventId = $lastEventIdSource !== null && is_numeric($lastEventIdSource)
            ? (int) $lastEventIdSource
            : null;

        ob_implicit_flush(true);
        ob_end_clean();
        set_time_limit(0);
        ignore_user_abort(true);

        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('X-Accel-Buffering: no');
        header('Connection: close');

        // Flush headers + stream-open marker immediately. SSE clients (and the
        // Vite dev proxy) only see the 200 once the first byte arrives; without
        // this marker they wait up to the first 15s ping or pending event.
        // Comment lines are ignored by EventSource consumers.
        echo ": stream open\n\n";
        flush();

        // Flush any buffered events from before this connection started
        $pending = SseBroadcaster::getSince($userId, $lastEventId);
        if ($pending !== null) {
            foreach ($pending as $event) {
                $this->sendEvent((string) $event['id'], $event['type'], $event['payload']);
            }
        }

        $maxSleep = 15; // seconds between pings
        $lastTick = time();
        // Per-user cursor: newest event id in this user's file-backed queue
        // (cross-process — the stream may live in a different dev-server
        // instance than the request that broadcast the event).
        $nextEventId = SseBroadcaster::latestEventIdFor($userId);

        while (true) {
            // Non-blocking check: if there are new events, send them immediately
            $newEvents = SseBroadcaster::getSince($userId, $nextEventId);
            if ($newEvents !== null) {
                foreach ($newEvents as $event) {
                    if (! $this->sendEvent((string) $event['id'], $event['type'], $event['payload'])) {
                        break 2; // client socket gone — release the worker
                    }
                    $nextEventId = (int) $event['id'];
                }
            } elseif (time() - $lastTick >= $maxSleep) {
                // Keepalive ping every 15s. Also the liveness probe: on this
                // platform a dead client is only noticed at write time, so a
                // failed flush breaks the loop immediately instead of holding
                // the single worker until the next aborted-check tick.
                if (! $this->write(': ping' . "\n\n")) {
                    break;
                }
                $lastTick = time();
            }

            // Sleep 0.5s to avoid busy-wait; check disconnect every tick
            usleep(500_000);

            // Check for client disconnect
            if (connection_aborted()) {
                break;
            }
        }

        return response('', 204);
    }

    private function write(string $chunk): bool
    {
        echo $chunk;
        return @flush();
    }

    private function sendEvent(string $id, string $type, array $payload): bool
    {
        $data = json_encode(['type' => $type, 'data' => $payload], JSON_UNESCAPED_UNICODE);

        return $this->write("id: {$id}\ndata: {$data}\n\n");
    }
}
