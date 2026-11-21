import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { activeToken } from '../api/client.js'

/**
 * Opens an SSE connection to /api/sse and dispatches events via a callback.
 * EventSource cannot send an Authorization header, so the active Sanctum
 * token is passed as a query parameter (accepted by the SseAuthenticate
 * middleware on this route only). Reconnects on transient errors with a
 * cap, so an invalid/expired token never loops forever. Cleans up on unmount.
 */
export function useSSE(onEvent) {
  const { user } = useAuth()
  const esRef = useRef(null)
  const reconnectTimer = useRef(null)
  const lastEventId = useRef(null)
  const attempts = useRef(0)

  useEffect(() => {
    if (!user) return
    attempts.current = 0
    const MAX_ATTEMPTS = 5
    const BACKOFF_MS = 3000

    function connect() {
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }

      const token = activeToken()
      const params = new URLSearchParams()
      if (token) params.set('token', token)
      if (lastEventId.current) params.set('lastEventId', lastEventId.current)
      const qs = params.toString()
      const es = new EventSource(`/api/sse${qs ? `?${qs}` : ''}`)
      esRef.current = es

      es.onopen = () => {
        attempts.current = 0
        lastEventId.current = null
      }

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data)
          lastEventId.current = String(event.id)
          if (onEvent) onEvent(event)
        } catch {
          // ignore malformed SSE payloads
        }
      }

      es.onerror = () => {
        es.close()
        esRef.current = null
        // Cap reconnects: after MAX_ATTEMPTS give up (e.g. invalid token or
        // backend down) instead of storming 401s every few seconds.
        if (attempts.current >= MAX_ATTEMPTS) {
          if (import.meta.env.DEV) {
            console.warn('[colleris] SSE: giving up after', MAX_ATTEMPTS, 'reconnect attempts')
          }
          return
        }
        attempts.current += 1
        reconnectTimer.current = setTimeout(connect, BACKOFF_MS)
      }
    }

    connect()

    return () => {
      clearTimeout(reconnectTimer.current)
      esRef.current?.close()
      esRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])
}
