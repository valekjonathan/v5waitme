import { forwardRef } from 'react'
import CenterPin from '../../home/components/CenterPin'

/**
 * Pin con palito/bola: overlay React (no Marker Mapbox).
 * Parked / Home: `parkingPinTopPx` = hueco buscador–tarjeta.
 * Búsqueda parking: `pinPixel` = `map.project` del GPS real (mapa libre; el pin puede salir de pantalla).
 */
/** Mismo criterio que `MapZoomControls.jsx` `btnStyle`: borde morado, radio 12, blur. */
const tuLabelStyle = {
  marginBottom: 5,
  boxSizing: 'border-box',
  minHeight: 26,
  padding: '2px 8px',
  borderRadius: 9,
  border: '1px solid rgba(168, 85, 247, 0.5)',
  background: 'rgba(15, 23, 42, 0.9)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  color: '#FFFFFF',
  fontSize: 10,
  fontWeight: 600,
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
  alignSelf: 'center',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const MapViewportCenterPin = forwardRef(function MapViewportCenterPin(
  { parkingPinTopPx, pinPixel, showTuLabel = false },
  ref
) {
  const gap = typeof parkingPinTopPx === 'number' && Number.isFinite(parkingPinTopPx)
  const useProjected =
    pinPixel != null && Number.isFinite(pinPixel.x) && Number.isFinite(pinPixel.y)
  const showTu = gap || useProjected || showTuLabel
  return (
    <div
      ref={ref}
      data-map-viewport-pin
      data-waitme-parking-pin-gap={gap ? 'true' : undefined}
      data-waitme-parking-pin-projected={useProjected ? 'true' : undefined}
      style={{
        position: 'absolute',
        ...(useProjected
          ? {
              left: pinPixel.x,
              top: pinPixel.y,
              transform: 'translate(-50%, -100%)',
            }
          : {
              left: '50%',
              top: gap ? `${parkingPinTopPx}px` : 'calc(50% + 50px)',
              transform: 'translate(-50%, -100%)',
            }),
        zIndex: 5,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {showTu ? (
        <span style={tuLabelStyle} aria-hidden>
          Tú
        </span>
      ) : null}
      <CenterPin />
    </div>
  )
})

export default MapViewportCenterPin
