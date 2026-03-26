/**
 * Convierte razones heterogéneas (onerror / unhandledrejection) en Error estable.
 * No lanza (fallback a mensaje genérico si JSON.stringify falla).
 * @param {unknown} reason
 * @param {string} [fallbackMessage]
 */
export function normalizeToError(reason, fallbackMessage = 'unknown_error') {
  if (reason instanceof Error) return reason
  if (reason == null) return new Error(fallbackMessage)
  if (typeof reason === 'string') return new Error(reason)
  if (typeof reason === 'object' && typeof reason.message === 'string') {
    const e = new Error(reason.message)
    if (typeof reason.name === 'string' && reason.name) e.name = reason.name
    if (typeof reason.stack === 'string') e.stack = reason.stack
    return e
  }
  try {
    return new Error(JSON.stringify(reason))
  } catch {
    return new Error(String(reason))
  }
}
