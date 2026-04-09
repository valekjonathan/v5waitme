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

  const scored = results.map((r, sortIdx) => {
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

    return { ...r, score, _sortIdx: sortIdx }
  })

  scored.sort((a, b) => {
    const d = b.score - a.score
    if (d !== 0) return d
    return a._sortIdx - b._sortIdx
  })

  return scored.map(({ _sortIdx, ...rest }) => rest)
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
    /** Calles + direcciones; solo `address` devolvía demasiado vacío en autocompletado parcial. */
    types: 'street,address',
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

  const suggestions = Array.isArray(data.suggestions) ? data.suggestions : []
  if (import.meta.env.DEV) {
    console.log('[streetSearch] pipeline', {
      query: raw,
      suggestionCount: suggestions.length,
      first: suggestions[0]?.name,
    })
  }
  if (suggestions.length === 0) return []

  return rankResults(raw, suggestions)
}

/**
 * `/retrieve` + payload de dirección (una sola llamada para UI).
 * @param {string} mapboxId
 * @param {string} sessionToken
 * @param {AbortSignal} [signal]
 */
export async function fetchSelectionPayloadForSuggestion(mapboxId, sessionToken, signal) {
  const feature = await retrieveStreetSuggestion(mapboxId, sessionToken, signal)
  if (!feature) return null
  return selectionPayload(feature)
}

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

/**
 * Texto tal cual Mapbox (sin abreviar ni transformar).
 */
export function suggestionDisplayText(suggestion) {
  if (!suggestion || typeof suggestion !== 'object') return ''
  const fa = typeof suggestion.full_address === 'string' ? suggestion.full_address.trim() : ''
  if (fa) return fa
  return suggestion.name != null ? String(suggestion.name).trim() : ''
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
  const fa = typeof props?.full_address === 'string' ? props.full_address.trim() : ''
  const name = props?.name != null ? String(props.name).trim() : ''
  const address = fa || name || ''
  return {
    address,
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
