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
  // Mapbox Geocoding v5 solo admite: country, region, place, district, locality, postcode, neighborhood, address (no "street"; 422 si se incluye).
  params.set('types', 'address')
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

  if (!res.ok) return []
  return Array.isArray(data.features) ? data.features : []
}

/**
 * Formato único: `C/ Muérdago, 9, Oviedo` (nombre de vía sin prefijo duplicado).
 * No devuelve vacío si el feature trae `place_name`, `text` o contexto útil.
 */
export function formatAddress(result) {
  if (!result || typeof result !== 'object') return ''
  const raw = typeof result.text === 'string' ? result.text.trim() : ''
  const street = coreStreetName(raw)
  const number = extractStreetNumber(result)
  const city = extractCityFromContext(result)

  if (street && number && city) return `C/ ${street}, ${number}, ${city}`
  if (street && number) return `C/ ${street}, ${number}`
  if (street && city) return `C/ ${street}, ${city}`
  if (street) return `C/ ${street}`

  const pn = typeof result.place_name === 'string' ? result.place_name.trim() : ''
  if (pn) return pn

  if (raw && city) return `${raw}, ${city}`
  if (raw) return raw

  const ctx = Array.isArray(result.context) ? result.context : []
  const ctxParts = []
  for (const c of ctx) {
    const t = c && typeof c.text === 'string' ? c.text.trim() : ''
    if (t) ctxParts.push(t)
  }
  if (ctxParts.length) return ctxParts.join(', ')

  if (result.id != null && String(result.id).trim()) {
    return String(result.id).trim()
  }

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

function extractStreetNumber(f) {
  const props = f && typeof f.properties === 'object' && f.properties !== null ? f.properties : {}
  const numStr = (v) =>
    typeof v === 'number' && Number.isFinite(v) ? String(v) : typeof v === 'string' ? v.trim() : ''
  const a =
    (typeof f.address === 'string' && f.address.trim()) ||
    numStr(f.address) ||
    (typeof props.address === 'string' && props.address.trim()) ||
    numStr(props.address) ||
    (typeof props.address_number === 'string' && props.address_number.trim()) ||
    numStr(props.address_number) ||
    (typeof props.housenumber === 'string' && props.housenumber.trim()) ||
    (typeof props.house_number === 'string' && props.house_number.trim()) ||
    ''
  return a || ''
}

function extractCityFromContext(f) {
  const ctx = Array.isArray(f.context) ? f.context : []
  const place = ctx.find((c) => (c.id || '').startsWith('place.'))
  const locality = ctx.find((c) => (c.id || '').startsWith('locality.'))
  const region = ctx.find((c) => (c.id || '').startsWith('region.'))
  return (place?.text || locality?.text || '').trim() || (region?.text || '').trim() || ''
}
