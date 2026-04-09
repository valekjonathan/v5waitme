import { DEFAULT_PITCH, DEFAULT_ZOOM } from './constants/mapbox.js'
import { getMapFollowUserGps, getParkingMapPinMode, setSearchFollowUserGps } from './mapSession.js'
import { getGlobalMapInstance } from './mapInstance.js'
import { getCurrentLocationFast, getCurrentPosition } from '../../services/location.js'
import { GAP_CARD_TOP, GAP_SEARCH_BOTTOM } from './mapGapSelectors.js'

export { GAP_CARD_TOP, GAP_SEARCH_BOTTOM } from './mapGapSelectors.js'

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
 * Misma cámara + alineación al hueco que “Estoy aparcado aquí” (GPS bajo el pin).
 * Para primer frame de “Dónde quieres aparcar” antes del modo arrastre/píxel.
 */
export function centerParkingMapOnGpsLikeParked(map, lng, lat) {
  jumpMapToLngLatAndAlignToGap(map, lng, lat, {
    zoom: DEFAULT_ZOOM,
    pitch: DEFAULT_PITCH,
  })
}

/** Salto de cámara + misma alineación que `alignParkedGpsMarkerToGap` (un solo núcleo). */
function jumpMapToLngLatAndAlignToGap(map, lng, lat, camera = {}) {
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

/** Única API de alineación al hueco: (lng,lat) bajo el pin fijo (contenedor Mapbox). */
export function alignParkedGpsMarkerToGap(map, lngLat) {
  if (!map?.project || !map?.unproject || !lngLat) return
  const lng = lngLat.lng
  const lat = lngLat.lat
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return

  const search = document.querySelector(GAP_SEARCH_BOTTOM)
  const card = document.querySelector(GAP_CARD_TOP)
  if (!search || !card) return

  const mapRect = map.getContainer().getBoundingClientRect()
  const searchBottom = search.getBoundingClientRect().bottom - mapRect.top
  const cardTop = card.getBoundingClientRect().top - mapRect.top
  if (!(cardTop > searchBottom)) return

  const targetY = (searchBottom + cardTop) / 2
  const targetX = mapRect.width / 2

  const point = map.project([lng, lat])
  const centerPx = map.project(map.getCenter())
  const dx = targetX - point.x
  const dy = targetY - point.y

  const newCenterPx = { x: centerPx.x - dx, y: centerPx.y - dy }

  if (Math.abs(dx) <= 0.5 && Math.abs(dy) <= 0.5) return

  const newCenter = map.unproject(newCenterPx)

  map.easeTo({
    center: newCenter,
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
function applyWaitmeCameraJumpOrEase(map, camera) {
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
        const follow = getMapFollowUserGps()
        if (follow) {
          const fast = getCurrentLocationFast()
          if (fast && Number.isFinite(fast.longitude) && Number.isFinite(fast.latitude)) {
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

/** Búsqueda parking: centrar en GPS sin alinear al hueco del pin fijo (ese pin es solo en parked). */
export function jumpMapToGpsSearch(map, lng, lat) {
  if (!map?.jumpTo || !Number.isFinite(lng) || !Number.isFinite(lat)) return
  try {
    map.jumpTo({
      center: [lng, lat],
      zoom: DEFAULT_ZOOM,
      pitch: DEFAULT_PITCH,
    })
  } catch {
    /* */
  }
}

export function recenterGlobalMapOnUser() {
  const map = getGlobalMapInstance()
  if (!map?.isStyleLoaded?.()) return

  if (getParkingMapPinMode() === 'search') {
    setSearchFollowUserGps(true)
    const fast = getCurrentLocationFast()
    if (fast && Number.isFinite(fast.longitude) && Number.isFinite(fast.latitude)) {
      jumpMapToGpsSearch(map, fast.longitude, fast.latitude)
      return
    }
    getCurrentPosition(
      (v) => {
        if (!v) return
        const m = getGlobalMapInstance()
        if (!m) return
        setSearchFollowUserGps(true)
        jumpMapToGpsSearch(m, v.lng, v.lat)
      },
      () => {}
    )
    return
  }

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
      if (!v) return
      const m = getGlobalMapInstance()
      if (!m) return
      applyWaitmeCameraJumpOrEase(m, {
        center: [v.lng, v.lat],
        zoom: DEFAULT_ZOOM,
        pitch: DEFAULT_PITCH,
      })
    },
    () => {}
  )
}
