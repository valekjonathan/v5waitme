import posthog from 'posthog-js'
import { posthogKey } from './analytics.js'
import { buildExceptionCapturePayload } from './exceptionEventPayload.js'

/**
 * Envía un error a PostHog si la clave está configurada. Nunca lanza.
 * @param {{
 *   error: unknown
 *   boundaryName?: string
 *   source: string
 *   extra?: Record<string, unknown>
 * }} opts
 */
export function captureClientError({ error, boundaryName, source, extra }) {
  try {
    if (typeof window === 'undefined') return
    if (posthogKey == null || String(posthogKey).trim() === '') return
    if (typeof posthog.capture !== 'function') return
    const payload = buildExceptionCapturePayload({ error, boundaryName, source, extra })
    posthog.capture('$exception', payload)
  } catch {
    /* PostHog no debe romper la app */
  }
}
