<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authentication for the SSE endpoint only.
 *
 * Browsers cannot attach an Authorization header to an EventSource
 * connection, so this middleware accepts the Sanctum token either as the
 * usual Bearer header or as a `?token=` query parameter (this route only).
 * Revoked or expired tokens are rejected.
 *
 * Security note (local development): the token travels in the URL on this
 * one route. The dev LogRequests middleware records the path only (no query
 * string). Never apply this middleware outside /api/sse.
 */
class SseAuthenticate
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = null;

        // 1) Standard Bearer header
        $bearer = $request->bearerToken();
        if ($bearer) {
            $user = $this->resolveUser($bearer);
        }

        // 2) Query-param fallback — EventSource cannot send headers
        if (! $user && $request->query('token')) {
            $user = $this->resolveUser((string) $request->query('token'));
        }

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $request->setUserResolver(fn () => $user);

        return $next($request);
    }

    private function resolveUser(string $plainToken)
    {
        $token = PersonalAccessToken::findToken($plainToken);

        if (! $token || $token->revoked) {
            return null;
        }

        if ($token->expires_at !== null && $token->expires_at->isPast()) {
            return null;
        }

        return $token->tokenable;
    }
}
