/**
 * ID de usuario para abrir reseñas desde una tarjeta (mapa, lista chats).
 * Prioriza `peer_user_id` (DM); nunca usa `id` de hilo / fila como si fuera usuario.
 * @param {Record<string, unknown> | null | undefined} alert
 * @returns {string}
 */
export function resolveReviewsTargetUserId(alert) {
  if (!alert || typeof alert !== 'object') return ''
  const peer = String(alert.peer_user_id ?? '').trim()
  if (peer) return peer
  const uid = String(alert.user_id ?? '').trim()
  const rowId = String(alert.id ?? '').trim()
  if (uid && rowId && uid === rowId) return ''
  return uid
}
