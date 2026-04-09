import {
  getMapboxAccessToken,
  OVIEDO_LAT,
  OVIEDO_LNG,
} from '../features/map/constants/mapbox.js'

const SUGGEST_BASE = 'https://api.mapbox.com/search/searchbox/v1/suggest'

/**
 * Token de sesión Search Box (UUID recomendado); agrupa suggest + retrieve para facturación.
 */
export function newSearchSessionToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function rankResults(query, results) {
  const q = normalize(query)

  return results
    .map((r) => {
      const name = normalize(r.name || '')
      const full = normalize(r.full_address || '')

      const starts = name.startsWith(q)
      const contains = name.includes(q) || full.includes(q)

      let dist = 999999
      if (typeof r.distance === 'number' && Number.isFinite(r.distance)) {
        dist = r.distance
      }

      let score = 0

      if (starts) score += 1000
      if (contains) score += 500

      score -= dist * 0.5

      const rel = Number(r.relevance)
      score += (Number.isFinite(rel) ? rel : 0) * 100

      return { ...r, score }
    })
    .sort((a, b) => b.score - a.score)
}

/**
 * @param {string} query
 * @param {{ latitude?: number, longitude?: number, sessionToken: string }} userLocation
 * @param {AbortSignal} [signal]
 */
export async function searchStreets(query, userLocation, signal) {
  const token = getMapboxAccessToken()
  if (!token) return []

  if (!query || String(query).trim().length < 2) return []

  const raw = String(query).trim()
  const sessionToken = userLocation?.sessionToken
  if (!sessionToken) return []

  let latitude = userLocation?.latitude
  let longitude = userLocation?.longitude
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    latitude = OVIEDO_LAT
    longitude = OVIEDO_LNG
  }

  const params = new URLSearchParams({
    q: raw,
    language: 'es',
    country: 'es',
    limit: '8',
    proximity: `${longitude},${latitude}`,
    types: 'address',
    session_token: sessionToken,
    access_token: token,
  })

  const url = `${SUGGEST_BASE}?${params.toString()}`

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

  const suggestions = data.suggestions || []
  return rankResults(raw, suggestions)
}

/**
 * @param {string} mapboxId
 * @param {string} sessionToken — mismo token que en los suggest previos
 * @param {AbortSignal} [signal]
 * @returns {Promise<object | null>}
 */
export async function retrieveStreetSuggestion(mapboxId, sessionToken, signal) {
  const token = getMapboxAccessToken()
  if (!token || mapboxId == null || mapboxId === '' || !sessionToken) return null

  const id = encodeURIComponent(String(mapboxId))
  const params = new URLSearchParams({
    session_token: sessionToken,
    access_token: token,
  })
  const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${id}?${params.toString()}`

  let res
  try {
    res = await fetch(url, { signal })
  } catch {
    return null
  }
  if (!res.ok) return null

  let data
  try {
    data = await res.json()
  } catch {
    return null
  }

  const feature = Array.isArray(data.features) ? data.features[0] : null
  return feature || null
}

export function formatStreet(r) {
  let name = r?.name != null ? String(r.name) : ''
  const lower = name.toLowerCase()

  if (lower.includes('calle')) return name.replace(/calle/i, 'C/:')
  if (lower.includes('avenida')) return name.replace(/avenida/i, 'Av.')
  if (lower.includes('paseo')) return name.replace(/paseo/i, 'Pso.')
  if (lower.includes('plaza')) return name.replace(/plaza/i, 'Plz.')

  return name
}

export function formatSuggestionLabel(suggestion) {
  if (!suggestion || typeof suggestion !== 'object') return ''
  const fa = typeof suggestion.full_address === 'string' ? suggestion.full_address.trim() : ''
  if (fa) {
    const n = typeof suggestion.name === 'string' ? suggestion.name.trim() : ''
    if (n && fa.startsWith(n)) {
      return formatStreet(suggestion) + fa.slice(n.length)
    }
    return fa
  }
  const street = formatStreet(suggestion)
  const pf = typeof suggestion.place_formatted === 'string' ? suggestion.place_formatted.trim() : ''
  return pf ? `${street}, ${pf}` : street
}

/**
 * Payload tras `/retrieve` (coordenadas en `properties.coordinates`).
 * @param {object | null | undefined} retrievedFeature
 */
export function selectionPayload(retrievedFeature) {
  const props = retrievedFeature?.properties
  const coords = props?.coordinates
  const lat = coords?.latitude
  const lng = coords?.longitude
  return {
    address: formatStreet({ name: props?.name }),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  }
}

/**
 * @param {string} query
 * @param {{ signal?: AbortSignal, proximity?: { lat: number, lng: number } | null, sessionToken?: string }} [options]
 */
export async function search(query, options = {}) {
  const { signal, proximity, sessionToken } = options
  if (!sessionToken) return []
  return searchStreets(
    query,
    {
      latitude: proximity?.lat,
      longitude: proximity?.lng,
      sessionToken,
    },
    signal
  )
}
