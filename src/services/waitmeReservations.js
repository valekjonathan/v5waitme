/**
 * Reservas de compra de alertas (WaitMe). Pagos reales pendientes; cierre simulado vía proximidad.
 */

/**
 * @param {Record<string, unknown>} alertUser Fila tal como en mapa / `UserAlertCard` (`user`).
 * @param {string} buyerUserId
 * @returns {{
 *   id: string,
 *   sellerUserId: string,
 *   buyerUserId: string,
 *   price: number,
 *   lockedAmount: number,
 *   status: 'locked',
 *   createdAt: number,
 *   location: { latitude: number, longitude: number } | null,
 *   distanceToUnlock: null,
 *   alertSnapshot: Record<string, unknown>,
 * }}
 */
export function buildReservationFromAlert(alertUser, buyerUserId) {
  const row = alertUser && typeof alertUser === 'object' ? alertUser : {}
  const sellerUserId = String(row.peer_user_id ?? row.user_id ?? row.id ?? '').trim()
  const price = Number(row.price ?? row.priceEUR ?? 0)
  const lat = Number(row.latitude ?? row.lat)
  const lng = Number(row.longitude ?? row.lng)
  const hasLoc = Number.isFinite(lat) && Number.isFinite(lng)
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `res-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

  return {
    id,
    sellerUserId,
    buyerUserId: String(buyerUserId),
    price,
    lockedAmount: price,
    status: 'locked',
    createdAt: Date.now(),
    location: hasLoc ? { latitude: lat, longitude: lng } : null,
    distanceToUnlock: null,
    alertSnapshot: { ...row },
  }
}

/**
 * Liberación simulada del pago (67% vendedor, 33% comisión app).
 * @param {Record<string, unknown>} reservation
 * @returns {Record<string, unknown>}
 */
export function releasePayment(reservation) {
  const price = Number(reservation.price) || 0
  return {
    ...reservation,
    status: 'completed',
    sellerAmount: price * 0.67,
    feeAmount: price * 0.33,
  }
}
