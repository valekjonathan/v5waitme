/**
 * UI: 4 estrellas visibles; media global mostrada /10. Datos internos 1–5.
 */
const RATING_STAR_COUNT = 4

/**
 * Media datos 1–5 → escala visual 4★ → /10 (equivalente a (avg5/5)*4 luego *10/4).
 * @param {number} avgOn5
 */
export function average5ToDisplay10(avgOn5) {
  const avg5 = Number(avgOn5)
  if (!Number.isFinite(avg5)) return 0
  const avg4 = (avg5 / 5) * 4
  return +((avg4 / 4) * 10).toFixed(1)
}

/**
 * Media en escala 1–5 → estrellas rellenas en UI (0–4).
 * @param {number} avgOn5
 */
export function filledStarsFromAverage5(avgOn5) {
  const a = Number(avgOn5)
  if (!Number.isFinite(a)) return 0
  const normalized = (a / 5) * RATING_STAR_COUNT
  return Math.max(0, Math.min(RATING_STAR_COUNT, Math.round(normalized)))
}

/**
 * Valoración 1–5 → estrellas ★ repetidas (escala visual 0–4).
 * @param {number} ratingOn5
 * @returns {string}
 */
export function renderStars(ratingOn5) {
  const normalized = ((Number(ratingOn5) || 0) / 5) * RATING_STAR_COUNT
  const safe = Math.max(0, Math.min(RATING_STAR_COUNT, Math.round(normalized)))
  return '★'.repeat(safe)
}

/**
 * Cuatro slots ★/☆ — `filledCount` es 0–4 (tras normalizar desde media o rating).
 * @param {number} filledCount
 * @returns {readonly ('★' | '☆')[]}
 */
export function renderHeaderStarSlots(filledCount) {
  const r = Math.max(0, Math.min(RATING_STAR_COUNT, Math.round(Number(filledCount) || 0)))
  return Array.from({ length: RATING_STAR_COUNT }, (_, i) => (i < r ? '★' : '☆'))
}
