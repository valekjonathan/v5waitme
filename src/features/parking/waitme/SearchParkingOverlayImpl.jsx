/**
 * Equivalente a WaitMe SearchMapOverlay: buscador, filtros, tarjeta inferior, zoom.
 * `mode`: 'search' | 'parked' — mismo layout; solo cambia la tarjeta inferior.
 * Tarjeta: por defecto usuario más cercano; si hay selección en mapa, esa tiene prioridad.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  distanceMeters,
  getCurrentLocationFast,
  subscribeToLocation,
} from '../../../services/location.js'
import { useAuth } from '../../../lib/AuthContext'
import { useAppScreen } from '../../../lib/AppScreenContext'
import { isRealSupabaseAuthUid } from '../../../services/authUid.js'
import { isSupabaseConfigured } from '../../../services/supabase.js'
import {
  fetchPendingPurchaseForBuyerSeller,
  insertPurchaseRequest,
  updatePurchaseThreadId,
} from '../../../services/waitmePurchaseRequests.js'
import { getOrCreateDmThread, listDmThreadsForUser, sendDmMessage } from '../../../services/waitmeChats.js'
import { buildReservationFromAlert } from '../../../services/waitmeReservations.js'
import { simulatedUserToAlert } from './simulatedUserToAlert.js'
import ConfirmModal from '../../../ui/ConfirmModal.jsx'
import SimulatedCarsOnMap from '../../map/components/SimulatedCarsOnMap.jsx'
import { flyGlobalMapTo } from '../../map/mapControls.js'
import CreateAlertCard from './CreateAlertCard.jsx'
import MapFilters, { WAITME_DEFAULT_SEARCH_FILTERS } from './MapFilters.jsx'
import MapZoomControls from './MapZoomControls.jsx'
import StreetSearch from './StreetSearch.jsx'
import UserAlertCard from './UserAlertCard.jsx'
import {
  HideParkingCardToggle,
  IconSlidersHorizontal,
  WAITME_GLASS_MAP_CONTROL_36,
} from './icons.jsx'
import { LAYOUT, MAP_SLOT } from '../../../ui/layout/layout'

function countFiltered(users, filters, userLoc) {
  if (!users?.length) return 0
  const ulat = userLoc?.latitude
  const ulng = userLoc?.longitude
  const hasUser = Number.isFinite(ulat) && Number.isFinite(ulng)
  return users.filter((u) => {
    if (u.priceEUR > filters.maxPrice) return false
    if (hasUser) {
      const d = distanceMeters(ulat, ulng, u.lat, u.lng) / 1000
      if (d > filters.maxDistance) return false
    }
    return true
  }).length
}

const filterBtnStyle = {
  ...WAITME_GLASS_MAP_CONTROL_36,
  position: 'absolute',
  top: MAP_SLOT.controlsTop,
  right: MAP_SLOT.filterRight,
  zIndex: LAYOUT.z.mapFilterButton,
  pointerEvents: 'auto',
}

export default function SearchParkingOverlayImpl({ mode = 'search', allUsers = [] }) {
  const { user: authUser } = useAuth()
  const {
    markWaitMeSentToSeller,
    hasSentWaitMeToSeller,
    openThread,
    syncChatThreadList,
    createReservation,
    openReservations,
  } = useAppScreen()
  const [confirmBuyUser, setConfirmBuyUser] = useState(/** @type {Record<string, unknown> | null} */ (null))
  const [purchaseBusy, setPurchaseBusy] = useState(false)
  const [purchaseError, setPurchaseError] = useState(/** @type {string | null} */ (null))
  const isSearch = mode === 'search'
  const [address, setAddress] = useState('')
  /** Dirección elegida en autocompletado (sin reverse geocode). */
  const [streetPick, setStreetPick] = useState(
    /** @type {{ address: string, lat: number | null, lng: number | null } | null} */ (null)
  )
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState(WAITME_DEFAULT_SEARCH_FILTERS)
  const [isCardVisible, setIsCardVisible] = useState(true)
  const parkingCardStackRef = useRef(null)
  const [parkingCardStackH, setParkingCardStackH] = useState(0)

  useEffect(() => {
    setIsCardVisible(true)
  }, [isSearch])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [userLocation, setUserLocation] = useState(() => {
    const fast = getCurrentLocationFast()
    if (fast && Number.isFinite(fast.latitude) && Number.isFinite(fast.longitude)) {
      return { latitude: fast.latitude, longitude: fast.longitude }
    }
    return null
  })

  useEffect(() => {
    if (!isSearch) setShowFilters(false)
  }, [isSearch])

  useEffect(() => {
    const fast = getCurrentLocationFast()
    if (fast && Number.isFinite(fast.latitude) && Number.isFinite(fast.longitude)) {
      setUserLocation({ latitude: fast.latitude, longitude: fast.longitude })
    }
    return subscribeToLocation((loc) => {
      if (!loc || !Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude)) return
      setUserLocation({ latitude: loc.latitude, longitude: loc.longitude })
    })
  }, [])

  const usersSortedByDistance = useMemo(() => {
    if (!allUsers?.length) return []
    const ulat = userLocation?.latitude
    const ulng = userLocation?.longitude
    const hasLoc = Number.isFinite(ulat) && Number.isFinite(ulng)
    const copy = [...allUsers]
    if (!hasLoc) {
      copy.sort((a, b) => a.id.localeCompare(b.id))
      return copy
    }
    copy.sort((a, b) => {
      const da = distanceMeters(ulat, ulng, a.lat, a.lng)
      const db = distanceMeters(ulat, ulng, b.lat, b.lng)
      return da - db
    })
    return copy
  }, [allUsers, userLocation])

  const closestUser = usersSortedByDistance[0] ?? null
  const pickedUser = selectedUserId ? allUsers.find((u) => u.id === selectedUserId) : null
  const user = pickedUser ?? closestUser

  const sellerIdForCard = user?.id != null ? String(user.id) : ''
  const waitMeAlreadySent = Boolean(sellerIdForCard && hasSentWaitMeToSeller(sellerIdForCard))

  useEffect(() => {
    let cancelled = false
    const uid = authUser?.id != null ? String(authUser.id) : ''
    if (!uid || !sellerIdForCard || !isSupabaseConfigured() || !isRealSupabaseAuthUid(uid)) {
      return undefined
    }
    void (async () => {
      const { data } = await fetchPendingPurchaseForBuyerSeller(uid, sellerIdForCard)
      if (cancelled || !data) return
      markWaitMeSentToSeller(sellerIdForCard)
    })()
    return () => {
      cancelled = true
    }
  }, [authUser?.id, sellerIdForCard, markWaitMeSentToSeller])

  useEffect(() => {
    if (selectedUserId && !allUsers.some((u) => u.id === selectedUserId)) {
      setSelectedUserId(null)
    }
  }, [allUsers, selectedUserId])

  const onSelectUser = useCallback((userId) => {
    setSelectedUserId(userId)
  }, [])

  const onBuyAlert = useCallback((alertUser) => {
    if (!alertUser || typeof alertUser !== 'object') return
    setPurchaseError(null)
    setConfirmBuyUser(alertUser)
  }, [])

  const confirmModalOpen = confirmBuyUser != null
  const confirmPriceNum = confirmBuyUser
    ? Number(confirmBuyUser.priceEUR ?? confirmBuyUser.price ?? 0)
    : 0
  const confirmPriceLabel = Number.isFinite(confirmPriceNum) ? `${confirmPriceNum}€` : '—€'
  const confirmMessage = `Vas a comprar esta alerta por ${confirmPriceLabel}.\n¿Quieres continuar?`

  const handleConfirmPurchase = useCallback(async () => {
    if (!confirmBuyUser || purchaseBusy) return
    const uid = authUser?.id != null ? String(authUser.id) : ''
    if (!uid) {
      setPurchaseError('Sesión no válida. Vuelve a iniciar sesión.')
      return
    }
    const snapshot = simulatedUserToAlert(confirmBuyUser) ?? confirmBuyUser
    const sellerId = String(
      snapshot.peer_user_id ?? snapshot.user_id ?? snapshot.id ?? confirmBuyUser.id ?? ''
    ).trim()
    if (!sellerId) {
      setPurchaseError('No se pudo identificar al vendedor.')
      return
    }

    setPurchaseError(null)

    const canUseSupabasePurchase = isSupabaseConfigured() && isRealSupabaseAuthUid(uid)

    if (!canUseSupabasePurchase) {
      try {
        const reservation = buildReservationFromAlert(snapshot, uid)
        createReservation(reservation)
        markWaitMeSentToSeller(sellerId)
        setConfirmBuyUser(null)
        openReservations()
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setPurchaseError(msg || 'No se pudo registrar la reserva.')
      }
      return
    }

    setPurchaseBusy(true)
    try {
      let requestRow = null
      const { data: existing } = await fetchPendingPurchaseForBuyerSeller(uid, sellerId)
      if (existing) {
        requestRow = existing
      } else {
        const price = Number(snapshot.price ?? snapshot.priceEUR ?? 0)
        const { data, error } = await insertPurchaseRequest(uid, sellerId, price, snapshot)
        if (error || !data) {
          setPurchaseError(
            error?.message
              ? `No se pudo enviar la solicitud: ${error.message}`
              : 'No se pudo enviar la solicitud (comprueba Supabase y la migración waitme_purchase_requests).'
          )
          return
        }
        requestRow = data
      }

      const { data: threadId, error: tErr } = await getOrCreateDmThread(sellerId)
      if (tErr || threadId == null || threadId === '') {
        setPurchaseError(
          tErr?.message
            ? `No se pudo abrir el chat: ${tErr.message}`
            : 'No se pudo abrir el chat con el vendedor.'
        )
        return
      }

      if (requestRow?.id && String(requestRow.threadId ?? '') !== String(threadId)) {
        await updatePurchaseThreadId(String(requestRow.id), String(threadId))
      }

      const reqId = requestRow?.id != null ? String(requestRow.id) : ''
      const introKey = reqId ? `waitme_intro_${reqId}` : ''
      if (
        introKey &&
        typeof window !== 'undefined' &&
        !window.sessionStorage.getItem(introKey)
      ) {
        await sendDmMessage(uid, String(threadId), 'Hey! quiero comprar tu WaitMe!')
        window.sessionStorage.setItem(introKey, '1')
      }

      markWaitMeSentToSeller(sellerId)

      const { data: threads } = await listDmThreadsForUser(uid)
      const list = Array.isArray(threads) ? threads : []
      syncChatThreadList?.(list)
      openThread(String(threadId), list)
      setConfirmBuyUser(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setPurchaseError(msg || 'Error al completar la compra.')
    } finally {
      setPurchaseBusy(false)
    }
  }, [
    authUser?.id,
    confirmBuyUser,
    createReservation,
    markWaitMeSentToSeller,
    openReservations,
    openThread,
    purchaseBusy,
    syncChatThreadList,
  ])

  const handleCancelPurchase = useCallback(() => {
    setPurchaseError(null)
    setConfirmBuyUser(null)
  }, [])

  const handleStreetResolved = useCallback((payload) => {
    if (!payload || typeof payload.address !== 'string') return
    setStreetPick(payload)
    setAddress(payload.address)
    if (Number.isFinite(payload.lng) && Number.isFinite(payload.lat)) {
      flyGlobalMapTo(payload.lng, payload.lat)
    }
  }, [])
  const alertsCount = useMemo(
    () => countFiltered(allUsers, filters, userLocation),
    [allUsers, filters, userLocation]
  )

  useLayoutEffect(() => {
    const el = parkingCardStackRef.current
    if (!el) return undefined
    const measure = () => setParkingCardStackH(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isSearch, address, isCardVisible, user])

  const parkingCardSlideY = isCardVisible ? 0 : Math.max(0, parkingCardStackH - MAP_SLOT.cardPeek)

  const streetPlaceholder = isSearch ? '¿Dónde quieres aparcar?' : '¿Donde estas aparcado?'

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: LAYOUT.z.content,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
        <div
          style={{
            position: 'relative',
            zIndex: LAYOUT.z.mapFiltersPanel,
            overflow: 'visible',
          }}
        >
        <div
          style={{
            position: 'absolute',
            top: MAP_SLOT.searchTop,
            left: 0,
            right: 0,
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 0,
            paddingBottom: 8,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            pointerEvents: 'auto',
            overflow: 'visible',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, overflow: 'visible' }} role="search">
            <StreetSearch
              placeholder={streetPlaceholder}
              userLocation={userLocation}
              onSelect={handleStreetResolved}
            />
          </div>
        </div>
      </div>

      {isSearch && !showFilters ? (
        <button
          type="button"
          aria-label="Filtros"
          style={filterBtnStyle}
          onClick={() => setShowFilters(true)}
        >
          <IconSlidersHorizontal size={20} />
        </button>
      ) : null}

      {isSearch && showFilters ? (
        <>
          <div
            role="presentation"
            onClick={() => setShowFilters(false)}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: LAYOUT.z.mapFiltersBackdrop,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              pointerEvents: 'auto',
            }}
          />
          <MapFilters
            filters={filters}
            onFilterChange={setFilters}
            onClose={() => setShowFilters(false)}
            alertsCount={alertsCount}
          />
        </>
      ) : null}

      {isSearch ? (
        <SimulatedCarsOnMap
          enabled
          users={allUsers}
          onSelectUser={onSelectUser}
          highlightUserId={selectedUserId ?? user?.id}
        />
      ) : null}

      <div
        style={{
          position: 'relative',
          overflow: 'visible',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: isSearch ? MAP_SLOT.cardBottomSearch : MAP_SLOT.cardBottomParked,
            left: 16,
            right: 16,
            zIndex: LAYOUT.z.parkingCardStack,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              transform: `translateY(${parkingCardSlideY}px)`,
              transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: 'auto',
            }}
          >
            <div ref={parkingCardStackRef} style={{ position: 'relative' }}>
              <HideParkingCardToggle
                expanded={isCardVisible}
                onToggle={() => setIsCardVisible((v) => !v)}
              />
              {isSearch ? (
                <UserAlertCard
                  user={user ?? undefined}
                  streetPickAddress={streetPick?.address}
                  isEmpty={!user}
                  userLocation={userLocation}
                  collapsed={false}
                  onBuyAlert={onBuyAlert}
                  waitMeAlreadySent={waitMeAlreadySent}
                  isLoading={purchaseBusy}
                />
              ) : (
                <CreateAlertCard
                  address={address}
                  onAddressChange={setAddress}
                  userLocation={userLocation}
                  onAddressResolved={handleStreetResolved}
                  onRecenter={() => {}}
                  onCreateAlert={() => {}}
                  isLoading={false}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <MapZoomControls measureLabel={isSearch ? 'navigate' : 'create'} />

      <ConfirmModal
        open={confirmModalOpen}
        message={confirmMessage}
        errorMessage={purchaseError}
        onCancel={handleCancelPurchase}
        onConfirm={handleConfirmPurchase}
      />
    </div>
  )
}
