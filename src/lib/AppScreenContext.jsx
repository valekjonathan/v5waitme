import { createContext, useCallback, useContext, useMemo, useReducer, useState } from 'react'
import { isRealSupabaseAuthUid } from '../services/authUid.js'
import { stashPendingDmPeerUserId } from './waitmeDmPending.js'
import { APP_SCREEN_HOME, reduceAppScreen } from './appScreenState.js'

const AppScreenContext = createContext(null)

export function AppScreenProvider({ children }) {
  const [screen, dispatch] = useReducer(reduceAppScreen, APP_SCREEN_HOME)
  const [mapFocusGeneration, setMapFocusGeneration] = useState(0)

  const openHome = useCallback(() => {
    dispatch({ type: 'openHome' })
    setMapFocusGeneration((g) => g + 1)
  }, [])

  const openSearchParking = useCallback(() => {
    dispatch({ type: 'openSearchParking' })
    setMapFocusGeneration((g) => g + 1)
  }, [])

  const openParkHere = useCallback(() => {
    dispatch({ type: 'openParkHere' })
    setMapFocusGeneration((g) => g + 1)
  }, [])

  const openAlerts = useCallback(() => {
    dispatch({ type: 'openAlerts' })
  }, [])

  const openChats = useCallback(() => {
    dispatch({ type: 'openChats' })
  }, [])

  const openChatsWithPeer = useCallback((peerUserId) => {
    const id = String(peerUserId ?? '')
    if (isRealSupabaseAuthUid(id)) stashPendingDmPeerUserId(id)
    dispatch({ type: 'openChats' })
  }, [])

  const value = useMemo(
    () => ({
      screen,
      openProfile: () => dispatch({ type: 'openProfile' }),
      openReviews: () => dispatch({ type: 'openReviews' }),
      openHome,
      openSearchParking,
      openParkHere,
      openAlerts,
      openChats,
      openChatsWithPeer,
      mapFocusGeneration,
    }),
    [
      screen,
      openHome,
      openSearchParking,
      openParkHere,
      openAlerts,
      openChats,
      openChatsWithPeer,
      mapFocusGeneration,
    ]
  )

  return <AppScreenContext.Provider value={value}>{children}</AppScreenContext.Provider>
}

export function useAppScreen() {
  return useContext(AppScreenContext)
}
