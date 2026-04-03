import { getMapboxAccessToken } from '../features/map/constants/mapbox.js'

/**
 * Geocodificación inversa (Mapbox): dirección legible a partir de coordenadas.
 * @param {number} lat
 * @param {number} lng
 * @param {{ signal?: AbortSignal }} opts
 * @returns {Promise<string>}
 */
export async function reverseGeocodeMapbox(lat, lng, opts = {}) {
  const { signal } = opts
  const token = getMapboxAccessToken()
  if (!token || !Number.isFinite(lat) || !Number.isFinite(lng)) return ''
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    lng
  )},${encodeURIComponent(lat)}.json?access_token=${encodeURIComponent(token)}&country=es&language=es&limit=1`
  const res = await fetch(url, { signal })
  if (!res.ok) return ''
  const data = await res.json()
  const f = data?.features?.[0]
  return f ? formatAddress(f) : ''
}

/**
 * Forward geocoding: respuesta Mapbox sin transformar en cliente (pinta StreetSearch).
 * @param {string} query
 * @param {{ signal?: AbortSignal, proximity?: { lng: number, lat: number } | null }} opts
 * @returns {Promise<Array>}
 */
export async function searchSpainStreets(query, opts = {}) {
  const { signal, proximity } = opts
  const token = getMapboxAccessToken()
  const q = typeof query === 'string' ? query.trim() : ''
  if (!token || q.length < 2) return []

  const params = new URLSearchParams()
  params.set('access_token', token)
  params.set('country', 'es')
  params.set('language', 'es')
  params.set('types', 'address,street')
  params.set('autocomplete', 'true')
  params.set('limit', '10')
  if (proximity && Number.isFinite(proximity.lng) && Number.isFinite(proximity.lat)) {
    params.set('proximity', `${proximity.lng},${proximity.lat}`)
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?${params.toString()}`

  const res = await fetch(url, { signal })
  let data = {}
  try {
    data = await res.json()
  } catch {
    return []
  }

  if (import.meta.env.DEV) {
    const safeUrl = url.replace(/access_token=[^&]+/i, 'access_token=***')
    console.log('MAPBOX:', {
      query: q,
      url: safeUrl,
      count: data.features?.length,
      sample: data.features?.slice(0, 3),
    })
  }

  if (!res.ok) return []
  return data.features || []
}

/**
 * Formato único: `C/ Muérdago, 9, Oviedo` (nombre de vía sin prefijo duplicado).
 */
export function formatAddress(result) {
  if (!result || typeof result !== 'object') return ''
  const raw = typeof result.text === 'string' ? result.text.trim() : ''
  const street = coreStreetName(raw)
  const number = extractStreetNumber(result)
  const city = extractCityFromContext(result)
  if (street && number && city) return `C/ ${street}, ${number}, ${city}`
  if (street && city) return `C/ ${street}, ${city}`
  if (typeof result.place_name === 'string' && result.place_name.trim())
    return result.place_name.trim()
  return ''
}

function coreStreetName(text) {
  let s = String(text || '').trim()
  if (!s) return ''
  if (/^calle\s+/i.test(s)) return s.replace(/^calle\s+/i, '').trim()
  if (/^(av\.?|avenida)\s+/i.test(s)) return s.replace(/^(av\.?|avenida)\s+/i, '').trim()
  if (/^(pl\.?|plaza)\s+/i.test(s)) return s.replace(/^(pl\.?|plaza)\s+/i, '').trim()
  if (/^C\/\s*/i.test(s)) return s.replace(/^C\/\s*/i, '').trim()
  return s
}

/** Alias de `formatAddress` para imports existentes. */
export function formatSelectedAddressFromMapboxFeature(f) {
  return formatAddress(f)
}

function extractStreetNumber(f) {
  const a =
    (typeof f.address === 'string' && f.address.trim()) ||
    (f.properties && typeof f.properties.address === 'string' && f.properties.address.trim()) ||
    ''
  return a || ''
}

function extractCityFromContext(f) {
  const ctx = Array.isArray(f.context) ? f.context : []
  const place = ctx.find((c) => (c.id || '').startsWith('place.'))
  const locality = ctx.find((c) => (c.id || '').startsWith('locality.'))
  return (place?.text || locality?.text || '').trim() || 'Oviedo'
}

/**
 * Centro Mapbox Feature → [lng, lat]
 */
export function suggestionCenter(f) {
  const c = f?.center
  return Array.isArray(c) && c.length >= 2 ? c : null
}
