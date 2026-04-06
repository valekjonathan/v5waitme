import { useCallback, useEffect, useRef, useState } from 'react'
import 'mapbox-gl/dist/mapbox-gl.css'
import mapboxgl from 'mapbox-gl'
import {
  createMap,
  DEFAULT_PITCH,
  DEFAULT_ZOOM,
  getMapboxAccessToken,
  OVIEDO_LAT,
  OVIEDO_LNG,
  reapplyMapVisualLayers,
} from '../constants/mapbox.js'
import {
  getSearchFollowUserGps,
  setMapFollowUserGps,
  setMapReadOnlySession,
  setParkingMapPinMode,
  setSearchFollowUserGps,
} from '../mapSession.js'
import { getGlobalMapInstance, setGlobalMapInstance } from '../mapInstance.js'
import {
  getCurrentLocationFast,
  getCurrentPosition,
  subscribeToLocation,
} from '../../../services/location.js'
import {
  alignParkedGpsMarkerToGap,
  GAP_CARD_TOP,
  GAP_SEARCH_BOTTOM,
  getWaitmeMapCameraOptions,
  isWaitmeParkingLayoutReady,
  jumpMapToGpsSearch,
} from '../mapControls.js'
import MapViewportCenterPin from './MapViewportCenterPin.jsx'

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

let globalContainer = null

void mapboxgl.Map

function applyPostLoadStyle(map, readOnly) {
  try {
    reapplyMapVisualLayers(map, readOnly)
  } catch {
    /* */
  }
}

function centerMapOnUser(map, loc) {
  centerMapOnUserImmediate(map, loc)
}

