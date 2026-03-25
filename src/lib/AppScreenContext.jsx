import { createContext, useContext, useMemo, useState } from 'react'

const AppScreenContext = createContext(null)

export function AppScreenProvider({ children }) {
  const [screen, setScreen] = useState('home')

  const value = useMemo(
    () => ({
      screen,
      openProfile: () => setScreen('profile'),
      openHome: () => setScreen('home'),
    }),
    [screen]
  )

  return <AppScreenContext.Provider value={value}>{children}</AppScreenContext.Provider>
}

export function useAppScreen() {
  return useContext(AppScreenContext)
}
