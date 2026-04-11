import Map from './Map.jsx'
import SimulatedCarsOnMap from './SimulatedCarsOnMap.jsx'

/**
 * Mapa hero (login/home): un solo import dinámico para Map + coches simulados + mapbox-gl.
 */
export default function MainLayoutMapStack({ simulatedUsers }) {
  return (
    <>
      <Map readOnly hideViewportCenterPin />
      <SimulatedCarsOnMap enabled users={simulatedUsers} />
    </>
  )
}
