import { useCallback, useEffect, useRef, useState } from 'react'
import 'mapbox-gl/dist/mapbox-gl.css'
import {
  applyMapReadOnly,
  applyRoadStyleForCreate,
  createMap,
  DEFAULT_PITCH,
  DEFAULT_ZOOM,
  getMapboxAccessToken,
  setupMapStyleOnLoad,
} from '../constants/mapbox.js'
import { colors } from '../../../design/colors'
import {
  getCurrentLocationFast,
  getCurrentPosition,
  subscribeToLocation,
} from '../../../services/location.js'

let globalMap = null
let globalContainer = null
/** Una sola suscripción al stream GPS para el mapa singleton. */
let locationSubscribed = false

function applyPostLoadStyle(map) {
  try {
    setupMapStyleOnLoad(map)
    applyRoadStyleForCreate(map)
    applyMapReadOnly(map, true)
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

export default function Map({ onSettled, mapFocusGeneration = 0 }) {
  const containerRef = useRef(null)
  const [unavailable, setUnavailable] = useState(false)
  const settledRef = useRef(false)

  const fireSettled = useCallback(() => {
    if (settledRef.current) return
    settledRef.current = true
    onSettled?.()
  }, [onSettled])

  useEffect(() => {
    if (!containerRef.current) return

    if (import.meta.env?.MODE === 'test') {
      setUnavailable(true)
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
      ensureLocationPipe()
      if (globalMap.isStyleLoaded?.()) {
        applyPostLoadStyle(globalMap)
        const fast = getCurrentLocationFast()
        if (fast) centerMapOnUser(globalMap, fast)
        fireSettled()
      } else {
        globalMap.once('load', () => {
          applyPostLoadStyle(globalMap)
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
      fireSettled()
      return
    }

    globalMap = createMap(globalContainer, { token, interactive: false })
    if (!globalMap || typeof globalMap.jumpTo !== 'function') {
      setUnavailable(true)
      fireSettled()
      return
    }

    try {
      globalMap.setFadeDuration?.(0)
    } catch {
      /* */
    }

    const onFirstLoad = () => {
      applyPostLoadStyle(globalMap)
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
  }, [fireSettled])

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
