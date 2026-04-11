import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import 'mapbox-gl/dist/mapbox-gl.css'
import mapboxgl from 'mapbox-gl'
import {
  createMap,
  DEFAULT_PITCH,
  DEFAULT_ZOOM,
  getMapboxAccessToken,
  reapplyMapVisualLayers,
} from '../constants/mapbox.js'
import {
  getParkedAutoAlignGps,
  getSearchFollowUserGps,
  setMapFollowUserGps,
  setMapReadOnlySession,
  setParkedAutoAlignGps,
  setParkingMapPinMode,
  setSearchFollowUserGps,
  setWaitmePinOffsetYSuppressed,
} from '../mapSession.js'
import { getGlobalMapInstance, setGlobalMapInstance } from '../mapInstance.js'
import { subscribeToLocation } from '../../../services/location.js'
import {
  alignParkedGpsMarkerToGap,
  centerParkingMapOnGpsLikeParked,
  GAP_CARD_TOP,
  GAP_SEARCH_BOTTOM,
  getWaitmeMapCameraOptions,
  isWaitmeParkingLayoutReady,
  jumpMapLngLatUnderHeroPinTip,
  jumpMapToGpsSearch,
} from '../mapControls.js'
import MapViewportCenterPin from './MapViewportCenterPin.jsx'
import {
  logWaitmeViewportDebug,
  subscribeWaitmeViewportEvents,
} from '../../../lib/waitmeViewport.js'

let globalContainer = null

