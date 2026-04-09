import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useState,
} from 'react'
import { isRealSupabaseAuthUid } from '../services/authUid.js'
import { stashPendingDmPeerUserId } from './waitmeDmPending.js'
import { APP_SCREEN_HOME, reduceAppScreen } from './appScreenState.js'

const AppScreenContext = createContext(null)

export function AppScreenProvider({ children }) {
  const [screen, dispatch] = useReducer(reduceAppScreen, APP_SCREEN_HOME)
  const [mapFocusGeneration, setMapFocusGeneration] = useState(0)
  const [chatUnreadByThread, setChatUnreadByThread] = useState(
    /** @type {Record<string, number>} */ ({})
  )

  const chatUnreadTotal = useMemo(
    () =>
      Object.values(chatUnreadByThread).reduce(
        (sum, n) => sum + Math.max(0, Number(n) || 0),
        0
      ),
    [chatUnreadByThread]
  )

  const syncChatUnreadFromThreads = useCallback((list) => {
    const next = /** @type {Record<string, number>} */ ({})
    for (const t of Array.isArray(list) ? list : []) {
      if (!t || typeof t !== 'object') continue
      const id = String(t.id ?? '')
      if (!id) continue
      next[id] = Math.max(0, Number(t.unreadCount ?? 0))
    }
    setChatUnreadByThread(next)
  }, [])

  const clearChatThreadUnread = useCallback((threadId) => {
    const id = String(threadId ?? '')
    if (!id) return
    setChatUnreadByThread((prev) => ({ ...prev, [id]: 0 }))
  }, [])

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
      chatUnreadByThread,
      chatUnreadTotal,
      syncChatUnreadFromThreads,
      clearChatThreadUnread,
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
      chatUnreadByThread,
      chatUnreadTotal,
      syncChatUnreadFromThreads,
      clearChatThreadUnread,
    ]
  )

  return <AppScreenContext.Provider value={value}>{children}</AppScreenContext.Provider>
}

export function useAppScreen() {
  return useContext(AppScreenContext)
}
