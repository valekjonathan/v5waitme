import { getMapboxAccessToken } from '../features/map/constants/mapbox.js'

/**
 * Normalización para coincidencia (minúsculas, sin acentos).
 */
export function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function distanceSq(a, b) {
  const dx = a.lng - b.lng
  const dy = a.lat - b.lat
  return dx * dx + dy * dy
}

function streetNameForMatchNormalized(labelNorm) {
  return labelNorm
    .replace(/^c\/:\s*/i, '')
    .replace(/^c\/\s*/i, '')
    .replace(/^calle\s+/, '')
    .trim()
}

/**
 * Abreviaturas de vía para UI (sugerencias y tarjeta).
 */
export function formatStreetName(name) {
  if (name == null || name === '') return name
  let s = String(name)
  const lower = s.toLowerCase()
  if (lower.includes('avenida')) return s.replace(/avenida/i, 'Avd/')
  if (lower.includes('paseo')) return s.replace(/paseo/i, 'Pso/')
  if (lower.includes('plaza')) return s.replace(/plaza/i, 'Plz/')
  if (lower.includes('camino')) return s.replace(/camino/i, 'Cam/')
  if (lower.includes('calle')) return s.replace(/calle/i, 'C/:')
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
  if (/^calle\s+/i.test(s) || /^c\/\s*/i.test(s) || /^c\/:\s*/i.test(s)) {
    return {
      prefix: 'C/:',
      body: s
        .replace(/^calle\s+/i, '')
        .replace(/^c\/:\s*/i, '')
        .replace(/^c\/\s*/i, '')
        .trim(),
    }
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
 * Dirección legible desde feature Mapbox.
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

/**
 * Orden local: score = texto − distancia²×100000 (sin confiar en el orden Mapbox).
 */
export function rankSpainStreetFeatures(features, query, userLat, userLng) {
  if (!Array.isArray(features) || features.length === 0) return []
  const queryNorm = normalize(query).trim()
  if (queryNorm.length < 2) return features

  const words = queryNorm.split(/\s+/).filter(Boolean)
  const userPos =
    Number.isFinite(userLat) && Number.isFinite(userLng)
      ? { lng: userLng, lat: userLat }
      : null

  const labelOf = (f) =>
    formatAddressForUi(f) ||
    formatAddress(f) ||
    (typeof f.place_name === 'string' ? f.place_name : '') ||
    (typeof f.text === 'string' ? f.text : '') ||
    ''

  const scoreFeature = (f, loose) => {
    const label = labelOf(f)
    const labelNorm = normalize(label)

    const allWordsMatch = words.length > 0 && words.every((w) => labelNorm.includes(w))
    const substringStrong = labelNorm.includes(queryNorm)
    if (!loose && !allWordsMatch && !substringStrong) return null
    if (loose && !labelNorm.includes(words[0] || queryNorm)) return null

    const empiezaPorTexto =
      labelNorm.startsWith(queryNorm) ||
      streetNameForMatchNormalized(labelNorm).startsWith(queryNorm) ||
      (words[0] && streetNameForMatchNormalized(labelNorm).startsWith(words[0]))

    const contieneTexto = substringStrong || allWordsMatch

    const c = f.center
    let distSq = 1e6
    if (userPos && Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
      distSq = distanceSq({ lng: c[0], lat: c[1] }, userPos)
    }

    const score =
      (empiezaPorTexto ? 1000 : 0) + (contieneTexto ? 500 : 0) - distSq * 100000

    return { f, score }
  }

  const scored = []
  for (const f of features) {
    const row = scoreFeature(f, false)
    if (row) scored.push(row)
  }

  if (scored.length === 0) {
    for (const f of features) {
      const row = scoreFeature(f, true)
      if (row) scored.push(row)
    }
  }

  if (scored.length === 0) return []

  scored.sort((a, b) => b.score - a.score)
  return scored.map((s) => s.f)
}

function coreStreetName(text) {
  let s = String(text || '').trim()
  if (!s) return ''
  if (/^calle\s+/i.test(s)) return s.replace(/^calle\s+/i, '').trim()
  if (/^(av\.?|avenida)\s+/i.test(s)) return s.replace(/^(av\.?|avenida)\s+/i, '').trim()
  if (/^paseo\s+/i.test(s)) return s.replace(/^paseo\s+/i, '').trim()
  if (/^(pl\.?|plaza)\s+/i.test(s)) return s.replace(/^(pl\.?|plaza)\s+/i, '').trim()
  if (/^camino\s+/i.test(s)) return s.replace(/^camino\s+/i, '').trim()
  if (/^C\/:\s*/i.test(s)) return s.replace(/^C\/:\s*/i, '').trim()
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
