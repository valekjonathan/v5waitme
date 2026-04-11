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

function NativeDebugHomePage() {
  useNativeDebugMount('HomePage')
  return <HomePage />
}

function NativeDebugMap(/** @type {Record<string, unknown>} */ props) {
  useNativeDebugMount('Map')
  return <Map {...props} />
}

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
 * Modo `home`: mismo árbol que login — `MainLayout` → `MainLayoutChrome` → `HomePage` (mapa vía `mapLayer`).
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
          <div style={homeMapSlotStyle} data-waitme-map-slot>
            <NativeDebugMap {...mapProps} />
            <SimulatedCarsOnMap enabled={mapForeground} users={users} />
          </div>
        }
      >
        <NativeDebugHomePage />
      </MainLayout>
    )
  }

  return (
    <div style={mainLayoutRootStyle}>
      <div style={{ ...mainLayoutMapBackgroundStyle, pointerEvents: 'auto' }} aria-label="Capa de mapa">
        <div style={mapPageMapSlotStyle} data-waitme-map-slot>
          <NativeDebugMap {...mapProps} />
          <SearchParkingOverlay mode={parkingUiMode} allUsers={users} />
        </div>
      </div>
    </div>
  )
}
