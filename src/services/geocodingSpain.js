import { getMapboxAccessToken } from '../features/map/constants/mapbox.js'
import { distanceMeters } from './location.js'

/**
 * Normalización única para matching de consulta y textos del provider (sin abreviaturas).
 */
export function normalizeSearchText(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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

/** Textos REALES del feature para matching (nunca abreviados). */
function featureMatchSources(f) {
  const rawPlace = typeof f.place_name === 'string' ? f.place_name.trim() : ''
  const rawStreet = typeof f.text === 'string' ? f.text.trim() : ''
  const ctxParts = []
  if (Array.isArray(f.context)) {
    for (const c of f.context) {
      const t = c && typeof c.text === 'string' ? c.text.trim() : ''
      if (t) ctxParts.push(t)
    }
  }
  const fullBlobRaw = [rawPlace, rawStreet, ctxParts.join(' ')].filter(Boolean).join(', ')
  return {
    rawPlace,
    rawStreet,
    fullBlobNorm: normalizeSearchText(fullBlobRaw),
    streetNorm: normalizeSearchText(rawStreet),
    placeNorm: normalizeSearchText(rawPlace),
  }
}

/**
 * Dirección “cruda” legible (palabras completas; sin abreviaturas de UI).
 */
export function formatAddress(result) {
  if (!result || typeof result !== 'object') return ''
  const raw = typeof result.text === 'string' ? result.text.trim() : ''
  const number = extractStreetNumber(result)
  const city = extractCityFromContext(result)

  if (raw) {
    const street = raw
    if (number && city) return `${street}, ${number}, ${city}`
    if (number) return `${street}, ${number}`
    if (city) return `${street}, ${city}`
    return street
  }

  const pn = typeof result.place_name === 'string' ? result.place_name.trim() : ''
  if (pn) return pn

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

/**
 * Solo visualización: abreviaturas; no usar para matching.
 * Calle → "C/:" · resto según spec.
 */
function applyVisualStreetAbbreviations(line) {
  if (line == null || line === '') return line
  let s = String(line)
  s = s.replace(/\bcalle\b/gi, 'C/:')
  s = s.replace(/\bavenida\b/gi, 'Av.')
  s = s.replace(/\bpaseo\b/gi, 'Pso.')
  s = s.replace(/\bplaza\b/gi, 'Plz.')
  s = s.replace(/\bcamino\b/gi, 'Cam.')
  return s
}

/** Etiqueta para lista de sugerencias y reverse geocode en tarjeta. */
export function formatAddressForUi(result) {
  const line = formatAddress(result)
  return line ? applyVisualStreetAbbreviations(line) : ''
}

/**
 * Forward geocoding Mapbox (una sola configuración).
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

/**
 * Ranking: texto fuerte → distancia real → relevancia; empates por distancia y nombre.
 */
export function rankSpainStreetFeatures(features, query, userLat, userLng) {
  if (!Array.isArray(features) || features.length === 0) return []

  const qNorm = normalizeSearchText(query)
  if (qNorm.length < 2) return features

  const words = qNorm.split(/\s+/).filter(Boolean)
  const hasUser = Number.isFinite(userLat) && Number.isFinite(userLng)

  const scoreOne = (f) => {
    const src = featureMatchSources(f)
    const { fullBlobNorm, streetNorm, placeNorm } = src

    const anyWord = words.length ? words.some((w) => fullBlobNorm.includes(w)) : false
    const allWords = words.length ? words.every((w) => fullBlobNorm.includes(w)) : false
    if (!anyWord && !fullBlobNorm.includes(qNorm)) return null

    const startsFull =
      streetNorm.startsWith(qNorm) ||
      placeNorm.startsWith(qNorm) ||
      fullBlobNorm.startsWith(qNorm)

    const startsFirst =
      Boolean(words[0]) &&
      (streetNorm.startsWith(words[0]) ||
        placeNorm.startsWith(words[0]) ||
        fullBlobNorm.startsWith(words[0]))

    const streetFieldMatch = words.some((w) => streetNorm.includes(w))

    const c = f.center
    let distM = Number.POSITIVE_INFINITY
    if (hasUser && Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
      distM = distanceMeters(userLat, userLng, c[1], c[0])
    }

    const localityNear =
      hasUser && Number.isFinite(distM) && distM < 12_000 ? 1 : 0

    const rel = typeof f.relevance === 'number' && Number.isFinite(f.relevance) ? f.relevance : 0

    const startsWithFullQueryBonus = startsFull ? 1_000_000 : 0
    const containsAllWordsBonus = allWords ? 800_000 : 0
    const startsWithFirstWordBonus = startsFirst ? 500_000 : 0
    const streetFieldMatchBonus = streetFieldMatch ? 400_000 : 0
    const localityNearUserBonus = localityNear ? 200_000 : 0
    const providerRelevanceBonus = rel * 50_000
    const distancePenalty = Number.isFinite(distM) ? distM * 8 : 0

    const score =
      startsWithFullQueryBonus +
      containsAllWordsBonus +
      startsWithFirstWordBonus +
      streetFieldMatchBonus +
      localityNearUserBonus +
      providerRelevanceBonus -
      distancePenalty

    const labelLen = (src.rawPlace || src.rawStreet || '').length

    return { f, score, distM, rel, labelLen }
  }

  const rows = []
  for (const f of features) {
    const row = scoreOne(f)
    if (row) rows.push(row)
  }

  if (rows.length === 0) {
    for (const f of features) {
      const src = featureMatchSources(f)
      if (!words[0] || !src.fullBlobNorm.includes(words[0])) continue
      const c = f.center
      let distM = Number.POSITIVE_INFINITY
      if (hasUser && Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
        distM = distanceMeters(userLat, userLng, c[1], c[0])
      }
      const rel = typeof f.relevance === 'number' && Number.isFinite(f.relevance) ? f.relevance : 0
      const score = 100_000 + rel * 50_000 - (Number.isFinite(distM) ? distM * 8 : 0)
      rows.push({
        f,
        score,
        distM,
        rel,
        labelLen: (src.rawPlace || src.rawStreet || '').length,
      })
    }
  }

  if (rows.length === 0) return []

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const da = Number.isFinite(a.distM) ? a.distM : Number.POSITIVE_INFINITY
    const db = Number.isFinite(b.distM) ? b.distM : Number.POSITIVE_INFINITY
    if (da !== db) return da - db
    if (b.rel !== a.rel) return b.rel - a.rel
    return a.labelLen - b.labelLen
  })

  return rows.map((r) => r.f)
}

/**
 * Geocodificación inversa: una feature → texto visual para tarjeta.
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
