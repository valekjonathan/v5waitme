import { createContext, useContext, useMemo, useReducer } from 'react'
import { APP_SCREEN_HOME, reduceAppScreen } from './appScreenState.js'

const AppScreenContext = createContext(null)

export function AppScreenProvider({ children }) {
  const [screen, dispatch] = useReducer(reduceAppScreen, APP_SCREEN_HOME)

  const value = useMemo(
    () => ({
      screen,
      openProfile: () => dispatch({ type: 'openProfile' }),
      openHome: () => dispatch({ type: 'openHome' }),
    }),
    [screen]
  )

  return <AppScreenContext.Provider value={value}>{children}</AppScreenContext.Provider>
}

export function useAppScreen() {
  return useContext(AppScreenContext)
}
