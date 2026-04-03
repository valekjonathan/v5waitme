import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import {
  createMap,
  DEFAULT_PITCH,
  DEFAULT_ZOOM,
  getMapboxAccessToken,
  OVIEDO_LAT,
  OVIEDO_LNG,
  reapplyMapVisualLayers,
} from '../constants/mapbox.js'
import { setMapFollowUserGps, setMapReadOnlySession } from '../mapSession.js'
import {
  getGlobalMapInstance,
  getUserGpsMarker,
  setGlobalMapInstance,
  setUserGpsMarker,
} from '../mapInstance.js'
import {
  getCurrentLocationFast,
  getCurrentPosition,
  subscribeToLocation,
} from '../../../services/location.js'
import { alignParkedGpsMarkerToGap, applyWaitmeCameraJumpOrEase } from '../mapControls.js'
import CenterPin from '../../home/components/CenterPin.jsx'
import MapViewportCenterPin from './MapViewportCenterPin.jsx'

/** Bordes morados del hueco (misma caja que el borde 2px, no wrappers externos). */
const GAP_SEARCH_BOTTOM = '[data-waitme-parking-gap-search-bottom]'
const GAP_CARD_TOP = '[data-waitme-parking-gap-card-top]'

/**
 * Home/Login: `__WAITME_PIN_OFFSET_Y__` = punta del pin vs centro vertical del mapa.
 * Search/Parked con hueco medible: la cámara se corrige con project/unproject en mapControls (sin offset).
 * Search/Parked sin medición aún: offset como Home hasta que exista layout.
 */
function applyWaitmePinAndParkingCamera(pinEl, mapShellEl, parkingBandPinAdjust) {
  if (typeof window === 'undefined' || !pinEl || !mapShellEl) return
  const pinRect = pinEl.getBoundingClientRect()
  const mapRect = mapShellEl.getBoundingClientRect()
  const pinTipY = pinRect.bottom
  const mapCenterY = mapRect.top + mapRect.height / 2
  const offsetVersusMapCenter = pinTipY - mapCenterY

  if (!parkingBandPinAdjust) {
    window.__WAITME_PIN_OFFSET_Y__ = offsetVersusMapCenter
    return
  }

  const searchEl = document.querySelector(GAP_SEARCH_BOTTOM)
  const cardEl = document.querySelector(GAP_CARD_TOP)
  if (!searchEl || !cardEl) {
    window.__WAITME_PIN_OFFSET_Y__ = offsetVersusMapCenter
    return
  }
  const searchBottom = searchEl.getBoundingClientRect().bottom
  const cardTop = cardEl.getBoundingClientRect().top
  if (!(cardTop > searchBottom)) {
    window.__WAITME_PIN_OFFSET_Y__ = offsetVersusMapCenter
    return
  }

  delete window.__WAITME_PIN_OFFSET_Y__
}

let globalMap = null
let globalContainer = null
/** Una sola suscripción al stream GPS para el mapa singleton. */
let locationSubscribed = false

function applyPostLoadStyle(map, readOnly) {
  try {
    reapplyMapVisualLayers(map, readOnly)
  } catch {
    /* */
  }
}

function centerMapOnUser(map, loc) {
  if (!map || !loc) return
  const { latitude: lat, longitude: lng } = loc
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
  applyWaitmeCameraJumpOrEase(map, {
    center: [lng, lat],
    zoom: DEFAULT_ZOOM,
    pitch: DEFAULT_PITCH,
  })
}

