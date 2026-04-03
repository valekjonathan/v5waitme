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
 * Búsqueda forward: Mapbox (country, types, proximity, autocomplete); sin filtrar resultados en cliente.
 * @param {string} query
 * @param {{ signal?: AbortSignal, proximity?: { lng: number, lat: number } | null }} opts
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
  params.set('limit', '8')
  if (proximity && Number.isFinite(proximity.lng) && Number.isFinite(proximity.lat)) {
    params.set('proximity', `${proximity.lng},${proximity.lat}`)
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?${params.toString()}`

  const res = await fetch(url, { signal })
  if (!res.ok) return []
  const data = await res.json()
  const raw = Array.isArray(data.features) ? data.features : []

  if (import.meta.env.DEV) {
    console.log('[geocodingSpain]', { query: q, featureCount: raw.length, features: raw })
  }

  /** Sin filtrar relevancia: solo excluir filas sin `center` (no hay punto en mapa). */
  const rows = []
  for (const f of raw) {
    if (!Array.isArray(f.center) || f.center.length < 2) continue
    const formatted = formatAddress(f)
    rows.push({
      id: String(f.id ?? f.place_name ?? Math.random()),
      label: formatStreetLabel(f),
      subtitle: formatSubtitle(f),
      place_name: formatted,
      formattedSelect: formatted,
      center: [f.center[0], f.center[1]],
    })
  }
  return rows
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

function formatStreetLabel(f) {
  const street = typeof f.text === 'string' ? f.text : ''
  const num =
    (typeof f.address === 'string' && f.address) ||
    (f.properties && typeof f.properties.address === 'string' && f.properties.address) ||
    ''
  let s = street
  if (/^calle\s+/i.test(s)) {
    s = s.replace(/^calle\s+/i, 'C/ ')
  } else if (s && !/^C\//i.test(s)) {
    s = `C/ ${s}`
  }
  if (num) return `${s}, n${num}`
  return s || (typeof f.place_name === 'string' ? f.place_name : '')
}

function formatSubtitle(f) {
  const ctx = Array.isArray(f.context) ? f.context : []
  const locality = ctx.find((c) => (c.id || '').startsWith('place.'))
  const region = ctx.find((c) => (c.id || '').startsWith('region.'))
  const parts = []
  if (locality?.text) parts.push(locality.text)
  if (region?.short_code) {
    const short = String(region.short_code).replace(/^es-/i, '').toUpperCase()
    if (short) parts.push(short)
  }
  return parts.join(' · ')
}

/**
 * Vuela el mapa global al resultado (usa mapControls / instancia).
 */
export function suggestionCenter(s) {
  return Array.isArray(s?.center) && s.center.length >= 2 ? s.center : null
}
