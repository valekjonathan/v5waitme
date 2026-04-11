import Map from './Map.jsx'
import SimulatedCarsOnMap from './SimulatedCarsOnMap.jsx'
import SearchParkingOverlay from '../../parking/components/SearchParkingOverlay.jsx'
import HomePage from '../../home/components/HomePage.jsx'
import MainLayout, {
  mainLayoutMapBackgroundStyle,
  mainLayoutRootStyle,
} from '../../shared/components/MainLayout.jsx'
import { useNativeDebugMount } from '../../../debug/nativeRuntimeDebugMounts.js'
import { useSimulatedParkingUsers } from '../useSimulatedParkingUsers'
import { useAppScreen } from '../../../lib/AppScreenContext'
import { useMapForeground } from '../../../lib/MapForegroundContext.jsx'

function NativeDebugMap(/** @type {Record<string, unknown>} */ props) {
  useNativeDebugMount('Map')
  return <Map {...props} />
}

const mapSlotStyle = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  minWidth: 0,
}

/**
 * Mapa autenticado: en `home`, `MainLayout` → `MainLayoutChrome` → `HomePage`; en search/park, mapa + overlay sin `HomePage`.
 */
export default function AuthenticatedMapScreen() {
  const { mapMode } = useAppScreen()
  const mapForeground = useMapForeground()
  const isHome = mapMode === 'home'
  const parkingUiMode = mapMode === 'parkHere' ? 'parked' : 'search'
  const users = useSimulatedParkingUsers(!mapForeground)

  const mapProps = isHome
    ? { readOnly: true, hideViewportCenterPin: true, followUserGps: true, mapForeground }
    : {
        readOnly: false,
        parkingBandPinAdjust: true,
        parkingPinMode: parkingUiMode,
        followUserGps: parkingUiMode === 'parked',
        mapForeground,
      }

  if (isHome) {
    return (
      <MainLayout
        mapBackgroundExtraStyle={{ pointerEvents: 'none' }}
        mapLayer={
          <div style={mapSlotStyle} data-waitme-map-slot>
            <NativeDebugMap {...mapProps} />
            <SimulatedCarsOnMap enabled={mapForeground} users={users} />
          </div>
        }
      >
        <HomePage />
      </MainLayout>
    )
  }

  return (
    <div style={mainLayoutRootStyle}>
      <div style={{ ...mainLayoutMapBackgroundStyle, pointerEvents: 'auto' }} aria-label="Capa de mapa">
        <div style={mapSlotStyle} data-waitme-map-slot>
          <NativeDebugMap {...mapProps} />
          <SearchParkingOverlay mode={parkingUiMode} allUsers={users} />
        </div>
      </div>
    </div>
  )
}
