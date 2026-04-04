import { useAppScreen } from '../../lib/AppScreenContext'
import Map from '../map/components/Map.jsx'
import ScreenShell from '../../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../../ui/layout/layout'
import { APP_SCREEN_PARK_HERE } from '../../lib/appScreenState.js'
import { useSimulatedParkingUsers } from '../map/useSimulatedParkingUsers'
import SearchParkingOverlay from './components/SearchParkingOverlay.jsx'

const mapPageShellStyle = {
  position: 'relative',
  flex: 1,
  minHeight: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
}
const mapPageMapSlotStyle = {
  flex: 1,
  minHeight: 0,
  height: '100%',
  width: '100%',
  position: 'relative',
}
/**
 * Una sola pantalla de mapa para búsqueda y “aparcado”: el <Map /> no se desmonta al cambiar de modo.
 */
export default function MapParkingPage() {
  const { screen, mapFocusGeneration } = useAppScreen()
  const mode = screen === APP_SCREEN_PARK_HERE ? 'parked' : 'search'
  const users = useSimulatedParkingUsers()

  return (
    <ScreenShell
      interactive
      mainMode={SCREEN_SHELL_MAIN_MODE.FULL_BLEED}
      mainOverflow="hidden"
      fullBleedMainOverflow="visible"
    >
      <div style={mapPageShellStyle}>
        <div style={mapPageMapSlotStyle} data-waitme-map-slot>
          <Map
            readOnly={false}
            mapFocusGeneration={mapFocusGeneration}
            parkingBandPinAdjust
            parkingPinMode={mode}
            followUserGps={mode === 'parked'}
          />
          <SearchParkingOverlay mode={mode} allUsers={users} />
        </div>
      </div>
    </ScreenShell>
  )
}
