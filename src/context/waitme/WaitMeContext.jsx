import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAuth } from '../../lib/AuthContext'
import { isRealSupabaseAuthUid } from '../../services/authUid.js'
import { isSupabaseConfigured } from '../../services/supabase.js'
import { sendDmMessage } from '../../services/waitmeChats.js'
import { checkReservationProximity, subscribeToLocation } from '../../services/location.js'
import { buildReservationFromAlert, releasePayment } from '../../services/waitmeReservations.js'
import {
  expireStaleAcceptedForBuyer,
  fetchBuyerActiveAccepted,
  fetchPendingPurchaseForSeller,
  respondPurchaseRequest,
  subscribePurchaseRequests,
  WAITME_ARRIVAL_MINUTES,
} from '../../services/waitmePurchaseRequests.js'

const WaitMeContext = createContext(null)

export function WaitMeProvider({ children }) {
  const { user } = useAuth()
  const [reservations, setReservations] = useState(/** @type {Record<string, unknown>[]} */ ([]))
  const [waitmeSentSellerIds, setWaitmeSentSellerIds] = useState(() => new Set())
  const [incomingWaitmePurchase, setIncomingWaitmePurchase] = useState(/** @type {Record<string, unknown> | null} */ (null))
  const [buyerWaitmeNotice, setBuyerWaitmeNotice] = useState(/** @type {string | null} */ (null))
  const [buyerWaitmeArrivalUntilMs, setBuyerWaitmeArrivalUntilMs] = useState(
    /** @type {number | null} */ (null)
  )
  const dismissedWaitmeRequestIdsRef = useRef(/** @type {Set<string>} */ (new Set()))
  const purchaseHandledIdsRef = useRef(/** @type {Set<string>} */ (new Set()))

  const createReservation = useCallback((reservation) => {
    if (!reservation || typeof reservation !== 'object') return
    setReservations((prev) => [...prev, reservation])
  }, [])

  const patchReservation = useCallback((reservationId, patch) => {
    const id = String(reservationId ?? '').trim()
    if (!id || !patch || typeof patch !== 'object') return
    setReservations((prev) =>
      prev.map((r) =>
        r && typeof r === 'object' && String(r.id) === id ? { ...r, ...patch } : r
      )
    )
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

  const value = useMemo(
    () => ({
      reservations,
      createReservation,
      patchReservation,
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
      activeWaitmeReservationBadgeCount,
      buyerWaitmeArrivalUntilMs,
      buyerWaitmeNotice,
      clearWaitMeSentForSeller,
      createReservation,
      dismissIncomingWaitmeModal,
      hasSentWaitMeToSeller,
      incomingWaitmePurchase,
      markWaitMeSentToSeller,
      patchReservation,
      reservations,
      respondIncomingWaitme,
    ]
  )

  return <WaitMeContext.Provider value={value}>{children}</WaitMeContext.Provider>
}

export function useWaitMe() {
  const v = useContext(WaitMeContext)
  if (v == null) {
    throw new Error('useWaitMe debe usarse dentro de WaitMeProvider')
  }
  return v
}
