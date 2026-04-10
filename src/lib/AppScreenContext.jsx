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
import { useAuth } from './AuthContext'
import { isRealSupabaseAuthUid } from '../services/authUid.js'
import { isSupabaseConfigured } from '../services/supabase.js'
import { listDmThreadsForUser, sendDmMessage } from '../services/waitmeChats.js'
import { checkReservationProximity, subscribeToLocation } from '../services/location.js'
import { buildReservationFromAlert, releasePayment } from '../services/waitmeReservations.js'
import {
  expireStaleAcceptedForBuyer,
  fetchBuyerActiveAccepted,
  fetchPendingPurchaseForSeller,
  respondPurchaseRequest,
  subscribePurchaseRequests,
  WAITME_ARRIVAL_MINUTES,
} from '../services/waitmePurchaseRequests.js'
import {
  ACTIVE_SCREEN_ALERTS,
  ACTIVE_SCREEN_CHATS,
  ACTIVE_SCREEN_MAP,
  ACTIVE_SCREEN_PROFILE,
  ACTIVE_SCREEN_RESERVATIONS,
  ACTIVE_SCREEN_REVIEWS,
  ACTIVE_SCREEN_THREAD,
} from './appScreenState.js'

const AppScreenContext = createContext(null)

export function AppScreenProvider({ children }) {
  const { user } = useAuth()
  const [activeScreen, setActiveScreen] = useState(ACTIVE_SCREEN_MAP)
  const [mapMode, setMapMode] = useState(/** @type {'home' | 'search' | 'parkHere'} */ ('home'))
  const [activeThreadId, setActiveThreadId] = useState(/** @type {string | null} */ (null))
  const [activeThreadSummary, setActiveThreadSummary] = useState(/** @type {Record<string, unknown> | null} */ (null))
  const [viewingUserReviewsId, setViewingUserReviewsId] = useState(/** @type {string | null} */ (null))
  /** Fila DM / tarjeta peer al abrir reseñas (misma foto que chats). */
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
  const [reservations, setReservations] = useState(/** @type {Record<string, unknown>[]} */ ([]))
  /** Comprador: vendedores a los que ya se envió solicitud WaitMe (persistente sesión). */
  const [waitmeSentSellerIds, setWaitmeSentSellerIds] = useState(() => new Set())
  /** Vendedor: fila `waitme_purchase_requests` pendiente a mostrar en modal. */
  const [incomingWaitmePurchase, setIncomingWaitmePurchase] = useState(/** @type {Record<string, unknown> | null} */ (null))
  /** Comprador: aviso tras aceptación / rechazo. */
  const [buyerWaitmeNotice, setBuyerWaitmeNotice] = useState(/** @type {string | null} */ (null))
  /** Comprador: fin del plazo de llegada (para cuenta atrás en aviso). */
  const [buyerWaitmeArrivalUntilMs, setBuyerWaitmeArrivalUntilMs] = useState(
    /** @type {number | null} */ (null)
  )
  const dismissedWaitmeRequestIdsRef = useRef(/** @type {Set<string>} */ (new Set()))
  const purchaseHandledIdsRef = useRef(/** @type {Set<string>} */ (new Set()))

  const chatThreadListRef = useRef(/** @type {unknown[]} */ ([]))

  const syncChatThreadList = useCallback((list) => {
    chatThreadListRef.current = Array.isArray(list) ? list : []
  }, [])

  /** Copia de la última lista sincronizada (p. ej. estado inicial Chats sin flash). */
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

  const createReservation = useCallback((reservation) => {
    if (!reservation || typeof reservation !== 'object') return
    setReservations((prev) => [...prev, reservation])
  }, [])

  const markWaitMeSentToSeller = useCallback((sellerId) => {
    const s = String(sellerId ?? '').trim()
    if (!s) return
    setWaitmeSentSellerIds((prev) => new Set([...prev, s]))
  }, [])

  const clearWaitMeSentForSeller = useCallback((sellerId) => {
    const s = String(sellerId ?? '').trim()
    if (!s) return
    setWaitmeSentSellerIds((prev) => {
      const next = new Set(prev)
      next.delete(s)
      return next
    })
  }, [])

  const hasSentWaitMeToSeller = useCallback(
    (sellerId) => {
      const s = String(sellerId ?? '').trim()
      if (!s) return false
      return waitmeSentSellerIds.has(s)
    },
    [waitmeSentSellerIds]
  )

  useEffect(() => {
    const uid = user?.id != null ? String(user.id) : ''
    if (!uid || typeof window === 'undefined') return
    try {
      const raw = window.sessionStorage.getItem(`waitme_sent_${uid}`)
      if (!raw) return
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) setWaitmeSentSellerIds(new Set(arr.map((x) => String(x))))
    } catch {
      /* */
    }
  }, [user?.id])

  useEffect(() => {
    const uid = user?.id != null ? String(user.id) : ''
    if (!uid || typeof window === 'undefined') return
    try {
      window.sessionStorage.setItem(`waitme_sent_${uid}`, JSON.stringify([...waitmeSentSellerIds]))
    } catch {
      /* */
    }
  }, [user?.id, waitmeSentSellerIds])

  const activeWaitmeReservationBadgeCount = useMemo(() => {
    const now = Date.now()
    return reservations.filter((r) => {
      if (!r || typeof r !== 'object') return false
      if (String(r.status) !== 'locked') return false
      const until = Number(r.acceptedUntilMs)
      return Number.isFinite(until) && until > now
    }).length
  }, [reservations])

  const dismissIncomingWaitmeModal = useCallback(() => {
    const row = incomingWaitmePurchase
    if (row && typeof row === 'object' && row.id) {
      dismissedWaitmeRequestIdsRef.current.add(String(row.id))
    }
    setIncomingWaitmePurchase(null)
  }, [incomingWaitmePurchase])

  const respondIncomingWaitme = useCallback(
    async (accept) => {
      const uid = user?.id != null ? String(user.id) : ''
      const row = incomingWaitmePurchase
      if (!uid || !row || typeof row !== 'object' || !row.id) return
      const requestId = String(row.id)
      const snap = row.alertSnapshot && typeof row.alertSnapshot === 'object' ? row.alertSnapshot : {}
      const lat = Number(snap.latitude ?? snap.lat)
      const lng = Number(snap.longitude ?? snap.lng)
      const loc =
        Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
      const { data, error } = await respondPurchaseRequest(
        uid,
        requestId,
        accept ? 'accepted' : 'rejected',
        loc
      )
      if (error) {
        return
      }
      purchaseHandledIdsRef.current.add(requestId)
      setIncomingWaitmePurchase(null)
      if (accept && data?.threadId) {
        const until = data.acceptedUntil ? new Date(data.acceptedUntil) : null
        const hh = until && !Number.isNaN(until.getTime()) ? String(until.getHours()).padStart(2, '0') : '--'
        const mm = until && !Number.isNaN(until.getTime()) ? String(until.getMinutes()).padStart(2, '0') : '--'
        const body = `Vale, te espero hasta las ${hh}:${mm}. Te quedan ${WAITME_ARRIVAL_MINUTES} minutos para llegar.`
        await sendDmMessage(uid, data.threadId, body)
      }
    },
    [incomingWaitmePurchase, user?.id]
  )

  useEffect(() => {
    const uid = user?.id != null ? String(user.id) : ''
    if (!isSupabaseConfigured() || !isRealSupabaseAuthUid(uid)) return undefined

    void expireStaleAcceptedForBuyer(uid)

    const unsub = subscribePurchaseRequests(uid, (row) => {
      if (!row || !row.id) return
      const rid = String(row.id)
      if (purchaseHandledIdsRef.current.has(rid)) return

      if (String(row.sellerId) === uid && row.status === 'pending') {
        if (dismissedWaitmeRequestIdsRef.current.has(rid)) return
        setIncomingWaitmePurchase(/** @type {Record<string, unknown>} */ (row))
        return
      }

      if (String(row.buyerId) === uid) {
        if (row.status === 'accepted') {
          const snap = row.alertSnapshot && typeof row.alertSnapshot === 'object' ? row.alertSnapshot : {}
          const base = buildReservationFromAlert(snap, uid)
          const lat = row.sellerLatitude != null ? Number(row.sellerLatitude) : Number(snap.latitude ?? snap.lat)
          const lng = row.sellerLongitude != null ? Number(row.sellerLongitude) : Number(snap.longitude ?? snap.lng)
          const acceptedUntilMs = row.acceptedUntil ? Date.parse(String(row.acceptedUntil)) : NaN
          const merged = {
            ...base,
            id: rid,
            purchaseRequestId: rid,
            status: 'locked',
            location:
              Number.isFinite(lat) && Number.isFinite(lng)
                ? { latitude: lat, longitude: lng }
                : base.location,
            acceptedUntilMs: Number.isFinite(acceptedUntilMs) ? acceptedUntilMs : undefined,
          }
          setReservations((prev) => {
            const has = prev.some((p) => p && typeof p === 'object' && String(p.purchaseRequestId) === rid)
            if (has) return prev
            return [...prev, merged]
          })
          setBuyerWaitmeNotice(
            `El vendedor aceptó tu WaitMe. Tienes ${WAITME_ARRIVAL_MINUTES} minutos para llegar.`
          )
          setBuyerWaitmeArrivalUntilMs(Number.isFinite(acceptedUntilMs) ? acceptedUntilMs : null)
          window.setTimeout(() => {
            setBuyerWaitmeNotice(null)
            setBuyerWaitmeArrivalUntilMs(null)
          }, 12000)
        } else if (row.status === 'rejected') {
          setBuyerWaitmeNotice('El vendedor rechazó tu solicitud WaitMe.')
          setBuyerWaitmeArrivalUntilMs(null)
          window.setTimeout(() => setBuyerWaitmeNotice(null), 10000)
          clearWaitMeSentForSeller(row.sellerId)
        }
      }
    })

    const poll = window.setInterval(() => {
      void (async () => {
        const { data } = await fetchPendingPurchaseForSeller(uid)
        if (data && data.status === 'pending' && !dismissedWaitmeRequestIdsRef.current.has(String(data.id))) {
          setIncomingWaitmePurchase(/** @type {Record<string, unknown>} */ (data))
        }
        const { data: active } = await fetchBuyerActiveAccepted(uid)
        if (Array.isArray(active)) {
          for (const pr of active) {
            if (!pr || String(pr.buyerId) !== uid) continue
            const snap = pr.alertSnapshot && typeof pr.alertSnapshot === 'object' ? pr.alertSnapshot : {}
            const base = buildReservationFromAlert(snap, uid)
            const lat =
              pr.sellerLatitude != null ? Number(pr.sellerLatitude) : Number(snap.latitude ?? snap.lat)
            const lng =
              pr.sellerLongitude != null ? Number(pr.sellerLongitude) : Number(snap.longitude ?? snap.lng)
            const acceptedUntilMs = pr.acceptedUntil ? Date.parse(String(pr.acceptedUntil)) : NaN
            const merged = {
              ...base,
              id: String(pr.id),
              purchaseRequestId: String(pr.id),
              status: 'locked',
              location:
                Number.isFinite(lat) && Number.isFinite(lng)
                  ? { latitude: lat, longitude: lng }
                  : base.location,
              acceptedUntilMs: Number.isFinite(acceptedUntilMs) ? acceptedUntilMs : undefined,
            }
            setReservations((prev) => {
              const has = prev.some(
                (p) => p && typeof p === 'object' && String(p.purchaseRequestId) === String(pr.id)
              )
              if (has) return prev
              return [...prev, merged]
            })
          }
        }
      })()
    }, 20000)

    return () => {
      unsub()
      window.clearInterval(poll)
    }
  }, [user?.id, clearWaitMeSentForSeller])

  useEffect(() => {
    const uid = user?.id != null ? String(user.id) : ''
    if (!uid) return undefined
    const t = window.setInterval(() => {
      setReservations((prev) => {
        const now = Date.now()
        let changed = false
        /** @type {string[]} */
        const sellersToClear = []
        const next = prev.map((r) => {
          if (!r || typeof r !== 'object') return r
          if (String(r.status) !== 'locked') return r
          const until = Number(r.acceptedUntilMs)
          if (!Number.isFinite(until) || until > now) return r
          changed = true
          const sid = String(r.sellerUserId ?? '').trim()
          if (sid) sellersToClear.push(sid)
          return { ...r, status: 'expired' }
        })
        if (changed && sellersToClear.length) {
          const copy = [...sellersToClear]
          window.queueMicrotask(() => {
            setWaitmeSentSellerIds((p) => {
              const n = new Set(p)
              for (const s of copy) n.delete(s)
              return n
            })
          })
        }
        return changed ? next : prev
      })
    }, 3000)
    return () => window.clearInterval(t)
  }, [user?.id])

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

  /**
   * @param {string} threadId
   * @param {unknown[] | undefined} listSnapshot filas del mapper justo después de fetch (evita carrera con ref).
   */
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

  useEffect(() => {
    return subscribeToLocation((loc) => {
      setReservations((prev) => {
        let changed = false
        const next = prev.map((r) => {
          if (!r || typeof r !== 'object') return r
          if (r.status !== 'locked') return r
          if (!checkReservationProximity(r, loc)) return r
          changed = true
          return releasePayment(r)
        })
        return changed ? next : prev
      })
    })
  }, [])

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
      reservations,
      createReservation,
      openChats,
      openChatsRoot,
      openChatsWithPeer,
      openThread,
      closeThread,
      syncChatThreadList,
      getChatThreadListSnapshot,
      pendingDmVisual,
      clearPendingDmVisual,
      mapFocusGeneration,
      chatsListResetGeneration,
      chatUnreadByThread,
      chatUnreadTotal,
      syncChatUnreadFromThreads,
      clearChatThreadUnread,
      markWaitMeSentToSeller,
      clearWaitMeSentForSeller,
      hasSentWaitMeToSeller,
      incomingWaitmePurchase,
      dismissIncomingWaitmeModal,
      respondIncomingWaitme,
      buyerWaitmeNotice,
      buyerWaitmeArrivalUntilMs,
      setBuyerWaitmeNotice,
      activeWaitmeReservationBadgeCount,
    }),
    [
      activeScreen,
      activeThreadId,
      activeThreadSummary,
      activeWaitmeReservationBadgeCount,
      buyerWaitmeArrivalUntilMs,
      buyerWaitmeNotice,
      chatUnreadByThread,
      chatUnreadTotal,
      chatsListResetGeneration,
      clearChatThreadUnread,
      clearPendingDmVisual,
      clearWaitMeSentForSeller,
      closeThread,
      dismissIncomingWaitmeModal,
      mapFocusGeneration,
      mapMode,
      markWaitMeSentToSeller,
      hasSentWaitMeToSeller,
      incomingWaitmePurchase,
      openAlerts,
      openReservations,
      createReservation,
      reservations,
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
      respondIncomingWaitme,
      syncChatThreadList,
      getChatThreadListSnapshot,
      syncChatUnreadFromThreads,
      userReviewsPeerRow,
      viewingUserReviewsId,
    ]
  )

  return <AppScreenContext.Provider value={value}>{children}</AppScreenContext.Provider>
}

export function useAppScreen() {
  return useContext(AppScreenContext)
}
