import { AppScreenProvider, useAppScreen } from '../lib/AppScreenContext'
import HomePage from '../features/home/components/HomePage'
import ProfilePage from '../features/profile/components/ProfilePage'
import IphoneFrame from '../ui/IphoneFrame'

function RouterShell() {
  const { screen } = useAppScreen()
  return <IphoneFrame>{screen === 'profile' ? <ProfilePage /> : <HomePage />}</IphoneFrame>
}

export default function App() {
  return (
    <AppScreenProvider>
      <RouterShell />
    </AppScreenProvider>
  )
}
