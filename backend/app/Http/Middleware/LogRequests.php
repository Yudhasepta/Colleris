<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Development-only request logging for the API.
 *
 * Logs the route, method, response status and elapsed time for every API
 * request so the dev console / log file can distinguish "API unreachable"
 * from "API reachable but request rejected". Never logs passwords, bearer
 * tokens, cookies or other secrets. Only active when APP_DEBUG is true.
 */
class LogRequests
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('app.debug')) {
            return $next($request);
        }

        $start = hrtime(true);

        $response = $next($request);

        $elapsedMs = round((hrtime(true) - $start) / 1e6, 1);

        Log::channel('stack')->info('api.request', [
            'method' => $request->method(),
            'path' => $request->path(),
            'status' => $response->getStatusCode(),
            'elapsed_ms' => $elapsedMs,
            'ip' => $request->ip(),
        ]);

        return $response;
    }
}
