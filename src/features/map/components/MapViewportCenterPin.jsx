import CenterPin from '../../home/components/CenterPin'

/**
 * Pin con palito/bola centrado en el viewport del mapa; el borde inferior del palito marca el punto GPS.
 * Overlay React (no Marker Mapbox).
 */
export default function MapViewportCenterPin() {
  return (
    <div
      data-map-viewport-pin
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -100%)',
        zIndex: 6,
        pointerEvents: 'none',
      }}
    >
      <CenterPin />
    </div>
  )
}
