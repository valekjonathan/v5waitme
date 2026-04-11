import { createContext, useContext, useMemo } from 'react'
import { NavigationProvider, useNavigation } from '../context/navigation/NavigationContext.jsx'
import { WaitMeProvider, useWaitMe } from '../context/waitme/WaitMeContext.jsx'

const AppScreenContext = createContext(null)

function AppScreenComposer({ children }) {
  const navigation = useNavigation()
  const waitme = useWaitMe()
  const value = useMemo(
    () => ({
      ...navigation,
      ...waitme,
    }),
    [navigation, waitme]
  )
  return <AppScreenContext.Provider value={value}>{children}</AppScreenContext.Provider>
}

export function AppScreenProvider({ children }) {
  return (
    <NavigationProvider>
      <WaitMeProvider>
        <AppScreenComposer>{children}</AppScreenComposer>
      </WaitMeProvider>
    </NavigationProvider>
  )
}

export function useAppScreen() {
  return useContext(AppScreenContext)
}
