import { lazy, Suspense } from 'react'
import { useAppScreen } from '../../lib/AppScreenContext'
import { loadMapModule } from '../map/mapInstance.js'
import ScreenShell from '../../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../../ui/layout/layout'
import { colors } from '../../design/colors'
import { APP_SCREEN_PARK_HERE } from '../../lib/appScreenState.js'
import { useSimulatedParkingUsers } from '../map/useSimulatedParkingUsers'
import SearchParkingOverlay from './components/SearchParkingOverlay.jsx'

const Map = lazy(loadMapModule)

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
const fallback = {
  width: '100%',
  height: '100%',
  flex: 1,
  minHeight: 0,
  backgroundColor: colors.background,
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
        <Suspense fallback={<div style={fallback} />}>
          <div style={mapPageMapSlotStyle}>
            <Map
              readOnly={false}
              mapFocusGeneration={mapFocusGeneration}
              parkingBandPinAdjust
              parkingPinMode={mode}
              followUserGps={mode === 'parked'}
            />
          </div>
        </Suspense>
        <SearchParkingOverlay mode={mode} allUsers={users} />
      </div>
    </ScreenShell>
  )
}
