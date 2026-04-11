import Map from './Map.jsx'
import SimulatedCarsOnMap from './SimulatedCarsOnMap.jsx'
import SearchParkingOverlay from '../../parking/components/SearchParkingOverlay.jsx'
import HomePage from '../../home/components/HomePage.jsx'
import MainLayout from '../../shared/components/MainLayout.jsx'
import { useNativeDebugMount } from '../../../debug/nativeRuntimeDebugMounts.js'
import { useSimulatedParkingUsers } from '../useSimulatedParkingUsers'
import { useAppScreen } from '../../../lib/AppScreenContext'
import { useMapForeground } from '../../../lib/MapForegroundContext.jsx'

function NativeDebugMap(/** @type {Record<string, unknown>} */ props) {
  useNativeDebugMount('Map')
  return <Map {...props} />
}

/** Rellena la capa mapa (`MainLayout`: fondo absolute); `inset:0` evita altura % / slot colapsado. */
const mapSlotStyle = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  minWidth: 0,
}

/**
 * Mapa autenticado: siempre `MainLayout` → `MainLayoutChrome` → `HomePage` (mapa vía `mapLayer`).
 * Así `HomePage` monta en MAP aunque `mapMode` sea search/park (antes la rama sin MainLayout dejaba HomePage=false).
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

  const mapLayer = (
    <div style={mapSlotStyle} data-waitme-map-slot>
      <NativeDebugMap {...mapProps} />
      {isHome ? (
        <SimulatedCarsOnMap enabled={mapForeground} users={users} />
      ) : (
        <SearchParkingOverlay mode={parkingUiMode} allUsers={users} />
      )}
    </div>
  )

  return (
    <MainLayout
      mapBackgroundExtraStyle={isHome ? { pointerEvents: 'none' } : { pointerEvents: 'auto' }}
      mapLayer={mapLayer}
    >
      <HomePage />
    </MainLayout>
  )
}
