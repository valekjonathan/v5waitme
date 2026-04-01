import { lazy, Suspense } from 'react'
import { useAppScreen } from '../../lib/AppScreenContext'
import ScreenShell from '../../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../../ui/layout/layout'
import { colors } from '../../design/colors'
import SimulatedCarsOnMap from '../map/components/SimulatedCarsOnMap'
import { useClosestSimulatedUser, useSimulatedParkingUsers } from '../map/useSimulatedParkingUsers'
import SearchParkingOverlay from './components/SearchParkingOverlay.jsx'

const Map = lazy(() => import('../map/components/Map.jsx'))

const fallback = {
  width: '100%',
  height: '100%',
  backgroundColor: colors.background,
}

export default function SearchParkingPage() {
  const { mapFocusGeneration } = useAppScreen()
  const users = useSimulatedParkingUsers()
  const closestUser = useClosestSimulatedUser(users)

  return (
    <ScreenShell interactive mainMode={SCREEN_SHELL_MAIN_MODE.FULL_BLEED} mainOverflow="hidden">
      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          width: '100%',
        }}
      >
        <Suspense fallback={<div style={fallback} />}>
          <Map readOnly={false} mapFocusGeneration={mapFocusGeneration} />
        </Suspense>
        <SimulatedCarsOnMap enabled users={users} />
        <SearchParkingOverlay highlightUser={closestUser} allUsers={users} />
      </div>
    </ScreenShell>
  )
}
