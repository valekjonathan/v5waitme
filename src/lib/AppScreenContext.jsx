import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react'
import { useAuth } from './AuthContext'
import { isRealSupabaseAuthUid } from '../services/authUid.js'
import { isSupabaseConfigured } from '../services/supabase.js'
import { listDmThreadsForUser } from '../services/waitmeChats.js'
import { stashPendingDmPeerUserId } from './waitmeDmPending.js'
import { APP_SCREEN_HOME, reduceAppScreen } from './appScreenState.js'

const AppScreenContext = createContext(null)

export function AppScreenProvider({ children }) {
  const { user } = useAuth()
  const [screen, dispatch] = useReducer(reduceAppScreen, APP_SCREEN_HOME)
  const [mapFocusGeneration, setMapFocusGeneration] = useState(0)
  const [chatsListResetGeneration, setChatsListResetGeneration] = useState(0)
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

  /** Badge global: hidratar no leídos al iniciar sesión / refrescar usuario sin depender de montar ChatsPage. */
  useEffect(() => {
    let cancelled = false
    const uid = String(user?.id ?? '')
    const dev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
    const canLoad = Boolean(dev || (isSupabaseConfigured() && isRealSupabaseAuthUid(uid)))

    if (!uid) {
      setChatUnreadByThread({})
      return undefined
    }
    if (!canLoad) {
      return undefined
    }

    void (async () => {
      const { data, error } = await listDmThreadsForUser(uid)
      if (cancelled) return
      if (error || !Array.isArray(data)) return
      syncChatUnreadFromThreads(data)
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id, syncChatUnreadFromThreads])

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

  /** Siempre abre chats y fuerza volver a lista (sin toggles). */
  const openChatsRoot = useCallback(() => {
    dispatch({ type: 'openChats' })
    setChatsListResetGeneration((g) => g + 1)
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
      openChatsRoot,
      openChatsWithPeer,
      mapFocusGeneration,
      chatsListResetGeneration,
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
      openChatsRoot,
      openChatsWithPeer,
      mapFocusGeneration,
      chatsListResetGeneration,
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
