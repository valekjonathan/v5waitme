import { usePostHog } from '@posthog/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import 'mapbox-gl/dist/mapbox-gl.css'
import {
  ACCURACY_RECENTER_THRESHOLD,
  applyMapReadOnly,
  applyRoadStyleForCreate,
  createMap,
  DEFAULT_PITCH,
  DEFAULT_ZOOM,
  getMapboxAccessToken,
  OVIEDO_LAT,
  OVIEDO_LNG,
  setupMapStyleOnLoad,
} from '../constants/mapbox.js'
import { colors } from '../../../design/colors'
import {
  createPositionGuard,
  distanceMeters,
  getCurrentPosition,
  watchPosition,
} from '../../../services/location.js'
import { EVENTS, track } from '../../../lib/tracking.js'

const OVIEDO_FALLBACK = {
  lat: OVIEDO_LAT,
  lng: OVIEDO_LNG,
  accuracy: 500,
  ts: Date.now(),
  confidence: 0.2,
  tracking: 'lost',
}
const MAX_REFINE_ACCURACY_M = 140
const MIN_MOVE_TO_REFINE_M = 24
const MAX_JUMP_M = 3200
const MIN_MS_BETWEEN_REFINE = 1000
const FOLLOW_MIN_CONFIDENCE = 0.64
const MAX_FOLLOW_SPEED_MPS = 42

function createGeoObserver() {
  const enabled = import.meta.env.DEV && import.meta.env.VITE_WAITME_GEO_DEBUG === '1'
  if (!enabled) return null

  return function observe(event) {
    if (event.type === 'position_discarded') {
      console.debug('[WaitMe][Geo]', event.type, event.reason)
      return
    }
    if (event.type === 'tracking_changed') {
      console.debug('[WaitMe][Geo]', event.type, event.tracking, event.confidence)
      return
    }
    if (event.type === 'low_confidence') {
      console.debug('[WaitMe][Geo]', event.type, event.confidence)
    }
  }
}

