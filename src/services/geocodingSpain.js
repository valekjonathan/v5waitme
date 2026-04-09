import { getMapboxAccessToken } from '../features/map/constants/mapbox.js'
import { distanceMeters } from './location.js'

function foldAscii(s) {
  return String(s)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Abreviaturas de vía para UI (sugerencias y tarjeta). No muta datos crudos del provider.
 */
export function formatStreetName(name) {
  if (name == null || name === '') return name
  let s = String(name)
  const lower = s.toLowerCase()
  if (lower.includes('avenida')) return s.replace(/avenida/i, 'Avd/')
  if (lower.includes('paseo')) return s.replace(/paseo/i, 'Pso/')
  if (lower.includes('plaza')) return s.replace(/plaza/i, 'Plz/')
  if (lower.includes('camino')) return s.replace(/camino/i, 'Cam/')
  if (lower.includes('calle')) return s.replace(/calle/i, 'C/')
  return s
}

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
  return f ? formatAddressForUi(f) : ''
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

function classifyStreetRaw(raw) {
  const s = String(raw || '').trim()
  if (!s) return { prefix: '', body: '' }
  const lower = s.toLowerCase()
  if (/^calle\s+/i.test(s) || /^c\/\s*/i.test(s)) {
    return { prefix: 'C/', body: s.replace(/^calle\s+/i, '').replace(/^c\/\s*/i, '').trim() }
  }
  if (/^avenida\s+/i.test(lower) || /^av\.?\s+/i.test(s)) {
    return { prefix: 'Avd/', body: s.replace(/^avenida\s+/i, '').replace(/^av\.?\s+/i, '').trim() }
  }
  if (/^paseo\s+/i.test(lower)) {
    return { prefix: 'Pso/', body: s.replace(/^paseo\s+/i, '').trim() }
  }
  if (/^plaza\s+/i.test(lower) || /^pl\.?\s+/i.test(s)) {
    return { prefix: 'Plz/', body: s.replace(/^plaza\s+/i, '').replace(/^pl\.?\s+/i, '').trim() }
  }
  if (/^camino\s+/i.test(lower)) {
    return { prefix: 'Cam/', body: s.replace(/^camino\s+/i, '').trim() }
  }
  const body = coreStreetName(s)
  return { prefix: '', body: body || s }
}

/**
 * Dirección legible desde feature Mapbox (tipos de vía: C/, Avd/, Pso/, Plz/, Cam/; resto sin forzar C/).
 */
export function formatAddress(result) {
  if (!result || typeof result !== 'object') return ''
  const raw = typeof result.text === 'string' ? result.text.trim() : ''
  const number = extractStreetNumber(result)
  const city = extractCityFromContext(result)

  if (raw) {
    const { prefix, body } = classifyStreetRaw(raw)
    const street = body
    if (street) {
      const head = prefix ? `${prefix} ${street}`.trim() : street
      if (number && city) return `${head}, ${number}, ${city}`
      if (number) return `${head}, ${number}`
      if (city) return `${head}, ${city}`
      return head
    }
  }

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

/** Misma dirección que `formatAddress`, con abreviaturas unificadas para UI (tarjeta y sugerencias). */
export function formatAddressForUi(result) {
  const line = formatAddress(result)
  return line ? formatStreetName(line) : ''
}

const OVIEDO_CENTER_LAT = 43.3614
const OVIEDO_CENTER_LNG = -5.8493
const USER_NEAR_OVIEDO_M = 35_000

/** Parte “nombre de vía” aproximada para acertar “fray” aunque la etiqueta empiece por C/. */
function streetNameForMatchFolded(foldedFull) {
  let s = foldedFull
  s = s.replace(/^c\/\s*/i, '')
  s = s.replace(/^calle\s+/, '')
  return s.trim()
}

/**
 * Puntuación de texto: varias palabras deben aparecer; prioriza nombre de vía (no solo “empieza por query”).
 * @returns {number} -1 si no cumple tokens obligatorios
 */
function textMatchScore(foldedLabel, qFold) {
  const tokens = qFold.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return 0
  const allPresent = tokens.every((t) => foldedLabel.includes(t))
  if (!allPresent) return -1

  let score = 10_000
  const streetPart = streetNameForMatchFolded(foldedLabel)
  const first = tokens[0]

  if (streetPart.startsWith(first)) score += 5000
  else {
    const idx = streetPart.indexOf(first)
    if (idx === 0) score += 4500
    else if (idx > 0) score += Math.max(0, 3500 - Math.min(idx, 80) * 40)
  }

  if (tokens.length > 1 && foldedLabel.includes(qFold.replace(/\s+/g, ' '))) {
    score += 3000
  }

  if (new RegExp(`(^|[\\s,.-])${escapeRegExp(first)}`, 'i').test(streetPart)) {
    score += 1500
  }

  const early = foldedLabel.indexOf(qFold)
  if (early >= 0) score += Math.max(0, 800 - early)

  return score
}

/**
 * Orden: (a) coincidencia de texto fuerte (b) distancia real (c) Oviedo si el usuario está cerca (d) relevance.
 */
export function rankSpainStreetFeatures(features, query, userLat, userLng) {
  if (!Array.isArray(features) || features.length === 0) return []
  const qFold = foldAscii((query || '').trim())
  if (!qFold) return features
  const hasUser = Number.isFinite(userLat) && Number.isFinite(userLng)
  const userNearOviedo =
    hasUser && distanceMeters(userLat, userLng, OVIEDO_CENTER_LAT, OVIEDO_CENTER_LNG) < USER_NEAR_OVIEDO_M

  const labelOf = (f) =>
    formatAddressForUi(f) ||
    formatAddress(f) ||
    (typeof f.place_name === 'string' ? f.place_name : '') ||
    (typeof f.text === 'string' ? f.text : '') ||
    ''

  const distM = (f) => {
    const c = f.center
    if (!Array.isArray(c) || c.length < 2 || !hasUser) return Number.POSITIVE_INFINITY
    return distanceMeters(userLat, userLng, c[1], c[0])
  }

  const relOf = (f) => (typeof f.relevance === 'number' && Number.isFinite(f.relevance) ? f.relevance : 0)

  const scoreRow = (f) => {
    const label = labelOf(f)
    const folded = foldAscii(label)
    let textScore = textMatchScore(folded, qFold)
    if (textScore < 0) {
      if (folded.includes(qFold)) textScore = 1000
      else textScore = -1
    }
    const city = extractCityFromContext(f)
    const oviedoTier = userNearOviedo && foldAscii(city) === 'oviedo' ? 1 : 0
    return { f, textScore, dist: distM(f), oviedoTier, rel: relOf(f) }
  }

  const rows = features.map(scoreRow)
  const matched = rows.filter((r) => r.textScore >= 0)
  const pool = matched.length ? matched : rows

  pool.sort((a, b) => {
    if (b.textScore !== a.textScore) return b.textScore - a.textScore
    const da = a.dist
    const db = b.dist
    if (hasUser && Number.isFinite(da) && Number.isFinite(db)) {
      if (da !== db) return da - db
    } else if (Number.isFinite(da) !== Number.isFinite(db)) {
      return Number.isFinite(da) ? -1 : 1
    }
    if (b.oviedoTier !== a.oviedoTier) return b.oviedoTier - a.oviedoTier
    if (b.rel !== a.rel) return b.rel - a.rel
    return 0
  })

  return pool.map((r) => r.f)
}

function coreStreetName(text) {
  let s = String(text || '').trim()
  if (!s) return ''
  if (/^calle\s+/i.test(s)) return s.replace(/^calle\s+/i, '').trim()
  if (/^(av\.?|avenida)\s+/i.test(s)) return s.replace(/^(av\.?|avenida)\s+/i, '').trim()
  if (/^paseo\s+/i.test(s)) return s.replace(/^paseo\s+/i, '').trim()
  if (/^(pl\.?|plaza)\s+/i.test(s)) return s.replace(/^(pl\.?|plaza)\s+/i, '').trim()
  if (/^camino\s+/i.test(s)) return s.replace(/^camino\s+/i, '').trim()
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
