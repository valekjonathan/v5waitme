import { createContext, useCallback, useContext, useMemo, useReducer, useState } from 'react'
import { APP_SCREEN_HOME, reduceAppScreen } from './appScreenState.js'

const AppScreenContext = createContext(null)

export function AppScreenProvider({ children }) {
  const [screen, dispatch] = useReducer(reduceAppScreen, APP_SCREEN_HOME)
  const [mapFocusGeneration, setMapFocusGeneration] = useState(0)

  const openHome = useCallback(() => {
    dispatch({ type: 'openHome' })
    setMapFocusGeneration((g) => g + 1)
  }, [])

  const value = useMemo(
    () => ({
      screen,
      openProfile: () => dispatch({ type: 'openProfile' }),
      openReviews: () => dispatch({ type: 'openReviews' }),
      openHome,
      mapFocusGeneration,
    }),
    [screen, openHome, mapFocusGeneration]
  )

  return <AppScreenContext.Provider value={value}>{children}</AppScreenContext.Provider>
}

export function useAppScreen() {
  return useContext(AppScreenContext)
}
