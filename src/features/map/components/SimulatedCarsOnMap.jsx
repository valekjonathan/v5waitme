import mapboxgl from 'mapbox-gl'
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { getGlobalMapInstance } from '../mapInstance.js'
import CarIconHome from '../../../ui/icons/CarIconHome'

function CarMarkerContent({ priceEUR }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: '#fff',
          textShadow: '0 1px 3px rgba(0,0,0,0.85)',
          marginBottom: 1,
          letterSpacing: 0.2,
        }}
      >
        {priceEUR}€
      </div>
      <div style={{ transform: 'scale(0.45)', transformOrigin: 'center bottom' }}>
        <CarIconHome />
      </div>
    </div>
  )
}

/**
 * Coches simulados como HTML Markers (mismo icono visual que Home/CTA, escalado).
 */
export default function SimulatedCarsOnMap({ enabled, users }) {
  useEffect(() => {
    if (!enabled || !users?.length) {
      return undefined
    }

    let cleared = false
    const entries = []
    let styleMap = null

    const destroyAll = () => {
      entries.forEach(({ marker, root }) => {
        try {
          root.unmount()
        } catch {
          /* */
        }
        try {
          marker.remove()
        } catch {
          /* */
        }
      })
      entries.length = 0
    }

    const rebuild = () => {
      if (cleared) return
      const map = getGlobalMapInstance()
      if (!map?.isStyleLoaded?.()) return
      destroyAll()
      for (const u of users) {
        const el = document.createElement('div')
        el.setAttribute('data-sim-car', u.id)
        const root = createRoot(el)
        root.render(<CarMarkerContent priceEUR={u.priceEUR} />)
        try {
          const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([u.lng, u.lat])
            .addTo(map)
          entries.push({ marker, root })
        } catch {
          try {
            root.unmount()
          } catch {
            /* */
          }
        }
      }
    }

    const onStyle = () => rebuild()

    const poll = window.setInterval(() => {
      const map = getGlobalMapInstance()
      if (map?.isStyleLoaded?.()) {
        if (styleMap !== map) {
          if (styleMap) {
            try {
              styleMap.off('style.load', onStyle)
            } catch {
              /* */
            }
          }
          styleMap = map
          map.on('style.load', onStyle)
        }
        rebuild()
        window.clearInterval(poll)
      }
    }, 80)

    return () => {
      cleared = true
      window.clearInterval(poll)
      if (styleMap) {
        try {
          styleMap.off('style.load', onStyle)
        } catch {
          /* */
        }
      }
      destroyAll()
    }
  }, [enabled, users])

  return null
}
