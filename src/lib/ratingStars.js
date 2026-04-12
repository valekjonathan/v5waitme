/** Escala de valoración en toda la app (estrellas visibles). */
export const RATING_STAR_COUNT = 4

/**
 * Solo estrellas rellenas (★) — listas de reseñas, ratings compactos.
 * @param {number} rating
 * @returns {string}
 */
export function renderStars(rating) {
  const safe = Math.max(0, Math.min(RATING_STAR_COUNT, Math.round(Number(rating) || 0)))
  return '★'.repeat(safe)
}

/**
 * Cuatro slots ★/☆ según rating — header amarillo y sitios que muestran escala completa.
 * @param {number} rating
 * @returns {readonly ('★' | '☆')[]}
 */
export function renderHeaderStarSlots(rating) {
  const r = Math.max(0, Math.min(RATING_STAR_COUNT, Math.round(Number(rating) || 0)))
  return Array.from({ length: RATING_STAR_COUNT }, (_, i) => (i < r ? '★' : '☆'))
}
