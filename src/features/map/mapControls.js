import {
  DEFAULT_PITCH,
  DEFAULT_ZOOM,
  MAP_STYLE_CYCLE,
  reapplyMapVisualLayers,
} from './constants/mapbox.js'
import { getMapReadOnlySession } from './mapSession.js'
import { getGlobalMapInstance, getUserGpsMarker } from './mapInstance.js'
import { getCurrentLocationFast, getCurrentPosition } from '../../services/location.js'

let mapStyleCycleIndex = 0

const GAP_SEARCH_BOTTOM = '[data-waitme-parking-gap-search-bottom]'
const GAP_CARD_TOP = '[data-waitme-parking-gap-card-top]'

export function isWaitmeParkingLayoutReady() {
  if (typeof document === 'undefined') return false
  const searchEl = document.querySelector(GAP_SEARCH_BOTTOM)
  const cardEl = document.querySelector(GAP_CARD_TOP)
  if (!searchEl || !cardEl) return false
  const searchBottom = searchEl.getBoundingClientRect().bottom
  const cardTop = cardEl.getBoundingClientRect().top
  return cardTop > searchBottom
}

/**
 * Punto geográfico (lng/lat) → project/unproject → centro del hueco buscador–tarjeta.
 * Salto de cámara + alineación (viewport SEARCH o marcador PARKED).
 * @param {import('mapbox-gl').Map} map
 * @param {number} lng
 * @param {number} lat
 * @param {{ zoom?: number, pitch?: number, bearing?: number }} [camera]
 */
export function jumpMapToLngLatAndAlignToGap(map, lng, lat, camera = {}) {
  if (!map?.jumpTo || !Number.isFinite(lng) || !Number.isFinite(lat)) return
  try {
    map.jumpTo({
      center: [lng, lat],
      zoom: camera.zoom ?? (typeof map.getZoom === 'function' ? map.getZoom() : DEFAULT_ZOOM),
      pitch: camera.pitch ?? (typeof map.getPitch === 'function' ? map.getPitch() : DEFAULT_PITCH),
      bearing: camera.bearing ?? (typeof map.getBearing === 'function' ? map.getBearing() : 0),
    })
    alignParkedGpsMarkerToGap(map, { lng, lat })
  } catch {
    /* */
  }
}

export function alignParkedGpsMarkerToGap(map, lngLat) {
  if (!map?.project || !map?.unproject || !lngLat) return
  const lng = lngLat.lng
  const lat = lngLat.lat
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return

  const searchEl = document.querySelector(GAP_SEARCH_BOTTOM)
  const cardEl = document.querySelector(GAP_CARD_TOP)
  if (!searchEl || !cardEl) return

  const cr = map.getContainer().getBoundingClientRect()
  const searchBottom = searchEl.getBoundingClientRect().bottom
  const cardTop = cardEl.getBoundingClientRect().top
  if (!(cardTop > searchBottom)) return

  const targetX = cr.width / 2
  const targetY = (searchBottom + cardTop) / 2 - cr.top

  const p = map.project([lng, lat])
  const dx = targetX - p.x
  const dy = targetY - p.y
  if (Math.abs(dx) <= 0.5 && Math.abs(dy) <= 0.5) return

  const centerPx = map.project(map.getCenter())
  const newCenter = map.unproject([centerPx.x - dx, centerPx.y - dy])
  map.easeTo({
    center: newCenter,
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
    duration: 0,
    essential: true,
  })
}

/** Home/Login: solo offset punta del pin vs centro vertical del mapa. */
export function getWaitmeMapCameraOptions() {
  if (typeof window === 'undefined') {
    return { offset: [0, 0] }
  }
  const oy = window.__WAITME_PIN_OFFSET_Y__ || 0
  return { offset: [0, oy] }
}

/**
 * Home: `jumpTo` + offset. Search/Parked con layout: `jumpTo` sin offset y alineación project/unproject.
 * Search/Parked sin layout aún: mismo offset que Home hasta medir hueco.
 */
export function applyWaitmeCameraJumpOrEase(map, camera) {
  if (!map) return
  const c = camera.center
  if (!Array.isArray(c) || c.length < 2) return
  const [lng, lat] = c
  try {
    if (isWaitmeParkingLayoutReady()) {
      jumpMapToLngLatAndAlignToGap(map, lng, lat, {
        zoom: camera.zoom ?? map.getZoom(),
        pitch: camera.pitch ?? map.getPitch(),
        bearing: camera.bearing ?? map.getBearing(),
      })
    } else {
      map.jumpTo({ ...camera, ...getWaitmeMapCameraOptions() })
    }
  } catch {
    /* */
  }
}

/** Zoom in/out sobre la instancia global del mapa (usado solo desde overlays de pantalla). */
export function globalMapZoomBy(delta) {
  const map = getGlobalMapInstance()
  if (!map || typeof map.getZoom !== 'function' || typeof map.easeTo !== 'function') return
  try {
    const c = map.getCenter()
    const z = map.getZoom() + delta
    map.easeTo({
      center: [c.lng, c.lat],
      zoom: Math.min(20, Math.max(3, z)),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      duration: 180,
      ...(isWaitmeParkingLayoutReady() ? {} : getWaitmeMapCameraOptions()),
    })
    if (isWaitmeParkingLayoutReady() && getUserGpsMarker()) {
      const fast = getCurrentLocationFast()
      if (fast) {
        map.once('moveend', () =>
          alignParkedGpsMarkerToGap(map, { lng: fast.longitude, lat: fast.latitude })
        )
      }
    }
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
    if (isWaitmeParkingLayoutReady()) {
      map.flyTo({
        center: [lng, lat],
        zoom: Math.min(20, Math.max(z, 16.5)),
        duration: 700,
        essential: true,
      })
      map.once('moveend', () => {
        if (getUserGpsMarker()) {
          const fast = getCurrentLocationFast()
          if (
            fast &&
            Number.isFinite(fast.longitude) &&
            Number.isFinite(fast.latitude)
          ) {
            alignParkedGpsMarkerToGap(map, { lng: fast.longitude, lat: fast.latitude })
          }
        } else {
          alignParkedGpsMarkerToGap(map, { lng, lat })
        }
      })
    } else {
      map.flyTo({
        center: [lng, lat],
        zoom: Math.min(20, Math.max(z, 16.5)),
        duration: 700,
        essential: true,
        ...getWaitmeMapCameraOptions(),
      })
    }
  } catch {
    /* */
  }
}

export function recenterGlobalMapOnUser() {
  const map = getGlobalMapInstance()
  if (!map?.isStyleLoaded?.()) return
  const fast = getCurrentLocationFast()
  if (fast) {
    applyWaitmeCameraJumpOrEase(map, {
      center: [fast.longitude, fast.latitude],
      zoom: DEFAULT_ZOOM,
      pitch: DEFAULT_PITCH,
    })
    return
  }
  getCurrentPosition(
    (v) => {
      if (!v || !map) return
      applyWaitmeCameraJumpOrEase(map, {
        center: [v.lng, v.lat],
        zoom: DEFAULT_ZOOM,
        pitch: DEFAULT_PITCH,
      })
    },
    () => {}
  )
}