export default function Map({ onSettled: onSettledProp }) {
  const posthog = usePostHog()
  const posthogRef = useRef(posthog)
  const onSettledRef = useRef(onSettledProp)
  const settledOnceRef = useRef(false)
  useEffect(() => {
    posthogRef.current = posthog
  }, [posthog])
  useEffect(() => {
    onSettledRef.current = onSettledProp
  }, [onSettledProp])

  const fireMapSettled = useCallback(() => {
    if (settledOnceRef.current) return
    settledOnceRef.current = true
    onSettledRef.current?.()
  }, [])

  const mapRef = useRef(null)
  const containerRef = useRef(null)
  const watchIdRef = useRef(null)
  const gpsTimeoutRef = useRef(null)
  const resizeObserverRef = useRef(null)
  const resizeTimeout100Ref = useRef(null)
  const resizeTimeout400Ref = useRef(null)

  const hasFlownToUserRef = useRef(false)
  const lastFlownRef = useRef(null)
  const lastRefineAtRef = useRef(0)

  const [mapReady, setMapReady] = useState(false)
  const [mapFailed, setMapFailed] = useState(false)
  const [location, setLocation] = useState(() => ({
    lat: null,
    lng: null,
    accuracy: null,
    ts: null,
    confidence: 0,
    tracking: 'searching',
    speedMps: 0,
  }))

  const geoObserver = useMemo(() => createGeoObserver(), [])
  const acceptPosition = useMemo(() => createPositionGuard({ onEvent: geoObserver }), [geoObserver])

  useEffect(() => {
    const t = window.setTimeout(fireMapSettled, 2000)
    return () => window.clearTimeout(t)
  }, [fireMapSettled])

  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    let cancelled = false
    let map
    let loadTimeoutId = null
    let loadCompleted = false

    const failMap = (detail, err) => {
      console.error('Mapbox failed to load', detail, err ?? '')
      if (cancelled) return
      if (loadTimeoutId) {
        clearTimeout(loadTimeoutId)
        loadTimeoutId = null
      }
      clearTimeout(resizeTimeout100Ref.current)
      clearTimeout(resizeTimeout400Ref.current)
      resizeTimeout100Ref.current = null
      resizeTimeout400Ref.current = null
      resizeObserverRef.current?.disconnect?.()
      resizeObserverRef.current = null
      setMapReady(false)
      setMapFailed(true)
      fireMapSettled()
      try {
        if (map) {
          map.off('error', onMapError)
          map.off('dragend', onMapUserInteraction)
          map.off('zoomend', onZoomEnd)
        }
      } catch {
        /* */
      }
      try {
        map?.remove()
      } catch {
        /* */
      }
      map = undefined
      mapRef.current = null
    }

    const onMapUserInteraction = () => {
      track(EVENTS.MAP_INTERACTION, { screen: 'map' }, posthogRef.current)
    }

    const onZoomEnd = (e) => {
      if (e?.originalEvent) onMapUserInteraction()
    }

    const onMapError = (e) => {
      failMap('mapbox error event', e?.error ?? e)
    }

    try {
      const token = getMapboxAccessToken()
      if (!token) {
        console.warn('[WaitMe][Map] Mapbox omitido: sin VITE_MAPBOX_ACCESS_TOKEN')
        setMapFailed(true)
        fireMapSettled()
        return () => {}
      }
      map = createMap(container, { token, interactive: false })
      if (!map) {
        console.warn('[WaitMe][Map] Mapbox omitido: createMap devolvió null')
        setMapFailed(true)
        fireMapSettled()
        return () => {}
      }
    } catch (err) {
      console.error('Mapbox failed to load', 'initialization', err)
      setMapReady(false)
      setMapFailed(true)
      fireMapSettled()
      return () => {}
    }

    if (cancelled) {
      try {
        map.remove()
      } catch {
        /* */
      }
      return
    }

    try {
      mapRef.current = map
      map.on('error', onMapError)

      loadTimeoutId = setTimeout(() => {
        if (cancelled || loadCompleted) return
        failMap('style load timeout', new Error('exceeded 8s'))
      }, 8000)

      map.on('load', () => {
        if (cancelled) return
        loadCompleted = true
        if (loadTimeoutId) clearTimeout(loadTimeoutId)
        loadTimeoutId = null
        try {
          setupMapStyleOnLoad(map)
          applyRoadStyleForCreate(map)
          applyMapReadOnly(map, true)
          map.resize()
        } catch (err) {
          failMap('post-load setup', err)
          return
        }

        const resizeDelayed = () => {
          if (mapRef.current) mapRef.current.resize()
        }

        resizeTimeout100Ref.current = setTimeout(resizeDelayed, 100)
        resizeTimeout400Ref.current = setTimeout(resizeDelayed, 400)

        if (typeof ResizeObserver !== 'undefined') {
          const ro = new ResizeObserver(resizeDelayed)
          resizeObserverRef.current = ro
          ro.observe(container)
        }

        map.on('dragend', onMapUserInteraction)
        map.on('zoomend', onZoomEnd)

        track(EVENTS.MAP_LOADED, { screen: 'map' }, posthogRef.current)
        setMapReady(true)
        setMapFailed(false)
        fireMapSettled()
      })
    } catch (err) {
      failMap('map setup', err)
      return () => {}
    }

    return () => {
      cancelled = true
      if (loadTimeoutId) clearTimeout(loadTimeoutId)
      setMapReady(false)
      setMapFailed(false)
      clearTimeout(resizeTimeout100Ref.current)
      clearTimeout(resizeTimeout400Ref.current)
      resizeTimeout100Ref.current = null
      resizeTimeout400Ref.current = null
      resizeObserverRef.current?.disconnect?.()
      resizeObserverRef.current = null
      if (mapRef.current) {
        try {
          mapRef.current.off('error', onMapError)
          mapRef.current.off('dragend', onMapUserInteraction)
          mapRef.current.off('zoomend', onZoomEnd)
        } catch {
          /* */
        }
      }
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [fireMapSettled])

  useEffect(() => {
    let cancelled = false

    const applyAcceptedLocation = (coords) => {
      const accepted = acceptPosition(coords)
      if (!accepted || cancelled) return
      setLocation(accepted)
      clearTimeout(gpsTimeoutRef.current)
    }

    const handleGeoError = (err) => {
      if (cancelled) return
      const type = err?.type || 'error'

      if (type === 'denied' || type === 'unavailable') {
        clearTimeout(gpsTimeoutRef.current)
        setLocation((prev) => (prev.lat != null && prev.lng != null ? prev : OVIEDO_FALLBACK))
        return
      }

      if (type === 'timeout') {
        setLocation((prev) => (prev.lat != null && prev.lng != null ? prev : OVIEDO_FALLBACK))
      }
    }

    getCurrentPosition(applyAcceptedLocation, handleGeoError)

    gpsTimeoutRef.current = setTimeout(() => {
      setLocation((prev) => (prev.lat != null && prev.lng != null ? prev : OVIEDO_FALLBACK))
    }, 12000)

    watchIdRef.current = watchPosition(applyAcceptedLocation, handleGeoError)

    return () => {
      cancelled = true
      clearTimeout(gpsTimeoutRef.current)
      gpsTimeoutRef.current = null
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      watchIdRef.current = null
    }
  }, [acceptPosition])

  useEffect(() => {
    if (!mapReady) return

    const map = mapRef.current
    if (!map?.isStyleLoaded?.()) return

    const { lat, lng, accuracy, confidence, tracking, speedMps } = location
    if (lat == null || lng == null) return

    const isRealGps = lat !== OVIEDO_FALLBACK.lat || lng !== OVIEDO_FALLBACK.lng
    const acc = accuracy ?? 100
    if (!(isRealGps && acc <= ACCURACY_RECENTER_THRESHOLD)) return

    if (!hasFlownToUserRef.current) {
      hasFlownToUserRef.current = true
      lastFlownRef.current = { lat, lng }
      try {
        map.easeTo({
          center: [lng, lat],
          zoom: DEFAULT_ZOOM,
          pitch: DEFAULT_PITCH,
          duration: 850,
          easing: (t) => t * (2 - t),
        })
      } catch (e) {
        console.error('[WaitMe][Map] easeTo (primer vuelo) omitido:', e)
      }
      return
    }

    if (acc > MAX_REFINE_ACCURACY_M) return
    if (confidence < FOLLOW_MIN_CONFIDENCE) return
    if (tracking !== 'stable') return
    if (typeof speedMps === 'number' && speedMps > MAX_FOLLOW_SPEED_MPS) return

    const prev = lastFlownRef.current
    if (!prev) return

    const d = distanceMeters(prev.lat, prev.lng, lat, lng)
    if (d < MIN_MOVE_TO_REFINE_M || d > MAX_JUMP_M) return

    const center = map.getCenter()
    const offsetFromCenter = distanceMeters(center.lat, center.lng, lat, lng)
    if (offsetFromCenter < 22) return

    const now = Date.now()
    if (now - lastRefineAtRef.current < MIN_MS_BETWEEN_REFINE) return
    lastRefineAtRef.current = now

    lastFlownRef.current = { lat, lng }
    try {
      map.easeTo({
        center: [lng, lat],
        zoom: DEFAULT_ZOOM,
        pitch: DEFAULT_PITCH,
        duration: 720,
        easing: (t) => 1 - (1 - t) * (1 - t),
      })
    } catch (e) {
      console.error('[WaitMe][Map] easeTo (refinar) omitido:', e)
    }
    // Cámara: dependencias granulares de `location` (no el objeto entero) para no re-ejecutar en cada tick de `ts`.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intencional: `location` completo dispararía recenters innecesarios
  }, [
    mapReady,
    location.lat,
    location.lng,
    location.accuracy,
    location.confidence,
    location.tracking,
    location.speedMps,
  ])

  const showMapFallback = mapFailed

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {showMapFallback ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            padding: 16,
            backgroundColor: colors.background,
            color: colors.textMuted,
            fontSize: 13,
            fontWeight: 500,
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          Vista de mapa no disponible por ahora
        </div>
      ) : null}
    </div>
  )
}
