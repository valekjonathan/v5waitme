import Map from './Map.jsx'
import SimulatedCarsOnMap from './SimulatedCarsOnMap.jsx'
import SearchParkingOverlay from '../../parking/components/SearchParkingOverlay.jsx'
import HomePage from '../../home/components/HomePage.jsx'
import { useSimulatedParkingUsers } from '../useSimulatedParkingUsers'
import { useAppScreen } from '../../../lib/AppScreenContext'
import {
  MainLayoutChrome,
  mainLayoutMapLayerStyle,
  mainLayoutRootStyle,
} from '../../shared/components/MainLayout.jsx'

const mapPageMapSlotStyle = {
  flex: '1 1 0%',
  minHeight: 0,
  minWidth: 0,
  height: '100%',
  width: '100%',
  position: 'relative',
}

const homeMapSlotStyle = {
  position: 'relative',
  width: '100%',
  height: '100%',
  minHeight: 0,
  minWidth: 0,
}

/**
 * Mapa autenticado único: Home / búsqueda / aparcado sin desmontar `<Map>` (solo cambian props y overlays).
 */
export default function AuthenticatedMapScreen() {
  const { mapMode } = useAppScreen()
  const isHome = mapMode === 'home'
  const parkingUiMode = mapMode === 'parkHere' ? 'parked' : 'search'
  const users = useSimulatedParkingUsers()

  const mapProps = isHome
    ? { readOnly: true, hideViewportCenterPin: true, followUserGps: true }
    : {
        readOnly: false,
        parkingBandPinAdjust: true,
        parkingPinMode: parkingUiMode,
        followUserGps: parkingUiMode === 'parked',
      }

  return (
    <div style={mainLayoutRootStyle}>
      <div style={mainLayoutMapLayerStyle} aria-label="Capa de mapa">
        <div
          style={isHome ? homeMapSlotStyle : mapPageMapSlotStyle}
          data-waitme-map-slot
        >
          <Map {...mapProps} />
          {isHome ? <SimulatedCarsOnMap enabled users={users} /> : null}
          {!isHome ? (
            <SearchParkingOverlay mode={parkingUiMode} allUsers={users} />
          ) : null}
        </div>
      </div>
      {isHome ? (
        <MainLayoutChrome>
          <HomePage />
        </MainLayoutChrome>
      ) : null}
    </div>
  )
}
