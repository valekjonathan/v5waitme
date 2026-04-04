/**
 * Controles mapa: zoom +/-, ubicación, capas (instancia global; sin tocar Map.jsx).
 */
import { useEffect, useState } from 'react'
import { reapplyMapVisualLayers } from '../../map/constants/mapbox.js'
import { recenterGlobalMapOnUser } from '../../map/mapControls.js'
import { getGlobalMapInstance } from '../../map/mapInstance.js'
import { getMapReadOnlySession } from '../../map/mapSession.js'
import { IconLayers, IconMinus, IconPlus } from './icons.jsx'
import { MAP_SHELL_OVERLAY, cssMapOverlayTopFromLegacy } from '../../../ui/layout/layout'

const locationIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2" />
    <circle cx="12" cy="12" r="3" fill="white" />
  </svg>
)

function zoomIn(map) {
  if (!map || typeof map.easeTo !== 'function' || typeof map.getZoom !== 'function') return
  const c = map.getCenter()
  map.easeTo({
    center: [c.lng, c.lat],
    zoom: Math.min(20, map.getZoom() + 1),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
    duration: 180,
  })
}

function zoomOut(map) {
  if (!map || typeof map.easeTo !== 'function' || typeof map.getZoom !== 'function') return
  const c = map.getCenter()
  map.easeTo({
    center: [c.lng, c.lat],
    zoom: Math.max(3, map.getZoom() - 1),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
    duration: 180,
  })
}

const STYLE_URL = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
}

/** Mismo aspecto que el contenedor del buscador (`StreetSearch.jsx`): panel oscuro + borde morado + blur. */
const btnStyle = {
  boxSizing: 'border-box',
  width: 36,
  height: 36,
  borderRadius: 12,
  border: '1px solid rgba(168, 85, 247, 0.5)',
  color: '#fff',
  background: 'rgba(15, 23, 42, 0.9)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
}

const zoomControlsWrapStyle = {
  position: 'absolute',
  top: cssMapOverlayTopFromLegacy(MAP_SHELL_OVERLAY.legacyControlsTopPx),
  left: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  zIndex: 15,
  pointerEvents: 'auto',
}

export default function MapZoomControls({ className = '', measureLabel }) {
  const [mapStyle, setMapStyle] = useState('dark')

  useEffect(() => {
    if (!measureLabel || !import.meta.env.DEV) return
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector('[data-zoom-controls]')
      if (!el) return
      const rect = el.getBoundingClientRect()
      const key = measureLabel === 'create' ? 'createZoomTop' : 'navigateZoomTop'
      const prev = window.__WAITME_ZOOM_MEASURE || {}
      const next = { ...prev, [key]: rect.top }
      window.__WAITME_ZOOM_MEASURE = next
    })
    return () => cancelAnimationFrame(raf)
  }, [measureLabel])

  const onZoomIn = () => zoomIn(getGlobalMapInstance())
  const onZoomOut = () => zoomOut(getGlobalMapInstance())
  const onLocate = () => recenterGlobalMapOnUser()

  const onLayers = () => {
    setMapStyle((prev) => {
      const next = prev === 'dark' ? 'light' : prev === 'light' ? 'satellite' : 'dark'
      const map = getGlobalMapInstance()
      if (map) {
        try {
          map.setStyle(STYLE_URL[next])
          map.once('style.load', () => {
            reapplyMapVisualLayers(map, getMapReadOnlySession())
          })
        } catch {
          /* */
        }
      }
      return next
    })
  }

  return (
    <div data-zoom-controls className={className} style={zoomControlsWrapStyle}>
      <button type="button" aria-label="Acercar" style={btnStyle} onClick={onZoomIn}>
        <IconPlus size={20} />
      </button>
      <button type="button" aria-label="Alejar" style={btnStyle} onClick={onZoomOut}>
        <IconMinus size={20} />
      </button>
      <button type="button" aria-label="Ubicación" style={btnStyle} onClick={onLocate}>
        {locationIcon}
      </button>
      <button
        type="button"
        aria-label={`Capas del mapa (${mapStyle})`}
        style={btnStyle}
        onClick={onLayers}
      >
        <IconLayers size={20} />
      </button>
    </div>
  )
}
