/**
 * Constantes y token Mapbox sin importar `mapbox-gl` (evita incluir GL en el bundle inicial).
 */

export const OVIEDO_LAT = 43.3619
export const OVIEDO_LNG = -5.8494

export const DEFAULT_ZOOM = 16.5
export const DEFAULT_PITCH = 30

export function getMapboxAccessToken(env = import.meta.env) {
  const t = env?.VITE_MAPBOX_ACCESS_TOKEN
  if (typeof t === 'string' && t.trim()) return t.trim()
  return null
}
