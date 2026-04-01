import mapboxgl from 'mapbox-gl'

/** Single source for default map / GPS fallback (Map + config). */
export const OVIEDO_LAT = 43.3619
export const OVIEDO_LNG = -5.8494
const OVIEDO_CENTER = [OVIEDO_LNG, OVIEDO_LAT]
const DARK_STYLE = 'mapbox://styles/mapbox/dark-v11'
const ROAD_COLOR = '#8b5cf6'

/** Ciclo: vista actual (dark) → mapa claro → satélite. */
export const MAP_STYLE_CYCLE = [
  DARK_STYLE,
  'mapbox://styles/mapbox/light-v11',
  'mapbox://styles/mapbox/satellite-streets-v12',
]

export { DARK_STYLE }

/**
 * Tras `setStyle` o primera carga: capas de lectura, carretera, interacción.
 * @param {import('mapbox-gl').Map} map
 * @param {boolean} mapReadOnly
 */
export function reapplyMapVisualLayers(map, mapReadOnly) {
  if (!map) return
  try {
    setupMapStyleOnLoad(map)
    applyRoadStyleForCreate(map)
    applyMapReadOnly(map, mapReadOnly)
  } catch {
    /* */
  }
}

export const DEFAULT_ZOOM = 16.5
export const DEFAULT_PITCH = 30
export const ACCURACY_RECENTER_THRESHOLD = 80

export function getMapboxAccessToken(env = import.meta.env) {
  const t = env?.VITE_MAPBOX_ACCESS_TOKEN
  if (typeof t === 'string' && t.trim()) return t.trim()
  return null
}

export function setupMapStyleOnLoad(map) {
  try {
    if (map.getTerrain()) map.setTerrain(null)
  } catch {
    /* */
  }
  const style = map.getStyle()
  if (!style?.layers) return
  for (const layer of style.layers) {
    const id = (layer.id || '').toLowerCase()
    const devExtra =
      import.meta.env.DEV &&
      (id.includes('sky') || id.includes('fog') || id.includes('atmospheric'))
    if (
      devExtra ||
      id.includes('tree') ||
      id.includes('park') ||
      id.includes('landcover') ||
      id.includes('land-use')
    ) {
      try {
        map.setLayoutProperty(layer.id, 'visibility', 'none')
      } catch {
        /* */
      }
    }
  }
}

export function applyMapReadOnly(map, readOnly) {
  if (!map) return
  const d = readOnly ? 'disable' : 'enable'
  try {
    map.dragPan?.[d]?.()
    map.dragRotate?.[d]?.()
    map.touchZoomRotate?.[d]?.()
    map.scrollZoom?.[d]?.()
    map.doubleClickZoom?.[d]?.()
    map.boxZoom?.[d]?.()
    map.keyboard?.[d]?.()
  } catch {
    /* */
  }
}

export function applyRoadStyleForCreate(map) {
  if (!map) return
  const style = map.getStyle()
  if (!style?.layers) return
  for (const layer of style.layers) {
    const id = (layer.id || '').toLowerCase()
    if (id.includes('road') && layer.type === 'line') {
      try {
        map.setPaintProperty(layer.id, 'line-color', ROAD_COLOR)
        map.setPaintProperty(layer.id, 'line-opacity', 1)
        const w = map.getPaintProperty(layer.id, 'line-width')
        if (typeof w === 'number') map.setPaintProperty(layer.id, 'line-width', w + 0.5)
      } catch {
        /* */
      }
    }
  }
}

export function createMap(container, { token, interactive = true }) {
  if (!container || !(container instanceof HTMLElement)) {
    return null
  }
  const tokenStr = typeof token === 'string' ? token.trim() : ''
  if (!tokenStr) {
    return null
  }
  if (container.childNodes.length > 0) {
    container.innerHTML = ''
  }

  mapboxgl.accessToken = tokenStr
  return new mapboxgl.Map({
    container,
    style: DARK_STYLE,
    center: OVIEDO_CENTER,
    zoom: DEFAULT_ZOOM,
    pitch: DEFAULT_PITCH,
    bearing: 0,
    antialias: true,
    attributionControl: false,
    logoPosition: 'bottom-right',
    dragPan: interactive,
    touchZoomRotate: interactive,
    scrollZoom: interactive,
    doubleClickZoom: interactive,
  })
}