export default function Map({
  onSettled,
  mapFocusGeneration = 0,
  readOnly = true,
  parkingBandPinAdjust = false,
  /** Home: seguir GPS. Parking search: no. Parking parked: sí (recenter al volver al mapa). */
  followUserGps = true,
  /** `search`: pin viewport tipo Uber. `parked`: marcador GPS. Solo con `parkingBandPinAdjust`. */
  parkingPinMode = 'parked',
}) {
  const containerRef = useRef(null)
  const mapShellRef = useRef(null)
  const pinRef = useRef(null)
  const [unavailable, setUnavailable] = useState(false)
  /** Parking search: punta del pin en el hueco buscador–tarjeta. */
  const [parkingPinTopPx, setParkingPinTopPx] = useState(null)
  const settledRef = useRef(false)
  /** Evita condición de carrera: `setMapFollowUserGps` corre tras el primer paint. */
  const followUserGpsRef = useRef(followUserGps)
  followUserGpsRef.current = followUserGps

  const fireSettled = useCallback(() => {
    if (settledRef.current) return
    settledRef.current = true
    onSettled?.()
  }, [onSettled])

  useEffect(() => {
    setMapFollowUserGps(followUserGps)
  }, [followUserGps])

  useEffect(() => {
    setMapReadOnlySession(readOnly)
    if (!globalMap?.isStyleLoaded?.()) return
    try {
      reapplyMapVisualLayers(globalMap, readOnly)
    } catch {
      /* */
    }
  }, [readOnly])

  /** Home: pin en viewport + offset. Parking search: hueco buscador–tarjeta. */
  useEffect(() => {
    if (!parkingBandPinAdjust) {
      const run = () => {
        requestAnimationFrame(() => {
          applyWaitmePinAndParkingCamera(pinRef.current, mapShellRef.current, false)
        })
      }

      run()
      const mapEl = mapShellRef.current
      const ro = mapEl ? new ResizeObserver(run) : null
      if (mapEl && ro) ro.observe(mapEl)
      window.addEventListener('resize', run)
      const raf = requestAnimationFrame(run)
      return () => {
        ro?.disconnect()
        window.removeEventListener('resize', run)
        cancelAnimationFrame(raf)
        delete window.__WAITME_PIN_OFFSET_Y__
      }
    }

    if (parkingPinMode !== 'search') {
      setParkingPinTopPx(null)
      delete window.__WAITME_PIN_OFFSET_Y__
      return undefined
    }

    const observedParking = new globalThis.Map()

    const pruneParkingObservers = () => {
      for (const [el, ro] of [...observedParking.entries()]) {
        if (!el.isConnected) {
          ro.disconnect()
          observedParking.delete(el)
        }
      }
    }

    const run = () => {
      requestAnimationFrame(() => {
        applyWaitmePinAndParkingCamera(pinRef.current, mapShellRef.current, true)

        let nextPinTop = null
        if (mapShellRef.current) {
          const shellRect = mapShellRef.current.getBoundingClientRect()
          const searchEl = document.querySelector(GAP_SEARCH_BOTTOM)
          const cardEl = document.querySelector(GAP_CARD_TOP)
          if (searchEl && cardEl) {
            const searchBottom = searchEl.getBoundingClientRect().bottom
            const cardTop = cardEl.getBoundingClientRect().top
            if (cardTop > searchBottom) {
              nextPinTop = (searchBottom + cardTop) / 2 - shellRect.top
            }
          }
        }
        setParkingPinTopPx((prev) => {
          if (nextPinTop == null || !Number.isFinite(nextPinTop)) return null
          if (prev != null && Math.abs(prev - nextPinTop) < 0.5) return prev
          return nextPinTop
        })

        pruneParkingObservers()
        for (const sel of [GAP_SEARCH_BOTTOM, GAP_CARD_TOP]) {
          const el = document.querySelector(sel)
          if (el && !observedParking.has(el)) {
            const ro = new ResizeObserver(run)
            ro.observe(el)
            observedParking.set(el, ro)
          }
        }
      })
    }

    run()
    const mapEl = mapShellRef.current
    const ro = mapEl ? new ResizeObserver(run) : null
    if (mapEl && ro) ro.observe(mapEl)
    window.addEventListener('resize', run)
    const raf = requestAnimationFrame(run)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', run)
      cancelAnimationFrame(raf)
      observedParking.forEach((obs) => obs.disconnect())
      observedParking.clear()
      delete window.__WAITME_PIN_OFFSET_Y__
    }
  }, [parkingBandPinAdjust, parkingPinMode])

  /** Parking parked: marcador GPS (coordenadas reales). */
  useEffect(() => {
    if (
      !parkingBandPinAdjust ||
      parkingPinMode !== 'parked' ||
      unavailable ||
      import.meta.env?.MODE === 'test'
    ) {
      setUserGpsMarker(null)
      return undefined
    }

    let cancelled = false
    let marker = null
    let root = null
    let pollId = null

    const cleanup = () => {
      setUserGpsMarker(null)
      if (marker) {
        try {
          marker.remove()
        } catch {
          /* */
        }
        marker = null
      }
      if (root) {
        try {
          root.unmount()
        } catch {
          /* */
        }
        root = null
      }
    }

    const attach = () => {
      if (cancelled) return false
      const map = getGlobalMapInstance()
      if (!map?.isStyleLoaded?.()) return false
      if (getUserGpsMarker()) return true

      const el = document.createElement('div')
      el.setAttribute('data-waitme-user-gps-marker', 'true')
      root = createRoot(el)
      root.render(<CenterPin />)
      marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      const fast = getCurrentLocationFast()
      if (fast && Number.isFinite(fast.latitude) && Number.isFinite(fast.longitude)) {
        marker.setLngLat([fast.longitude, fast.latitude])
        marker.addTo(map)
      } else {
        getCurrentPosition(
          (v) => {
            if (cancelled || !v || !marker) return
            marker.setLngLat([v.lng, v.lat])
            marker.addTo(map)
          },
          () => {
            let off = null
            off = subscribeToLocation((loc) => {
              if (cancelled || !loc || !marker) return
              if (!Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude)) return
              marker.setLngLat([loc.longitude, loc.latitude])
              marker.addTo(map)
              if (typeof off === 'function') off()
            })
          }
        )
      }
      setUserGpsMarker(marker)
      requestAnimationFrame(() => {
        const m = getGlobalMapInstance()
        const fast = getCurrentLocationFast()
        if (m?.isStyleLoaded?.() && fast && getUserGpsMarker()) {
          alignParkedGpsMarkerToGap(m, { lng: fast.longitude, lat: fast.latitude })
        }
      })
      return true
    }

    if (!attach()) {
      const map = getGlobalMapInstance()
      if (map && !map.isStyleLoaded?.()) {
        map.once('load', attach)
      }
      pollId = window.setInterval(() => {
        if (attach() && pollId != null) {
          window.clearInterval(pollId)
          pollId = null
        }
      }, 100)
    }

    return () => {
      cancelled = true
      if (pollId != null) window.clearInterval(pollId)
      const map = getGlobalMapInstance()
      if (map && typeof map.off === 'function') {
        try {
          map.off('load', attach)
        } catch {
          /* */
        }
      }
      cleanup()
    }
  }, [parkingBandPinAdjust, parkingPinMode, unavailable])

  useEffect(() => {
    if (!containerRef.current) return

    if (import.meta.env?.MODE === 'test') {
      setUnavailable(true)
      setGlobalMapInstance(null)
      fireSettled()
      return
    }

    if (!globalContainer) {
      globalContainer = document.createElement('div')
      globalContainer.style.width = '100%'
      globalContainer.style.height = '100%'
    }

    if (containerRef.current.firstChild !== globalContainer) {
      containerRef.current.innerHTML = ''
      containerRef.current.appendChild(globalContainer)
    }

    const ensureLocationPipe = () => {
      if (locationSubscribed) return
      locationSubscribed = true
      subscribeToLocation((loc) => {
        if (!loc || !globalMap || !globalMap.isStyleLoaded?.()) return
        const userPin = getUserGpsMarker()
        if (userPin && typeof userPin.setLngLat === 'function') {
          userPin.setLngLat([loc.longitude, loc.latitude])
          return
        }
        if (followUserGpsRef.current) centerMapOnUser(globalMap, loc)
      })
    }

    if (globalMap) {
      setGlobalMapInstance(globalMap)
      ensureLocationPipe()
      if (globalMap.isStyleLoaded?.()) {
        applyPostLoadStyle(globalMap, readOnly)
        const fast = getCurrentLocationFast()
        if (followUserGps && fast) centerMapOnUser(globalMap, fast)
        fireSettled()
      } else {
        globalMap.once('load', () => {
          applyPostLoadStyle(globalMap, readOnly)
          const fast = getCurrentLocationFast()
          if (followUserGps && fast) centerMapOnUser(globalMap, fast)
          fireSettled()
        })
      }
      return
    }

    const token = getMapboxAccessToken()
    if (!token) {
      setUnavailable(true)
      setGlobalMapInstance(null)
      fireSettled()
      return
    }

    globalMap = createMap(globalContainer, { token, interactive: true })
    if (!globalMap || typeof globalMap.jumpTo !== 'function') {
      setUnavailable(true)
      setGlobalMapInstance(null)
      fireSettled()
      return
    }

    setGlobalMapInstance(globalMap)

    try {
      globalMap.setFadeDuration?.(0)
    } catch {
      /* */
    }

    const onFirstLoad = () => {
      applyPostLoadStyle(globalMap, readOnly)
      if (followUserGps) {
        const fast = getCurrentLocationFast()
        if (fast) {
          centerMapOnUser(globalMap, fast)
        } else {
          getCurrentPosition(
            (validated) => {
              if (!validated || !globalMap || !followUserGpsRef.current) return
              centerMapOnUser(globalMap, {
                latitude: validated.lat,
                longitude: validated.lng,
              })
            },
            () => {}
          )
        }
      } else {
        try {
          globalMap.jumpTo({
            center: [OVIEDO_LNG, OVIEDO_LAT],
            zoom: DEFAULT_ZOOM,
            pitch: DEFAULT_PITCH,
          })
        } catch {
          /* */
        }
      }
      fireSettled()
    }

    ensureLocationPipe()

    if (globalMap.isStyleLoaded?.()) {
      onFirstLoad()
    } else {
      globalMap.once('load', onFirstLoad)
    }
  }, [fireSettled, readOnly, followUserGps])

  useEffect(() => {
    if (mapFocusGeneration === 0) return
    if (!globalMap?.isStyleLoaded?.() || !followUserGps) return

    const fast = getCurrentLocationFast()
    if (fast) {
      centerMapOnUser(globalMap, fast)
      return
    }
    getCurrentPosition(
      (validated) => {
        if (!validated || !globalMap) return
        centerMapOnUser(globalMap, {
          latitude: validated.lat,
          longitude: validated.lng,
        })
      },
      () => {}
    )
  }, [mapFocusGeneration, followUserGps])

  return (
    <div
      ref={mapShellRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        zIndex: 0,
        isolation: 'isolate',
      }}
    >
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', position: 'relative', zIndex: 0 }}
      />
      {unavailable ? null : !parkingBandPinAdjust ||
        (parkingBandPinAdjust && parkingPinMode === 'search') ? (
        <MapViewportCenterPin
          ref={pinRef}
          parkingPinTopPx={
            parkingBandPinAdjust && parkingPinMode === 'search' ? parkingPinTopPx : undefined
          }
        />
      ) : null}
      {unavailable ? (
        <div
          aria-hidden
          data-waitme-map-unavailable="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#0B0B0F',
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </div>
  )
}
