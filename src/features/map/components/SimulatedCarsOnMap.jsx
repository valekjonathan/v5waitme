import mapboxgl from 'mapbox-gl'
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { VehicleIcon } from '../../profile/components/VehicleIcons.jsx'
import { getCarFill, normalizeVehicleTypeForMapIcon } from '../../parking/waitme/carUtils.js'
import { getGlobalMapInstance } from '../mapInstance.js'

function CarMarkerContent({ priceEUR, vehicleType, colorName, selected, onPick }) {
  const fill = getCarFill(colorName)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onPick?.()
      }}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        boxSizing: 'border-box',
        padding: 4,
        margin: 0,
        border: '2px solid',
        borderColor: selected ? 'rgba(168, 85, 247, 0.6)' : 'transparent',
        background: selected ? 'rgba(17, 24, 39, 0.85)' : 'transparent',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        borderRadius: 12,
        transition: 'background 180ms ease, border-color 180ms ease, border-width 180ms ease',
      }}
      aria-label="Ver plaza en tarjeta"
    >
      <div
        style={{
          position: 'relative',
          width: 64,
          height: 40,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <VehicleIcon
          type={normalizeVehicleTypeForMapIcon(vehicleType)}
          color={fill}
          size="header"
        />
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: '56%',
            transform: 'translate(-50%, -50%)',
            fontSize: 8,
            fontWeight: 800,
            color: '#f5f3ff',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            textShadow: '0 0 2px rgba(0, 0, 0, 1), 0 1px 3px rgba(0, 0, 0, 0.95)',
            pointerEvents: 'none',
            maxWidth: 52,
            textAlign: 'center',
          }}
        >
          {priceEUR} €
        </span>
      </div>
    </button>
  )
}

/**
 * Coches simulados como HTML Markers (`VehicleIcon` como tarjeta; precio entre ruedas, dentro del icono).
 */
export default function SimulatedCarsOnMap({ enabled, users, onSelectUser, highlightUserId }) {
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
        const selected = highlightUserId != null && u.id === highlightUserId
        root.render(
          <CarMarkerContent
            priceEUR={u.priceEUR}
            vehicleType={u.vehicleType}
            colorName={u.colorName}
            selected={selected}
            onPick={() => onSelectUser?.(u.id)}
          />
        )
        try {
          const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
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

    let poll = null
    const tryAttach = () => {
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
        if (poll != null) {
          window.clearInterval(poll)
          poll = null
        }
        return true
      }
      return false
    }

    if (!tryAttach()) {
      poll = window.setInterval(() => {
        if (tryAttach() && poll != null) {
          window.clearInterval(poll)
          poll = null
        }
      }, 80)
    }

    return () => {
      cleared = true
      if (poll != null) window.clearInterval(poll)
      if (styleMap) {
        try {
          styleMap.off('style.load', onStyle)
        } catch {
          /* */
        }
      }
      destroyAll()
    }
  }, [enabled, users, onSelectUser, highlightUserId])

  return null
}
