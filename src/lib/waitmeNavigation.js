/**
 * Navegación externa (Google Maps) solo cuando la alerta está en estado operativo real.
 * @param {Record<string, unknown> | null | undefined} alert
 * @returns {boolean}
 */
export function isNavigationEnabledForAlert(alert) {
  if (!alert || typeof alert !== 'object') return false
  const st = String(alert.status ?? '').trim().toLowerCase()
  return st === 'accepted' || st === 'in_progress'
}

/**
 * Abre Maps en el punto (mismo patrón que producto: q=lat,lng).
 * @param {number} lat
 * @param {number} lng
 */
export function openGoogleMapsAt(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
  window.location.href = `https://www.google.com/maps?q=${encodeURIComponent(String(lat))},${encodeURIComponent(String(lng))}`
}
