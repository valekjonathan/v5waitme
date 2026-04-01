import { useCallback, useEffect, useRef, useState } from 'react'
import 'mapbox-gl/dist/mapbox-gl.css'
import {
  createMap,
  DEFAULT_PITCH,
  DEFAULT_ZOOM,
  getMapboxAccessToken,
  reapplyMapVisualLayers,
} from '../constants/mapbox.js'
import { setMapReadOnlySession } from '../mapSession.js'
import { setGlobalMapInstance } from '../mapInstance.js'
import {
  getCurrentLocationFast,
  getCurrentPosition,
  subscribeToLocation,
} from '../../../services/location.js'

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

export default function Map({ onSettled, mapFocusGeneration = 0, readOnly = true }) {
  const containerRef = useRef(null)
  const [unavailable, setUnavailable] = useState(false)
  const settledRef = useRef(false)

  const fireSettled = useCallback(() => {
    if (settledRef.current) return
    settledRef.current = true
    onSettled?.()
  }, [onSettled])

  useEffect(() => {
    setMapReadOnlySession(readOnly)
    if (!globalMap?.isStyleLoaded?.()) return
    try {
      reapplyMapVisualLayers(globalMap, readOnly)
    } catch {
      /* */
    }
  }, [readOnly])

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
        centerMapOnUser(globalMap, loc)
      })
    }

    if (globalMap) {
      setGlobalMapInstance(globalMap)
      ensureLocationPipe()
      if (globalMap.isStyleLoaded?.()) {
        applyPostLoadStyle(globalMap, readOnly)
        const fast = getCurrentLocationFast()
        if (fast) centerMapOnUser(globalMap, fast)
        fireSettled()
      } else {
        globalMap.once('load', () => {
          applyPostLoadStyle(globalMap, readOnly)
          const fast = getCurrentLocationFast()
          if (fast) centerMapOnUser(globalMap, fast)
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
      const fast = getCurrentLocationFast()
      if (fast) {
        centerMapOnUser(globalMap, fast)
      } else {
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
      }
      fireSettled()
    }

    ensureLocationPipe()

    if (globalMap.isStyleLoaded?.()) {
      onFirstLoad()
    } else {
      globalMap.once('load', onFirstLoad)
    }
  }, [fireSettled, readOnly])

  useEffect(() => {
    if (mapFocusGeneration === 0) return
    if (!globalMap?.isStyleLoaded?.()) return

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
  }, [mapFocusGeneration])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
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
