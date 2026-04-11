import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAuth } from '../../lib/AuthContext'
import { isRealSupabaseAuthUid } from '../../services/authUid.js'
import { isSupabaseConfigured } from '../../services/supabase.js'
import { listDmThreadsForUser } from '../../services/waitmeChats.js'
import {
  ACTIVE_SCREEN_ALERTS,
  ACTIVE_SCREEN_CHATS,
  ACTIVE_SCREEN_MAP,
  ACTIVE_SCREEN_PROFILE,
  ACTIVE_SCREEN_RESERVATIONS,
  ACTIVE_SCREEN_REVIEWS,
  ACTIVE_SCREEN_THREAD,
} from '../../lib/appScreenState.js'

const NavigationContext = createContext(null)

export function NavigationProvider({ children }) {
  const { user } = useAuth()
  const [activeScreen, setActiveScreen] = useState(ACTIVE_SCREEN_MAP)
  const [mapMode, setMapMode] = useState(/** @type {'home' | 'search' | 'parkHere'} */ ('home'))
  const [activeThreadId, setActiveThreadId] = useState(/** @type {string | null} */ (null))
  const [activeThreadSummary, setActiveThreadSummary] = useState(/** @type {Record<string, unknown> | null} */ (null))
  const [viewingUserReviewsId, setViewingUserReviewsId] = useState(/** @type {string | null} */ (null))
  const [userReviewsPeerRow, setUserReviewsPeerRow] = useState(
    /** @type {Record<string, unknown> | null} */ (null)
  )
  const [mapFocusGeneration, setMapFocusGeneration] = useState(0)
  const [chatsListResetGeneration, setChatsListResetGeneration] = useState(0)
  const [pendingDmVisual, setPendingDmVisual] = useState(
    /** @type {null | { peerId: string, displayName: string, userName: string, userPhoto: string | null, phone: string | null, allowPhoneCalls: boolean }} */ (
      null
    )
  )
  const [chatUnreadByThread, setChatUnreadByThread] = useState(/** @type {Record<string, number>} */ ({}))
  /** Lista ya cargada en app para este usuario (evita refetch en ChatsPage). */
  const [chatThreadListFetchedForUserId, setChatThreadListFetchedForUserId] = useState(
    /** @type {string | null} */ (null)
  )
  /** Incrementa cuando la lista global se sincroniza (hidrata ChatsPage si montó con []). */
  const [chatThreadListEpoch, setChatThreadListEpoch] = useState(0)

  const chatThreadListRef = useRef(/** @type {unknown[]} */ ([]))
  const lastUidForChatThreadListRef = useRef(/** @type {string} */ (''))

  const syncChatThreadList = useCallback((list) => {
    chatThreadListRef.current = Array.isArray(list) ? list : []
  }, [])

  const getChatThreadListSnapshot = useCallback(() => {
    const cur = chatThreadListRef.current
    return Array.isArray(cur) ? [...cur] : []
  }, [])

  const clearThreadState = useCallback(() => {
    setActiveThreadId(null)
    setActiveThreadSummary(null)
  }, [])

  const clearReviewsNavState = useCallback(() => {
    setViewingUserReviewsId(null)
    setUserReviewsPeerRow(null)
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#/user/')) {
      const { pathname, search } = window.location
      window.history.replaceState(null, '', pathname + search)
    }
  }, [])

  const openMap = useCallback(() => {
    setActiveScreen(ACTIVE_SCREEN_MAP)
    setMapMode('home')
    clearThreadState()
    clearReviewsNavState()
  }, [clearThreadState, clearReviewsNavState])

  const mapFocusActions = useMemo(() => {
    const go = (mode) => () => {
      clearReviewsNavState()
      setActiveScreen(ACTIVE_SCREEN_MAP)
      setMapMode(mode)
      clearThreadState()
      setMapFocusGeneration((g) => g + 1)
    }
    return {
      openHome: go('home'),
      openSearchParking: go('search'),
      openParkHere: go('parkHere'),
    }
  }, [clearReviewsNavState, clearThreadState])

  const { openHome, openSearchParking, openParkHere } = mapFocusActions

  const openAlerts = useCallback(() => {
    clearReviewsNavState()
    setActiveScreen(ACTIVE_SCREEN_ALERTS)
    clearThreadState()
  }, [clearReviewsNavState, clearThreadState])

  const openReservations = useCallback(() => {
    clearReviewsNavState()
    setActiveScreen(ACTIVE_SCREEN_RESERVATIONS)
    clearThreadState()
  }, [clearReviewsNavState, clearThreadState])

  const openChats = useCallback(() => {
    clearReviewsNavState()
    setActiveScreen(ACTIVE_SCREEN_CHATS)
    clearThreadState()
  }, [clearReviewsNavState, clearThreadState])

  const openProfile = useCallback(() => {
    clearReviewsNavState()
    setActiveScreen(ACTIVE_SCREEN_PROFILE)
    clearThreadState()
  }, [clearReviewsNavState, clearThreadState])

  const openReviews = useCallback(() => {
    const uid = user?.id != null ? String(user.id) : ''
    if (!uid) return
    setUserReviewsPeerRow(null)
    clearThreadState()
    setViewingUserReviewsId(uid)
    setActiveScreen(ACTIVE_SCREEN_REVIEWS)
  }, [clearThreadState, user?.id])

  const openUserReviews = useCallback(
    (incomingUserId, peerRow) => {
      if (incomingUserId == null || incomingUserId === '') return
      const id = String(incomingUserId).trim()
      if (!id) return
      if (peerRow && typeof peerRow === 'object') {
        const pid = String(peerRow.peer_user_id ?? peerRow.id ?? '').trim()
        setUserReviewsPeerRow(pid === id ? /** @type {Record<string, unknown>} */ (peerRow) : null)
      } else {
        setUserReviewsPeerRow(null)
      }
      clearThreadState()
      setViewingUserReviewsId(id)
      setActiveScreen(ACTIVE_SCREEN_REVIEWS)
      const next = `#/user/${encodeURIComponent(id)}`
      if (typeof window !== 'undefined' && window.location.hash !== next) {
        window.location.hash = next
      }
    },
    [clearThreadState]
  )

  const closeThread = useCallback(() => {
    setActiveScreen(ACTIVE_SCREEN_CHATS)
    clearThreadState()
  }, [clearThreadState])

  const openThread = useCallback(
    (threadId, listSnapshot) => {
      if (threadId == null || threadId === '') return
      const rows = listSnapshot ?? chatThreadListRef.current
      const row = Array.isArray(rows)
        ? rows.find((t) => t && typeof t === 'object' && String(t.threadId) === String(threadId))
        : null
      if (!row || typeof row !== 'object') return
      clearReviewsNavState()
      setActiveThreadId(String(threadId))
      setActiveThreadSummary(row)
      setActiveScreen(ACTIVE_SCREEN_THREAD)
    },
    [clearReviewsNavState]
  )

  const openChatsRoot = useCallback(() => {
    clearReviewsNavState()
    setPendingDmVisual(null)
    clearThreadState()
    setActiveScreen(ACTIVE_SCREEN_CHATS)
    setChatsListResetGeneration((g) => g + 1)
  }, [clearReviewsNavState, clearThreadState])

  const clearPendingDmVisual = useCallback(() => {
    setPendingDmVisual(null)
  }, [])

  const openChatsWithPeer = useCallback(
    (peerUserId, fromCard = null) => {
      clearReviewsNavState()
      if (peerUserId == null || peerUserId === '') return
      const id = String(peerUserId)
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
      clearThreadState()
      setActiveScreen(ACTIVE_SCREEN_CHATS)
    },
    [clearReviewsNavState, clearThreadState]
  )

  useLayoutEffect(() => {
    const valid = new Set([
      ACTIVE_SCREEN_MAP,
      ACTIVE_SCREEN_ALERTS,
      ACTIVE_SCREEN_RESERVATIONS,
      ACTIVE_SCREEN_CHATS,
      ACTIVE_SCREEN_PROFILE,
      ACTIVE_SCREEN_REVIEWS,
      ACTIVE_SCREEN_THREAD,
    ])
    if (!valid.has(activeScreen)) {
      setActiveScreen(ACTIVE_SCREEN_MAP)
      return
    }
    if (activeScreen === ACTIVE_SCREEN_THREAD && (!activeThreadId || !activeThreadSummary)) {
      setActiveScreen(ACTIVE_SCREEN_CHATS)
      clearThreadState()
    }
    if (activeScreen === ACTIVE_SCREEN_REVIEWS && !viewingUserReviewsId) {
      setActiveScreen(ACTIVE_SCREEN_CHATS)
    }
  }, [activeScreen, activeThreadId, activeThreadSummary, viewingUserReviewsId, clearThreadState])

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

  useEffect(() => {
    let cancelled = false
    const uid = String(user?.id ?? '')
    const dev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
    const canLoad = Boolean(dev || (isSupabaseConfigured() && isRealSupabaseAuthUid(uid)))

    if (lastUidForChatThreadListRef.current !== uid) {
      lastUidForChatThreadListRef.current = uid
      if (!uid) {
        setChatUnreadByThread({})
        chatThreadListRef.current = []
        setChatThreadListFetchedForUserId(null)
        setChatThreadListEpoch(0)
        return undefined
      }
      chatThreadListRef.current = []
      setChatThreadListFetchedForUserId(null)
      setChatThreadListEpoch(0)
    }

    if (!uid) {
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
      syncChatThreadList(data)
      setChatThreadListFetchedForUserId(uid)
      setChatThreadListEpoch((e) => e + 1)
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id, syncChatUnreadFromThreads, syncChatThreadList])

  useEffect(() => {
    const onHash = () => {
      const hash = typeof window !== 'undefined' ? window.location.hash : ''
      const userM = hash.match(/^#\/user\/([^/?#]+)/)
      if (userM) {
        const id = decodeURIComponent(userM[1])
        setUserReviewsPeerRow(null)
        setViewingUserReviewsId(id)
        setActiveScreen(ACTIVE_SCREEN_REVIEWS)
        clearThreadState()
        return
      }
      const chatM = hash.match(/^#\/chat\/([^/?#]+)/)
      if (chatM) {
        clearReviewsNavState()
        clearThreadState()
        setActiveScreen(ACTIVE_SCREEN_CHATS)
      }
    }
    onHash()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [clearThreadState, clearReviewsNavState])

  const value = useMemo(
    () => ({
      /** @deprecated Usar activeScreen */
      screen: activeScreen,
      activeScreen,
      mapMode,
      activeThreadId,
      activeThreadSummary,
      viewingUserReviewsId,
      userReviewsPeerRow,
      openMap,
      openProfile,
      openReviews,
      openUserReviews,
      openHome,
      openSearchParking,
      openParkHere,
      openAlerts,
      openReservations,
      openChats,
      openChatsRoot,
      openChatsWithPeer,
      openThread,
      closeThread,
      syncChatThreadList,
      getChatThreadListSnapshot,
      chatThreadListFetchedForUserId,
      chatThreadListEpoch,
      pendingDmVisual,
      clearPendingDmVisual,
      mapFocusGeneration,
      chatsListResetGeneration,
      chatUnreadByThread,
      chatUnreadTotal,
      syncChatUnreadFromThreads,
      clearChatThreadUnread,
    }),
    [
      activeScreen,
      activeThreadId,
      activeThreadSummary,
      chatUnreadByThread,
      chatUnreadTotal,
      chatsListResetGeneration,
      clearChatThreadUnread,
      clearPendingDmVisual,
      closeThread,
      mapFocusGeneration,
      mapMode,
      openAlerts,
      openReservations,
      openChats,
      openChatsRoot,
      openChatsWithPeer,
      openHome,
      openMap,
      openParkHere,
      openProfile,
      openReviews,
      openSearchParking,
      openThread,
      openUserReviews,
      pendingDmVisual,
      syncChatThreadList,
      getChatThreadListSnapshot,
      chatThreadListFetchedForUserId,
      chatThreadListEpoch,
      syncChatUnreadFromThreads,
      userReviewsPeerRow,
      viewingUserReviewsId,
    ]
  )

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

export function useNavigation() {
  const v = useContext(NavigationContext)
  if (v == null) {
    throw new Error('useNavigation debe usarse dentro de NavigationProvider')
  }
  return v
}
