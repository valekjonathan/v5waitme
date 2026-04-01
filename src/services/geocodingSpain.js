import { getMapboxAccessToken } from '../features/map/constants/mapbox.js'

/**
 * Búsqueda de direcciones en España (Mapbox Geocoding).
 * @param {string} query
 * @param {{ signal?: AbortSignal }} opts
 * @returns {Promise<Array<{ id: string, label: string, subtitle: string, center: [number, number] }>>}
 */
export async function searchSpainStreets(query, opts = {}) {
  const { signal } = opts
  const token = getMapboxAccessToken()
  const q = typeof query === 'string' ? query.trim() : ''
  if (!token || q.length < 2) return []

  const encoded = encodeURIComponent(q)
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${encodeURIComponent(
    token
  )}&country=es&types=address&limit=8&language=es&autocomplete=true`

  const res = await fetch(url, { signal })
  if (!res.ok) return []
  const data = await res.json()
  const features = Array.isArray(data.features) ? data.features : []

  return features.map((f) => ({
    id: String(f.id ?? f.place_name ?? Math.random()),
    label: formatStreetLabel(f),
    subtitle: formatSubtitle(f),
    center: Array.isArray(f.center) && f.center.length >= 2 ? [f.center[0], f.center[1]] : null,
  }))
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

  if (num) {
    return `${s}, n${num}`
  }
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
