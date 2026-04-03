import { useCallback, useEffect, useRef, useState } from 'react'
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
import { getGlobalMapInstance, setGlobalMapInstance } from '../mapInstance.js'
import {
  getCurrentLocationFast,
  getCurrentPosition,
  subscribeToLocation,
} from '../../../services/location.js'
import {
  alignParkedGpsMarkerToGap,
  applyWaitmeCameraJumpOrEase,
  isWaitmeParkingLayoutReady,
} from '../mapControls.js'
import MapViewportCenterPin from './MapViewportCenterPin.jsx'

/** Mismos selectores que `mapControls.js` (hueco buscador–tarjeta). */
const GAP_SEARCH_BOTTOM = '[data-search-box]'
const GAP_CARD_TOP = '[data-alert-card]'

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
  const parkingPinModeRef = useRef(parkingPinMode)
  const parkingBandPinAdjustRef = useRef(parkingBandPinAdjust)
  parkingPinModeRef.current = parkingPinMode
  parkingBandPinAdjustRef.current = parkingBandPinAdjust

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
        const shellEl = mapShellRef.current
        const searchEl = document.querySelector(GAP_SEARCH_BOTTOM)
        const cardEl = document.querySelector(GAP_CARD_TOP)
        const mapInst = getGlobalMapInstance()
        const mapRect = mapInst?.getContainer?.()?.getBoundingClientRect()
        if (shellEl && mapRect && searchEl && cardEl) {
          const sb = searchEl.getBoundingClientRect().bottom - mapRect.top
          const ct = cardEl.getBoundingClientRect().top - mapRect.top
          if (ct > sb) {
            const shellRect = shellEl.getBoundingClientRect()
            const targetY = (sb + ct) / 2
            nextPinTop = mapRect.top - shellRect.top + targetY
          }
        } else if (shellEl && searchEl && cardEl) {
          const shellRect = shellEl.getBoundingClientRect()
          const searchBottom = searchEl.getBoundingClientRect().bottom
          const cardTop = cardEl.getBoundingClientRect().top
          if (cardTop > searchBottom) {
            nextPinTop = (searchBottom + cardTop) / 2 - shellRect.top
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

  /**
   * Solo PARKED: alinear cámara inicial a GPS bajo el pin (hueco buscador–tarjeta).
   * SEARCH: verdad = map.getCenter(); sin snap GPS aquí (evita competir con el usuario / fly).
   */
  useEffect(() => {
    if (!parkingBandPinAdjust || unavailable || import.meta.env?.MODE === 'test') return
    if (parkingPinMode !== 'parked') return
    let cancelled = false
    let attempts = 0
    const maxAttempts = 100

    const run = () => {
      if (cancelled) return
      const map = getGlobalMapInstance()
      if (!map?.isStyleLoaded?.() || !isWaitmeParkingLayoutReady()) {
        if (attempts++ < maxAttempts) requestAnimationFrame(run)
        return
      }
      const fast = getCurrentLocationFast()
      const applyCoords = (lng, lat) => {
        if (cancelled || !Number.isFinite(lng) || !Number.isFinite(lat)) return
        alignParkedGpsMarkerToGap(map, { lng, lat }, { mode: 'parked-initial' })
      }
      if (fast && Number.isFinite(fast.longitude) && Number.isFinite(fast.latitude)) {
        applyCoords(fast.longitude, fast.latitude)
        return
      }
      getCurrentPosition(
        (v) => {
          if (cancelled || !v) return
          applyCoords(v.lng, v.lat)
        },
        () => {}
      )
    }

    const t = window.setTimeout(run, 0)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [parkingBandPinAdjust, parkingPinMode, unavailable, mapFocusGeneration])

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
        if (parkingBandPinAdjustRef.current && parkingPinModeRef.current === 'search') {
          return
        }
        if (parkingBandPinAdjustRef.current && parkingPinModeRef.current === 'parked') {
          alignParkedGpsMarkerToGap(
            globalMap,
            { lng: loc.longitude, lat: loc.latitude },
            { mode: 'parked-gps' }
          )
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
      {unavailable ? null : !parkingBandPinAdjust ? (
        <MapViewportCenterPin ref={pinRef} />
      ) : (
        <MapViewportCenterPin ref={pinRef} parkingPinTopPx={parkingPinTopPx ?? undefined} />
      )}
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