/** Primera pintura: solo `jumpTo` (sin ease) para evitar parpadeo / montaje a trozos. */
function centerMapOnUserImmediate(map, loc) {
  if (!map || !loc) return
  const { latitude: lat, longitude: lng } = loc
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
  try {
    map.jumpTo({
      center: [lng, lat],
      zoom: DEFAULT_ZOOM,
      pitch: DEFAULT_PITCH,
      ...getWaitmeMapCameraOptions(),
    })
  } catch {
    /* */
  }
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
  /** Espejo del singleton para lecturas locales sin reinit. */
  const mapInstanceRef = useRef(null)
  const [unavailable, setUnavailable] = useState(false)
  /** Parking parked: punta del pin en el hueco buscador–tarjeta. */
  const [parkingPinTopPx, setParkingPinTopPx] = useState(null)
  /** Parking search: pin = `map.project(GPS)` en px (relativo al shell del mapa). */
  const [searchPinPixel, setSearchPinPixel] = useState(null)
  const searchGpsRef = useRef(null)
  const settledRef = useRef(false)
  const onSettledRef = useRef(onSettled)
  onSettledRef.current = onSettled
  const readOnlyRef = useRef(readOnly)
  readOnlyRef.current = readOnly
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
    onSettledRef.current?.()
  }, [])

  useEffect(() => {
    setMapFollowUserGps(followUserGps)
    if (!parkingBandPinAdjust) {
      setParkingMapPinMode(null)
      searchGpsRef.current = null
      setSearchPinPixel(null)
    } else {
      setParkingMapPinMode(parkingPinMode)
      if (parkingPinMode === 'search') {
        setSearchFollowUserGps(true)
      } else {
        setSearchFollowUserGps(false)
        searchGpsRef.current = null
        setSearchPinPixel(null)
      }
    }
    setMapReadOnlySession(readOnly)
    const map = getGlobalMapInstance()
    if (map?.isStyleLoaded?.()) {
      try {
        reapplyMapVisualLayers(map, readOnly)
      } catch {
        /* */
      }
    }
  }, [readOnly, followUserGps, parkingBandPinAdjust, parkingPinMode])

  const projectSearchPinFromGps = useCallback(() => {
    const map = getGlobalMapInstance()
    if (!map?.project) return
    const g = searchGpsRef.current
    if (!g || !Number.isFinite(g.lng) || !Number.isFinite(g.lat)) return
    try {
      const p = map.project([g.lng, g.lat])
      setSearchPinPixel({ x: p.x, y: p.y })
    } catch {
      /* */
    }
  }, [])

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

    if (parkingPinMode === 'search') {
      return () => {}
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
   * SEARCH: mapa libre; sin alinear cámara al GPS (`subscribeToLocation` no mueve el mapa).
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
        const m = getGlobalMapInstance()
        if (!m) return
        alignParkedGpsMarkerToGap(m, { lng, lat })
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

    let unsubscribeLocation = null
    const ensureLocationPipe = () => {
      if (unsubscribeLocation) return
      unsubscribeLocation = subscribeToLocation((loc) => {
        if (!loc) return
        const map = getGlobalMapInstance()
        if (!map?.isStyleLoaded?.()) return
        if (parkingBandPinAdjustRef.current && parkingPinModeRef.current === 'search') {
          searchGpsRef.current = { lng: loc.longitude, lat: loc.latitude }
          projectSearchPinFromGps()
          if (getSearchFollowUserGps()) jumpMapToGpsSearch(map, loc.longitude, loc.latitude)
          return
        }
        if (parkingBandPinAdjustRef.current && parkingPinModeRef.current === 'parked') {
          alignParkedGpsMarkerToGap(map, { lng: loc.longitude, lat: loc.latitude })
          return
        }
        if (followUserGpsRef.current) centerMapOnUser(map, loc)
      })
    }
    const clearLocationPipe = () => {
      if (unsubscribeLocation) {
        unsubscribeLocation()
        unsubscribeLocation = null
      }
    }

    const existingMap = getGlobalMapInstance()
    if (existingMap) {
      mapInstanceRef.current = existingMap
      let existingLoadCancelled = false
      const onExistingLoad = () => {
        if (existingLoadCancelled) return
        applyPostLoadStyle(existingMap, readOnlyRef.current)
        const fast = getCurrentLocationFast()
        if (followUserGpsRef.current && fast) centerMapOnUserImmediate(existingMap, fast)
        fireSettled()
      }
      ensureLocationPipe()
      if (existingMap.isStyleLoaded?.()) {
        onExistingLoad()
      } else {
        existingMap.once('load', onExistingLoad)
      }
      return () => {
        existingLoadCancelled = true
        existingMap.off('load', onExistingLoad)
        clearLocationPipe()
      }
    }

    const token = getMapboxAccessToken()
    if (!token) {
      setUnavailable(true)
      setGlobalMapInstance(null)
      fireSettled()
      return
    }

    const map = createMap(globalContainer, { token, interactive: true })
    if (!map || typeof map.jumpTo !== 'function') {
      setUnavailable(true)
      setGlobalMapInstance(null)
      fireSettled()
      return
    }

    setGlobalMapInstance(map)
    mapInstanceRef.current = map

    try {
      map.setFadeDuration?.(0)
    } catch {
      /* */
    }

    const onFirstLoad = () => {
      applyPostLoadStyle(map, readOnlyRef.current)
      if (followUserGpsRef.current) {
        const fast = getCurrentLocationFast()
        if (fast) {
          centerMapOnUserImmediate(map, fast)
        } else {
          getCurrentPosition(
            (validated) => {
              if (!validated || !followUserGpsRef.current) return
              const m = getGlobalMapInstance()
              if (!m) return
              centerMapOnUserImmediate(m, {
                latitude: validated.lat,
                longitude: validated.lng,
              })
            },
            () => {}
          )
        }
      } else if (!(parkingBandPinAdjustRef.current && parkingPinModeRef.current === 'search')) {
        try {
          map.jumpTo({
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

    if (map.isStyleLoaded?.()) {
      onFirstLoad()
    } else {
      map.once('load', onFirstLoad)
    }

    return () => {
      map.off('load', onFirstLoad)
      clearLocationPipe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- init singleton; props vía refs.

  useEffect(() => {
    if (import.meta.env?.MODE === 'test') return

    const resizeMap = () => {
      try {
        const map = getGlobalMapInstance()
        if (!map) return

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            map.resize()
          })
        })
      } catch {
        /* noop */
      }
    }

    resizeMap()

    window.addEventListener('resize', resizeMap)
    window.addEventListener('orientationchange', resizeMap)
    window.visualViewport?.addEventListener('resize', resizeMap)

    const t1 = setTimeout(resizeMap, 500)
    const t2 = setTimeout(resizeMap, 1200)

    return () => {
      window.removeEventListener('resize', resizeMap)
      window.removeEventListener('orientationchange', resizeMap)
      window.visualViewport?.removeEventListener('resize', resizeMap)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  useEffect(() => {
    if (mapFocusGeneration === 0) return
    const map = getGlobalMapInstance()
    if (!map?.isStyleLoaded?.() || !followUserGps) return

    const fast = getCurrentLocationFast()
    if (fast) {
      centerMapOnUserImmediate(map, fast)
      return
    }
    getCurrentPosition(
      (validated) => {
        if (!validated) return
        const m = getGlobalMapInstance()
        if (!m) return
        centerMapOnUserImmediate(m, {
          latitude: validated.lat,
          longitude: validated.lng,
        })
      },
      () => {}
    )
  }, [mapFocusGeneration, followUserGps])

  useEffect(() => {
    if (unavailable || import.meta.env?.MODE === 'test') return
    if (!parkingBandPinAdjust || parkingPinMode !== 'search') return

    let cancelled = false
    let rafId = 0
    let detach = () => {}

    const tryAttach = () => {
      const map = getGlobalMapInstance()
      if (!map?.on) {
        rafId = requestAnimationFrame(() => {
          if (!cancelled) tryAttach()
        })
        return
      }
      const onDragStart = () => {
        setSearchFollowUserGps(false)
      }
      const onMove = () => {
        projectSearchPinFromGps()
      }
      const onResize = () => {
        projectSearchPinFromGps()
      }
      map.on('dragstart', onDragStart)
      map.on('move', onMove)
      window.addEventListener('resize', onResize)
      detach = () => {
        map.off('dragstart', onDragStart)
        map.off('move', onMove)
        window.removeEventListener('resize', onResize)
      }
    }
    tryAttach()
    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      detach()
    }
  }, [unavailable, parkingBandPinAdjust, parkingPinMode, projectSearchPinFromGps])

  return (
    <>
      <style>
        {`
          [data-waitme-map-shell] .mapboxgl-canvas,
          [data-waitme-map-shell] .mapboxgl-canvas-container {
            width: 100% !important;
            height: 100% !important;
          }
        `}
      </style>
      <div
        ref={mapShellRef}
        data-waitme-map-shell
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
        }}
      >
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            flex: 1,
          }}
        />
        {unavailable ? null : !parkingBandPinAdjust ? (
          <MapViewportCenterPin ref={pinRef} />
        ) : parkingPinMode === 'search' ? (
          searchPinPixel ? (
            <MapViewportCenterPin ref={pinRef} pinPixel={searchPinPixel} />
          ) : null
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
    </>
  )
}
