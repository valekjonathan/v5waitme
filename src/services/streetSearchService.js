import {
  getMapboxAccessToken,
  OVIEDO_LAT,
  OVIEDO_LNG,
} from '../features/map/constants/mapbox.js'

/**
 * Normalización única para matching (no usar en UI final).
 */
export function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Distancia en metros (fórmula indicada en producto).
 * @param {{ lat: number, lng: number }} a
 * @param {{ lat: number, lng: number }} b
 */
export function distanceMeters(a, b) {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180

  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180

  const x = dLng * Math.cos((lat1 + lat2) / 2)
  const y = dLat

  return Math.sqrt(x * x + y * y) * R
}

/**
 * Solo UI: abreviaturas sobre `feature.text` (nunca para matching).
 */
export function formatStreet(feature) {
  const name = feature?.text != null ? String(feature.text) : ''
  const lower = name.toLowerCase()

  if (lower.includes('calle')) return name.replace(/calle/gi, 'C/:')
  if (lower.includes('avenida')) return name.replace(/avenida/gi, 'Av.')
  if (lower.includes('paseo')) return name.replace(/paseo/gi, 'Pso.')
  if (lower.includes('plaza')) return name.replace(/plaza/gi, 'Plz.')

  return name
}

/**
 * Línea de sugerencia: calle formateada + localidad desde `place_name`.
 */
export function formatSuggestionLabel(feature) {
  const streetUi = formatStreet(feature)
  const pn = typeof feature.place_name === 'string' ? feature.place_name.trim() : ''
  if (!pn) return streetUi
  const parts = pn
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length < 2) return streetUi
  let city = parts[1]
  city = city.replace(/^\d{5}\s*/, '').trim()
  if (city && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(city)) return `${streetUi}, ${city}`
  return streetUi
}

function scoreFeature(feature, query, userPoint) {
  const name = feature.text || ''
  const normalizedName = normalize(name)
  const normalizedQuery = normalize(query)

  const startsWith = normalizedName.startsWith(normalizedQuery)
  const contains = normalizedName.includes(normalizedQuery)

  let dist = 0
  const c = feature.center
  if (
    Array.isArray(c) &&
    c.length >= 2 &&
    userPoint &&
    Number.isFinite(userPoint.lat) &&
    Number.isFinite(userPoint.lng)
  ) {
    const featPt = { lat: c[1], lng: c[0] }
    dist = distanceMeters(userPoint, featPt)
  }

  let score = 0
  if (startsWith) score += 1000
  if (contains) score += 500
  score -= dist * 0.5
  const rel = Number(feature.relevance)
  score += (Number.isFinite(rel) ? rel : 0) * 100

  return { score, dist }
}

/**
 * Búsqueda única Mapbox → score → orden.
 * @param {string} query
 * @param {{ signal?: AbortSignal, proximity?: { lat: number, lng: number } | null }} [options]
 * @returns {Promise<Array<Record<string, unknown> & { score: number, dist: number }>>}
 */
export async function search(query, options = {}) {
  const token = getMapboxAccessToken()
  if (!token) return []

  const raw = typeof query === 'string' ? query.trim() : ''
  if (raw.length < 2) return []

  const { signal, proximity } = options

  let userPoint = null
  if (
    proximity &&
    Number.isFinite(proximity.lat) &&
    Number.isFinite(proximity.lng)
  ) {
    userPoint = { lat: proximity.lat, lng: proximity.lng }
  } else {
    userPoint = { lat: OVIEDO_LAT, lng: OVIEDO_LNG }
  }

  const params = new URLSearchParams({
    access_token: token,
    types: 'address',
    country: 'es',
    language: 'es',
    limit: '8',
    proximity: `${userPoint.lng},${userPoint.lat}`,
  })

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(raw)}.json?${params.toString()}`

  let res
  try {
    res = await fetch(url, { signal })
  } catch {
    return []
  }
  if (!res.ok) return []

  let data
  try {
    data = await res.json()
  } catch {
    return []
  }
  const features = Array.isArray(data.features) ? data.features : []

  const scored = features.map((f) => {
    const { score, dist } = scoreFeature(f, raw, userPoint)
    return { ...f, score, dist }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored
}

/**
 * Payload al elegir una sugerencia (sin reverse geocode).
 */
export function selectionPayload(feature, label) {
  const c = feature?.center
  const lng = Array.isArray(c) && c.length >= 2 ? Number(c[0]) : NaN
  const lat = Array.isArray(c) && c.length >= 2 ? Number(c[1]) : NaN
  const address = typeof label === 'string' && label.trim() ? label.trim() : formatSuggestionLabel(feature)
  return {
    address,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  }
}
