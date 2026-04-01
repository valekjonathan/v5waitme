import {
  DEFAULT_PITCH,
  DEFAULT_ZOOM,
  MAP_STYLE_CYCLE,
  reapplyMapVisualLayers,
} from './constants/mapbox.js'
import { getMapReadOnlySession } from './mapSession.js'
import { getGlobalMapInstance } from './mapInstance.js'
import { getCurrentLocationFast, getCurrentPosition } from '../../services/location.js'

let mapStyleCycleIndex = 0

/** Zoom in/out sobre la instancia global del mapa (usado solo desde overlays de pantalla). */
export function globalMapZoomBy(delta) {
  const map = getGlobalMapInstance()
  if (!map || typeof map.getZoom !== 'function') return
  try {
    const z = map.getZoom() + delta
    map.easeTo({ zoom: Math.min(20, Math.max(3, z)), duration: 180 })
  } catch {
    /* */
  }
}

/** Un solo botón: dark → light → satélite (sin modales). */
export function cycleGlobalMapStyle() {
  const map = getGlobalMapInstance()
  if (!map) return
  mapStyleCycleIndex = (mapStyleCycleIndex + 1) % MAP_STYLE_CYCLE.length
  const next = MAP_STYLE_CYCLE[mapStyleCycleIndex]
  try {
    map.setStyle(next)
    map.once('style.load', () => {
      reapplyMapVisualLayers(map, getMapReadOnlySession())
    })
  } catch {
    /* */
  }
}

export function flyGlobalMapTo(lng, lat) {
  const map = getGlobalMapInstance()
  if (!map?.isStyleLoaded?.() || !Number.isFinite(lng) || !Number.isFinite(lat)) return
  try {
    const z = typeof map.getZoom === 'function' ? map.getZoom() : DEFAULT_ZOOM
    map.flyTo({
      center: [lng, lat],
      zoom: Math.min(20, Math.max(z, 16.5)),
      duration: 700,
      essential: true,
    })
  } catch {
    /* */
  }
}

export function recenterGlobalMapOnUser() {
  const map = getGlobalMapInstance()
  if (!map?.isStyleLoaded?.()) return
  const fast = getCurrentLocationFast()
  if (fast) {
    try {
      map.jumpTo({
        center: [fast.longitude, fast.latitude],
        zoom: DEFAULT_ZOOM,
        pitch: DEFAULT_PITCH,
      })
    } catch {
      /* */
    }
    return
  }
  getCurrentPosition(
    (v) => {
      if (!v || !map) return
      try {
        map.jumpTo({
          center: [v.lng, v.lat],
          zoom: DEFAULT_ZOOM,
          pitch: DEFAULT_PITCH,
        })
      } catch {
        /* */
      }
    },
    () => {}
  )
}