/** Umbral ~1e-7° (~1 cm): ticks GPS duplicados no repiten jumpTo/easeTo/DOM. */
function locationDeltaSignificant(prev, lat, lng) {
  if (prev == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return true
  return Math.abs(prev.lat - lat) >= 1e-7 || Math.abs(prev.lng - lng) >= 1e-7
}

/** Nodo al que Mapbox engancha el canvas (`getContainer()`), no el shell que también lleva el pin. */
function resolveWaitmeMapDomContainer(containerRef) {
  const m = getGlobalMapInstance()
  const fromMap = m?.getContainer?.()
  if (fromMap instanceof HTMLElement) return fromMap
  const wrap = containerRef?.current
  if (!wrap) return null
  const first = wrap.firstElementChild
  return first instanceof HTMLElement ? first : wrap
}

/**
 * Offset Y para `jumpTo`/`flyTo`: solo rect del contenedor Mapbox + pin (coords locales al mapa).
 * pinTipLocalY - mapCenterLocalY === pinTipClientY - mapCenterClientY (sin visualViewport).
 */
function measureWaitmeMapPinCameraOffsetY(pinEl, mapContainerEl) {
  if (!pinEl || !mapContainerEl) return null
  const mapRect = mapContainerEl.getBoundingClientRect()
  const pinRect = pinEl.getBoundingClientRect()
  const mapCenterLocalY = mapRect.height / 2
  const pinTipLocalY = pinRect.bottom - mapRect.top
  const offsetY = pinTipLocalY - mapCenterLocalY
  return {
    offsetY,
    mapRect,
    mapCenterLocalY,
    pinTipLocalY,
    mapCenterClientY: mapRect.top + mapCenterLocalY,
    pinTipClientY: pinRect.bottom,
  }
}

function applyWaitmeMapPinAndParkingCamera(pinEl, mapContainerEl, parkingBandPinAdjust) {
  if (typeof window === 'undefined' || !pinEl || !mapContainerEl) return

  const measured = measureWaitmeMapPinCameraOffsetY(pinEl, mapContainerEl)
  if (!measured) return
  const { offsetY } = measured
  const devicePixelRatioFix = window.devicePixelRatio || 1
  const subPixelAdjustment = (devicePixelRatioFix - 1) * 2
  const finalOffsetY = offsetY + subPixelAdjustment

  const logPinCalibration = () => {
    if (import.meta.env.DEV) {
      console.info('[WaitMe][PIN_CALIBRATION]', {
        offsetY,
        finalOffsetY,
        devicePixelRatio: window.devicePixelRatio,
      })
    }
  }

  if (!parkingBandPinAdjust) {
    window.__WAITME_PIN_OFFSET_Y__ = finalOffsetY
    logPinCalibration()
    logWaitmeViewportDebug({ mapPinCamera: 'mapbox-container' })
    return
  }

  const searchEl = document.querySelector(GAP_SEARCH_BOTTOM)
  const cardEl = document.querySelector(GAP_CARD_TOP)
  if (!searchEl || !cardEl) {
    window.__WAITME_PIN_OFFSET_Y__ = finalOffsetY
    logPinCalibration()
    logWaitmeViewportDebug({ mapPinCamera: 'parking-fallback-offset' })
    return
  }
  const searchBottom = searchEl.getBoundingClientRect().bottom
  const cardTop = cardEl.getBoundingClientRect().top
  if (!(cardTop > searchBottom)) {
    window.__WAITME_PIN_OFFSET_Y__ = finalOffsetY
    logPinCalibration()
    logWaitmeViewportDebug({ mapPinCamera: 'parking-fallback-offset' })
    return
  }

  delete window.__WAITME_PIN_OFFSET_Y__
  logWaitmeViewportDebug({ mapPinCamera: 'gap-mode' })
}

void mapboxgl.Map

function applyPostLoadStyle(map, readOnly) {
  try {
    reapplyMapVisualLayers(map, readOnly)
  } catch {
    /* */
  }
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
  readOnly = true,
  /** Home/Login: pin visible en `MainLayout`; el del mapa queda solo para medición de offset. */
  hideViewportCenterPin = false,
  parkingBandPinAdjust = false,
  /** Home: seguir GPS. Parking search: no. Parking parked: sí (recenter al volver al mapa). */
  followUserGps = true,
  /** `search`: pin viewport tipo Uber. `parked`: marcador GPS. Solo con `parkingBandPinAdjust`. */
  parkingPinMode = 'parked',
  /** Pantalla mapa al frente; si false, se pausa cámara/proyecciones/pin sin desmontar el mapa. */
  mapForeground = true,
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
  const hideViewportCenterPinRef = useRef(hideViewportCenterPin)
  hideViewportCenterPinRef.current = hideViewportCenterPin
  /** Evita condición de carrera: `setMapFollowUserGps` corre tras el primer paint. */
  const followUserGpsRef = useRef(followUserGps)
  followUserGpsRef.current = followUserGps
  const parkingPinModeRef = useRef(parkingPinMode)
  const parkingBandPinAdjustRef = useRef(parkingBandPinAdjust)
  parkingPinModeRef.current = parkingPinMode
  parkingBandPinAdjustRef.current = parkingBandPinAdjust
  /** Una sola alineación tipo “aparcado” al entrar en búsqueda; luego ref se resetea al salir de search. */
  const searchInitialGapAlignDoneRef = useRef(false)
  const prevParkingPinModeForFollowRef = useRef(/** @type {string | null} */ (null))
  /** Última posición aplicada al mapa (evita trabajo repetido en ticks GPS idénticos). */
  const lastMapLocationRef = useRef(/** @type {{ lat: number, lng: number } | null} */ (null))
  /**
   * Un solo posicionamiento inicial desde `subscribeToLocation` (no `getCurrentLocationFast` en onLoad).
   * Evita doble salto: caché/localStorage vs primer fix del watch.
   */
  const hasValidInitialLocationRef = useRef(false)
  const mapForegroundRef = useRef(mapForeground)
  mapForegroundRef.current = mapForeground

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
      const prevMode = prevParkingPinModeForFollowRef.current
      prevParkingPinModeForFollowRef.current = parkingPinMode
      if (parkingPinMode === 'search') {
        if (prevMode !== 'search') {
          setSearchFollowUserGps(true)
        }
      } else {
        setSearchFollowUserGps(false)
        searchGpsRef.current = null
        setSearchPinPixel(null)
      }
    }
    setMapReadOnlySession(readOnly)
    lastMapLocationRef.current = null
    hasValidInitialLocationRef.current = false
    const map = getGlobalMapInstance()
    if (map?.isStyleLoaded?.()) {
      try {
        reapplyMapVisualLayers(map, readOnly)
      } catch {
        /* */
      }
    }
  }, [readOnly, followUserGps, parkingBandPinAdjust, parkingPinMode])

  useEffect(() => {
    const suppress =
      readOnly && hideViewportCenterPin && !parkingBandPinAdjust
    setWaitmePinOffsetYSuppressed(suppress)
    return () => {
      setWaitmePinOffsetYSuppressed(false)
    }
  }, [readOnly, hideViewportCenterPin, parkingBandPinAdjust])

  const projectSearchPinFromGps = useCallback(() => {
    const map = getGlobalMapInstance()
    if (!map?.project || !map.isStyleLoaded?.()) return
    const g = searchGpsRef.current
    if (!g || !Number.isFinite(g.lng) || !Number.isFinite(g.lat)) return
    try {
      const p = map.project([g.lng, g.lat])
      setSearchPinPixel((prev) => {
        if (
          prev &&
          Math.abs(prev.x - p.x) < 0.25 &&
          Math.abs(prev.y - p.y) < 0.25
        ) {
          return prev
        }
        return { x: p.x, y: p.y }
      })
    } catch {
      /* */
    }
  }, [])

  const projectSearchPinFromGpsRef = useRef(projectSearchPinFromGps)
  projectSearchPinFromGpsRef.current = projectSearchPinFromGps

  /** Al volver al mapa: un resize + una pasada de cámara/pin desde refs (sin recrear el mapa). */
  useEffect(() => {
    if (!mapForeground) return undefined
    if (import.meta.env?.MODE === 'test') return undefined
    const map = getGlobalMapInstance()
    if (!map?.isStyleLoaded?.()) return undefined

    const raf = requestAnimationFrame(() => {
      try {
        map.resize()
      } catch {
        /* */
      }

      const last = lastMapLocationRef.current
      if (!last || !Number.isFinite(last.lat) || !Number.isFinite(last.lng)) return
      const { lat, lng } = last

      const isHeroHomeLogin =
        readOnlyRef.current &&
        hideViewportCenterPinRef.current &&
        !parkingBandPinAdjustRef.current
      const isSearch = parkingBandPinAdjustRef.current && parkingPinModeRef.current === 'search'
      const isParked = parkingBandPinAdjustRef.current && parkingPinModeRef.current === 'parked'

      if (isSearch) {
        searchGpsRef.current = { lng, lat }
        projectSearchPinFromGpsRef.current()
        if (getSearchFollowUserGps() && map.isStyleLoaded?.()) {
          jumpMapToGpsSearch(map, lng, lat)
        }
        return
      }

      if (isHeroHomeLogin) {
        jumpMapLngLatUnderHeroPinTip(map, lng, lat)
        return
      }

      if (isParked) {
        if (getParkedAutoAlignGps()) {
          alignParkedGpsMarkerToGap(map, { lng, lat })
        }
        return
      }

      if (followUserGpsRef.current) {
        centerMapOnUserImmediate(map, { latitude: lat, longitude: lng })
      }
    })

    return () => cancelAnimationFrame(raf)
  }, [mapForeground])

  /** Home: offset de cámara desde el contenedor Mapbox real + pin. Parking search: hueco buscador–tarjeta. */
  useEffect(() => {
    if (!mapForeground) {
      return undefined
    }
    if (!parkingBandPinAdjust) {
      const run = () => {
        requestAnimationFrame(() => {
          const mapContainer = resolveWaitmeMapDomContainer(containerRef)
          const heroTip =
            typeof document !== 'undefined' ? document.querySelector('[data-waitme-pin-tip]') : null
          const pinEl =
            hideViewportCenterPinRef.current && heroTip instanceof HTMLElement ? heroTip : pinRef.current
          applyWaitmeMapPinAndParkingCamera(pinEl, mapContainer, false)
        })
      }

      run()
      const observeEl = containerRef.current ?? mapShellRef.current
      const ro = observeEl ? new ResizeObserver(run) : null
      if (observeEl && ro) ro.observe(observeEl)
      const unsubVvWin = subscribeWaitmeViewportEvents(run)
      const raf = requestAnimationFrame(run)
      return () => {
        ro?.disconnect()
        unsubVvWin()
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
        const mapContainer = resolveWaitmeMapDomContainer(containerRef)
        applyWaitmeMapPinAndParkingCamera(pinRef.current, mapContainer, true)

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
    const observeEl = containerRef.current ?? mapShellRef.current
    const ro = observeEl ? new ResizeObserver(run) : null
    if (observeEl && ro) ro.observe(observeEl)
    const unsubVvWin = subscribeWaitmeViewportEvents(run)
    const raf = requestAnimationFrame(run)
    return () => {
      ro?.disconnect()
      unsubVvWin()
      cancelAnimationFrame(raf)
      observedParking.forEach((obs) => obs.disconnect())
      observedParking.clear()
      delete window.__WAITME_PIN_OFFSET_Y__
    }
  }, [parkingBandPinAdjust, parkingPinMode, mapForeground])

  const parkingPinModePrevRef = useRef(parkingPinMode)
  useEffect(() => {
    if (parkingPinMode === 'parked' && parkingPinModePrevRef.current !== 'parked') {
      setParkedAutoAlignGps(true)
    }
    parkingPinModePrevRef.current = parkingPinMode
  }, [parkingPinMode])

  /** Parked: el usuario arrastra/rote/inclina → dejar de seguir el GPS hasta pulsar «Ubicación». */
  useEffect(() => {
    if (
      !parkingBandPinAdjust ||
      parkingPinMode !== 'parked' ||
      unavailable ||
      import.meta.env?.MODE === 'test' ||
      !mapForeground
    ) {
      return undefined
    }
    let cancelled = false
    let attached = false
    let pollId = null
    const stop = () => setParkedAutoAlignGps(false)
    pollId = window.setInterval(() => {
      if (attached || cancelled) return
      const map = getGlobalMapInstance()
      if (!map?.on) return
      map.on('dragstart', stop)
      map.on('rotatestart', stop)
      map.on('pitchstart', stop)
      attached = true
      if (pollId != null) {
        window.clearInterval(pollId)
        pollId = null
      }
    }, 100)
    return () => {
      cancelled = true
      if (pollId != null) window.clearInterval(pollId)
      const map = getGlobalMapInstance()
      if (map?.off) {
        try {
          map.off('dragstart', stop)
          map.off('rotatestart', stop)
          map.off('pitchstart', stop)
        } catch {
          /* */
        }
      }
    }
  }, [parkingBandPinAdjust, parkingPinMode, unavailable, mapForeground])

  useEffect(() => {
    if (!parkingBandPinAdjust || parkingPinMode !== 'search') {
      searchInitialGapAlignDoneRef.current = false
    }
  }, [parkingBandPinAdjust, parkingPinMode])

  /**
   * Singleton Mapbox: init en layout (ref DOM listo). Si no hay instancia global, `initMap` reintenta con rAF
   * hasta tener `containerRef` (antes un `return` temprano dejaba `createMap` sin ejecutar nunca).
   */
  useLayoutEffect(() => {
    let cancelled = false
    let pendingRaf = 0
    let rafAttempts = 0
    const MAX_CONTAINER_RAF_ATTEMPTS = 120
    /** @type {() => void} */
    let teardown = () => {}

    let unsubscribeLocation = null
    const ensureLocationPipe = () => {
      if (unsubscribeLocation) return
      unsubscribeLocation = subscribeToLocation((loc) => {
        if (!loc) return
        const lat = loc.latitude
        const lng = loc.longitude
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

        const map = getGlobalMapInstance()
        if (!map) return

        const fg = mapForegroundRef.current

        const isHeroHomeLogin =
          readOnlyRef.current &&
          hideViewportCenterPinRef.current &&
          !parkingBandPinAdjustRef.current
        const isSearch = parkingBandPinAdjustRef.current && parkingPinModeRef.current === 'search'
        const isParked = parkingBandPinAdjustRef.current && parkingPinModeRef.current === 'parked'

        if (!hasValidInitialLocationRef.current) {
          if (!fg) {
            if (isSearch) {
              searchGpsRef.current = { lng, lat }
            }
            lastMapLocationRef.current = { lat, lng }
            return
          }

          if (!map.isStyleLoaded?.() && !isHeroHomeLogin) {
            return
          }
          if (isSearch && !searchInitialGapAlignDoneRef.current && !isWaitmeParkingLayoutReady()) {
            return
          }
          if (isHeroHomeLogin) {
            const pin =
              typeof document !== 'undefined'
                ? document.querySelector('[data-waitme-pin-tip]')
                : null
            if (!(pin instanceof HTMLElement)) {
              return
            }
            jumpMapLngLatUnderHeroPinTip(map, lng, lat)
            hasValidInitialLocationRef.current = true
            lastMapLocationRef.current = { lat, lng }
            return
          }

          if (isSearch) {
            searchGpsRef.current = { lng, lat }
            if (!searchInitialGapAlignDoneRef.current) {
              centerParkingMapOnGpsLikeParked(map, lng, lat)
              setSearchFollowUserGps(false)
              searchInitialGapAlignDoneRef.current = true
            }
            projectSearchPinFromGpsRef.current()
            hasValidInitialLocationRef.current = true
            lastMapLocationRef.current = { lat, lng }
            return
          }

          if (isParked) {
            if (getParkedAutoAlignGps()) {
              alignParkedGpsMarkerToGap(map, { lng, lat })
            }
            hasValidInitialLocationRef.current = true
            lastMapLocationRef.current = { lat, lng }
            return
          }

          if (followUserGpsRef.current) {
            centerMapOnUserImmediate(map, loc)
            hasValidInitialLocationRef.current = true
            lastMapLocationRef.current = { lat, lng }
            return
          }

          hasValidInitialLocationRef.current = true
          lastMapLocationRef.current = { lat, lng }
          return
        }

        const prevApplied = lastMapLocationRef.current
        const significant = locationDeltaSignificant(prevApplied, lat, lng)

        if (isSearch) {
          searchGpsRef.current = { lng, lat }
          if (!significant) return
          if (!fg) {
            lastMapLocationRef.current = { lat, lng }
            return
          }
          projectSearchPinFromGpsRef.current()
          if (map && getSearchFollowUserGps() && map.isStyleLoaded?.()) {
            jumpMapToGpsSearch(map, lng, lat)
          }
          lastMapLocationRef.current = { lat, lng }
          return
        }

        if (isHeroHomeLogin) {
          if (!significant) return
          if (!fg) {
            lastMapLocationRef.current = { lat, lng }
            return
          }
          jumpMapLngLatUnderHeroPinTip(map, lng, lat)
          lastMapLocationRef.current = { lat, lng }
          return
        }

        if (!map.isStyleLoaded?.()) return
        if (isParked) {
          if (!significant) return
          if (!fg) {
            lastMapLocationRef.current = { lat, lng }
            return
          }
          if (getParkedAutoAlignGps()) {
            alignParkedGpsMarkerToGap(map, { lng, lat })
          }
          lastMapLocationRef.current = { lat, lng }
          return
        }
        if (followUserGpsRef.current) {
          if (!significant) return
          if (!fg) {
            lastMapLocationRef.current = { lat, lng }
            return
          }
          centerMapOnUserImmediate(map, loc)
          lastMapLocationRef.current = { lat, lng }
        }
      })
    }
    const clearLocationPipe = () => {
      if (unsubscribeLocation) {
        unsubscribeLocation()
        unsubscribeLocation = null
      }
    }

    const existingMap = getGlobalMapInstance()
    if (import.meta.env.DEV) {
      console.info('[WaitMe][Map]', {
        step: 'layout',
        hasExistingMap: Boolean(existingMap),
        hasContainer: Boolean(containerRef.current),
      })
    }

    if (existingMap) {
      mapInstanceRef.current = existingMap
      let existingLoadCancelled = false
      const onExistingLoad = () => {
        if (existingLoadCancelled) return
        applyPostLoadStyle(existingMap, readOnlyRef.current)
        fireSettled()
      }
      const onExistingError = (e) => {
        console.error('[WaitMe][Mapbox] MAPBOX ERROR:', e?.error ?? e)
        try {
          existingMap.off('error', onExistingError)
        } catch {
          /* */
        }
        try {
          existingMap.off('load', onExistingLoad)
        } catch {
          /* */
        }
        try {
          existingMap.remove()
        } catch {
          /* */
        }
        setGlobalMapInstance(null)
        mapInstanceRef.current = null
        setUnavailable(true)
        clearLocationPipe()
        fireSettled()
      }
      existingMap.on('error', onExistingError)
      ensureLocationPipe()
      if (existingMap.isStyleLoaded?.()) {
        onExistingLoad()
      } else {
        existingMap.once('load', onExistingLoad)
      }
      teardown = () => {
        existingLoadCancelled = true
        try {
          existingMap.off('error', onExistingError)
        } catch {
          /* */
        }
        existingMap.off('load', onExistingLoad)
        clearLocationPipe()
      }
    } else {
      const initMap = () => {
        if (cancelled) return
        const containerEl = containerRef.current
        if (import.meta.env.DEV) {
          console.info('[WaitMe][Map]', {
            step: 'initMap',
            hasContainer: Boolean(containerEl),
            hasGlobalMap: Boolean(getGlobalMapInstance()),
          })
        }
        if (!containerEl) {
          rafAttempts += 1
          if (rafAttempts > MAX_CONTAINER_RAF_ATTEMPTS) {
            if (import.meta.env.DEV) {
              console.warn(
                '[WaitMe][Map] initMap: container ref ausente tras rAF; createMap no se llamó'
              )
            }
            return
          }
          pendingRaf = requestAnimationFrame(initMap)
          return
        }

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
          globalContainer.style.position = 'relative'
        }

        if (containerEl.firstChild !== globalContainer) {
          containerEl.innerHTML = ''
          containerEl.appendChild(globalContainer)
        }

        const token = getMapboxAccessToken()
        if (import.meta.env.DEV) {
          console.info('[WaitMe][Map]', { step: 'beforeCreateMap', hasToken: Boolean(token) })
        }
        if (!token) {
          setUnavailable(true)
          setGlobalMapInstance(null)
          fireSettled()
          return
        }

        try {
          const map = createMap(globalContainer, { token, interactive: true })
          if (import.meta.env.DEV) {
            console.info('[WaitMe][Map]', {
              step: 'createMap',
              ok: Boolean(map && typeof map.jumpTo === 'function'),
            })
          }
          if (!map || typeof map.jumpTo !== 'function') {
            setUnavailable(true)
            setGlobalMapInstance(null)
            fireSettled()
            return
          }

          const onFirstLoad = () => {
            if (cancelled) return
            applyPostLoadStyle(map, readOnlyRef.current)
            fireSettled()
          }

          const onMapError = (e) => {
            console.error('[WaitMe][Mapbox] MAPBOX ERROR:', e?.error ?? e)
            try {
              map.off('error', onMapError)
            } catch {
              /* */
            }
            try {
              map.off('load', onFirstLoad)
            } catch {
              /* */
            }
            try {
              map.remove()
            } catch {
              /* */
            }
            setGlobalMapInstance(null)
            mapInstanceRef.current = null
            setUnavailable(true)
            clearLocationPipe()
            fireSettled()
          }

          map.on('error', onMapError)

          setGlobalMapInstance(map)
          mapInstanceRef.current = map

          try {
            map.setFadeDuration?.(0)
          } catch {
            /* */
          }

          ensureLocationPipe()

          if (map.isStyleLoaded?.()) {
            onFirstLoad()
          } else {
            map.once('load', onFirstLoad)
          }

          teardown = () => {
            try {
              map.off('error', onMapError)
            } catch {
              /* */
            }
            map.off('load', onFirstLoad)
            clearLocationPipe()
          }
        } catch (err) {
          console.error('[WaitMe][Map] MAP FAILED:', err)
          setUnavailable(true)
          setGlobalMapInstance(null)
          mapInstanceRef.current = null
          fireSettled()
        }
      }

      initMap()
    }

    return () => {
      cancelled = true
      if (pendingRaf) cancelAnimationFrame(pendingRaf)
      teardown()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- init singleton; props vía refs.

  useEffect(() => {
    if (import.meta.env?.MODE === 'test') return
    if (!mapForeground) return undefined

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

    const unsubVv = subscribeWaitmeViewportEvents(resizeMap)

    const t1 = setTimeout(resizeMap, 500)
    const t2 = setTimeout(resizeMap, 1200)

    return () => {
      unsubVv()
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [mapForeground])

  useEffect(() => {
    if (unavailable || import.meta.env?.MODE === 'test') return
    if (!parkingBandPinAdjust || parkingPinMode !== 'search') return
    if (!mapForeground) return undefined

    let cancelled = false
    let rafId = 0
    let moveProjectRafId = 0
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
      /** Mapbox emite `move` muy a menudo; una proyección por frame basta para el pin. */
      const scheduleProjectPin = () => {
        if (moveProjectRafId !== 0) return
        moveProjectRafId = requestAnimationFrame(() => {
          moveProjectRafId = 0
          if (!cancelled) projectSearchPinFromGpsRef.current()
        })
      }
      const onMove = () => {
        scheduleProjectPin()
      }
      const onResize = () => {
        scheduleProjectPin()
      }
      map.on('dragstart', onDragStart)
      map.on('move', onMove)
      const unsubVv = subscribeWaitmeViewportEvents(onResize)
      detach = () => {
        if (moveProjectRafId !== 0) {
          cancelAnimationFrame(moveProjectRafId)
          moveProjectRafId = 0
        }
        map.off('dragstart', onDragStart)
        map.off('move', onMove)
        unsubVv()
      }
    }
    tryAttach()
    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      detach()
    }
  }, [unavailable, parkingBandPinAdjust, parkingPinMode, projectSearchPinFromGps, mapForeground])

  return (
    <>
      <style>
        {`
          [data-waitme-map-shell] {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          [data-waitme-map-shell] .mapboxgl-canvas,
          [data-waitme-map-shell] .mapboxgl-canvas-container {
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
          }
        `}
      </style>
      <div
        ref={mapShellRef}
        data-waitme-map-shell
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          maxWidth: 'none',
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
          flex: 1,
          minWidth: 0,
          alignSelf: 'stretch',
        }}
      >
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
        />
        {unavailable ? null : !parkingBandPinAdjust ? (
          <MapViewportCenterPin ref={pinRef} forMeasurementOnly={hideViewportCenterPin} />
        ) : parkingPinMode === 'search' ? (
          <MapViewportCenterPin
            ref={pinRef}
            showTuLabel
            pinPixel={
              searchPinPixel != null &&
              Number.isFinite(searchPinPixel.x) &&
              Number.isFinite(searchPinPixel.y)
                ? searchPinPixel
                : undefined
            }
          />
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
