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
import { APP_SCREEN_HOME, reduceAppScreen } from './appScreenState.js'

const AppScreenContext = createContext(null)

export function AppScreenProvider({ children }) {
  const { user } = useAuth()
  const [screen, dispatch] = useReducer(reduceAppScreen, APP_SCREEN_HOME)
  const [viewingUserReviewsId, setViewingUserReviewsId] = useState(/** @type {string | null} */ (null))
  const [mapFocusGeneration, setMapFocusGeneration] = useState(0)
  const [chatsListResetGeneration, setChatsListResetGeneration] = useState(0)
  /** Snapshot visual desde tarjeta (mapa) para abrir DM sin flash de lista ni header vacío. */
  const [pendingDmVisual, setPendingDmVisual] = useState(
    /** @type {null | { peerId: string, displayName: string, userName: string, userPhoto: string | null, phone: string | null, allowPhoneCalls: boolean }} */ (
      null
    )
  )
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
      if (t.threadId == null || t.threadId === '') continue
      const threadKey = String(t.threadId)
      next[threadKey] = Math.max(0, Number(t.unreadCount ?? 0))
    }
    setChatUnreadByThread(next)
  }, [])

  const clearChatThreadUnread = useCallback((tid) => {
    if (tid == null || tid === '') return
    const id = String(tid)
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

  const clearUserReviewsNav = useCallback(() => {
    setViewingUserReviewsId(null)
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#/user/')) {
      const { pathname, search } = window.location
      window.history.replaceState(null, '', pathname + search)
    }
  }, [])

  const mapFocusActions = useMemo(() => {
    const go = (type) => () => {
      clearUserReviewsNav()
      dispatch({ type })
      setMapFocusGeneration((g) => g + 1)
    }
    return {
      openHome: go('openHome'),
      openSearchParking: go('openSearchParking'),
      openParkHere: go('openParkHere'),
    }
  }, [clearUserReviewsNav])

  const { openHome, openSearchParking, openParkHere } = mapFocusActions

  /** Acciones que solo despachan un tipo (evita bloques duplicados en quality-gate). */
  const simpleScreenActions = useMemo(
    () => ({
      openAlerts: () => {
        clearUserReviewsNav()
        dispatch({ type: 'openAlerts' })
      },
      openChats: () => {
        clearUserReviewsNav()
        dispatch({ type: 'openChats' })
      },
      openProfile: () => {
        clearUserReviewsNav()
        dispatch({ type: 'openProfile' })
      },
      openReviews: () => {
        clearUserReviewsNav()
        dispatch({ type: 'openReviews' })
      },
    }),
    [clearUserReviewsNav]
  )

  const { openAlerts, openChats, openProfile, openReviews } = simpleScreenActions

  const openUserReviews = useCallback((userId) => {
    const id = String(userId ?? '').trim()
    if (!id) return
    setViewingUserReviewsId(id)
    dispatch({ type: 'openUserReviews' })
    const next = `#/user/${encodeURIComponent(id)}`
    if (typeof window !== 'undefined' && window.location.hash !== next) {
      window.location.hash = next
    }
  }, [])

  useEffect(() => {
    const onHash = () => {
      const m = window.location.hash.match(/^#\/user\/([^/?#]+)/)
      if (!m) return
      const id = decodeURIComponent(m[1])
      setViewingUserReviewsId(id)
      dispatch({ type: 'openUserReviews' })
    }
    onHash()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  /** Siempre abre chats y fuerza volver a lista (sin toggles). */
  const openChatsRoot = useCallback(() => {
    clearUserReviewsNav()
    setPendingDmVisual(null)
    dispatch({ type: 'openChats' })
    setChatsListResetGeneration((g) => g + 1)
  }, [clearUserReviewsNav])

  const clearPendingDmVisual = useCallback(() => {
    setPendingDmVisual(null)
  }, [])

  /**
   * @param {string} peerUserId
   * @param {null | { displayName?: string, user_name?: string, userPhoto?: string | null, user_photo?: string | null, phone?: string | null, allow_phone_calls?: boolean }} [fromCard]
   */
  const openChatsWithPeer = useCallback(
    (peerUserId, fromCard = null) => {
      clearUserReviewsNav()
      const id = String(peerUserId ?? '')
      if (!id) return
      if (fromCard && typeof fromCard === 'object') {
        const dn = String(fromCard.displayName ?? fromCard.user_name ?? '').trim()
        const photo = fromCard.userPhoto ?? fromCard.user_photo ?? null
        const ph = fromCard.phone != null ? String(fromCard.phone).trim() : null
        setPendingDmVisual({
          peerId: id,
          displayName: dn,
          userName: dn,
          userPhoto: typeof photo === 'string' && photo.trim() ? photo.trim() : null,
          phone: ph && ph.length > 0 ? ph : null,
          allowPhoneCalls: fromCard.allow_phone_calls !== false,
        })
      } else {
        setPendingDmVisual(null)
      }
      const next = `#/chat/${encodeURIComponent(id)}`
      if (typeof window !== 'undefined' && window.location.hash !== next) {
        window.location.hash = next
      }
      dispatch({ type: 'openChats' })
    },
    [clearUserReviewsNav]
  )

  useEffect(() => {
    const syncChatHash = () => {
      const m = typeof window !== 'undefined' && window.location.hash.match(/^#\/chat\/([^/?#]+)/)
      if (m) {
        clearUserReviewsNav()
        dispatch({ type: 'openChats' })
      }
    }
    syncChatHash()
    window.addEventListener('hashchange', syncChatHash)
    return () => window.removeEventListener('hashchange', syncChatHash)
  }, [clearUserReviewsNav])

  const value = useMemo(
    () => ({
      screen,
      viewingUserReviewsId,
      openProfile,
      openReviews,
      openUserReviews,
      openHome,
      openSearchParking,
      openParkHere,
      openAlerts,
      openChats,
      openChatsRoot,
      openChatsWithPeer,
      pendingDmVisual,
      clearPendingDmVisual,
      mapFocusGeneration,
      chatsListResetGeneration,
      chatUnreadByThread,
      chatUnreadTotal,
      syncChatUnreadFromThreads,
      clearChatThreadUnread,
    }),
    // Una línea: evita bloque duplicado vs el objeto (quality-gate DUPLICATE_BLOCK_SAME_FILE).
    [
      screen, viewingUserReviewsId, openProfile, openReviews, openUserReviews, openHome, openSearchParking, openParkHere, openAlerts, openChats, openChatsRoot, openChatsWithPeer, pendingDmVisual, clearPendingDmVisual, mapFocusGeneration, chatsListResetGeneration, chatUnreadByThread, chatUnreadTotal, syncChatUnreadFromThreads, clearChatThreadUnread,
    ]
  )

  return <AppScreenContext.Provider value={value}>{children}</AppScreenContext.Provider>
}

export function useAppScreen() {
  return useContext(AppScreenContext)
}
