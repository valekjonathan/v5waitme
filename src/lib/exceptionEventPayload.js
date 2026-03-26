/**
 * Propiedades del evento PostHog `$exception` (lógica pura; testeable sin mock de red).
 * @param {{
 *   error: unknown
 *   boundaryName?: string
 *   source: string
 *   extra?: Record<string, unknown>
 * }} opts
 */
import { classifyClientErrorSeverity } from './classifyClientErrorSeverity.js'

export function buildExceptionCapturePayload({ error, boundaryName, source, extra }) {
  const err = error instanceof Error ? error : null
  const message = err ? err.message : String(error ?? 'unknown')
  const stack = err?.stack ?? ''
  const name = err?.name ?? 'Error'
  const error_severity = classifyClientErrorSeverity({ source, message })
  return {
    $exception_message: message,
    $exception_type: name,
    $exception_stack_trace_raw: stack,
    boundary_name: boundaryName ?? null,
    error_source: source,
    error_severity,
    ...(extra && typeof extra === 'object' ? extra : {}),
  }
}
