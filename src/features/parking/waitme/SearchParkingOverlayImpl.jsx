/**
 * Equivalente a WaitMe SearchMapOverlay: buscador, filtros, tarjeta inferior, zoom.
 * `mode`: 'search' | 'parked' — mismo layout; solo cambia la tarjeta inferior.
 * Tarjeta: por defecto usuario más cercano; si hay selección en mapa, esa tiene prioridad.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  distanceMeters,
  getCurrentLocationFast,
  subscribeToLocation,
} from '../../../services/location.js'
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
import { simulatedUserToAlert } from './simulatedUserToAlert.js'

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
  top: 140,
  right: 16,
  zIndex: 18,
  pointerEvents: 'auto',
}

export default function SearchParkingOverlayImpl({ mode = 'search', allUsers = [] }) {
  const isSearch = mode === 'search'
  const [address, setAddress] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState(WAITME_DEFAULT_SEARCH_FILTERS)
  const [isCardVisible, setIsCardVisible] = useState(true)

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
    if (!hasLoc) {
      return [...allUsers].sort((a, b) => a.id.localeCompare(b.id))
    }
    return [...allUsers]
      .map((u) => ({
        ...u,
        _distanceM: distanceMeters(ulat, ulng, u.lat, u.lng),
      }))
      .sort((a, b) => a._distanceM - b._distanceM)
  }, [allUsers, userLocation])

  const closestUser = usersSortedByDistance[0] ?? null

  const displayUser = useMemo(() => {
    if (selectedUserId) {
      const picked = allUsers.find((u) => u.id === selectedUserId)
      if (picked) return picked
    }
    return closestUser
  }, [selectedUserId, allUsers, closestUser])

  useEffect(() => {
    if (selectedUserId && !allUsers.some((u) => u.id === selectedUserId)) {
      setSelectedUserId(null)
    }
  }, [allUsers, selectedUserId])

  const onSelectUser = useCallback((userId) => {
    setSelectedUserId(userId)
  }, [])

  const alert = useMemo(() => {
    const a = simulatedUserToAlert(displayUser)
    if (!a || !displayUser) return a
    return { ...a, rating: displayUser.stars ?? a.rating }
  }, [displayUser])
  const alertsCount = useMemo(
    () => countFiltered(allUsers, filters, userLocation),
    [allUsers, filters, userLocation]
  )

  const onStreetSelect = ({ lng, lat }) => {
    flyGlobalMapTo(lng, lat)
  }

  const streetPlaceholder = isSearch ? '¿Dónde quieres aparcar?' : '¿Donde estas aparcado?'

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <div
        style={{
          position: 'relative',
          zIndex: 200000,
          isolation: 'isolate',
          overflow: 'visible',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 70,
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
            <StreetSearch onSelect={onStreetSelect} placeholder={streetPlaceholder} />
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
              position: 'fixed',
              inset: 0,
              zIndex: 199999,
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
          highlightUserId={selectedUserId ?? displayUser?.id}
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
            bottom: isSearch ? 88 : 80,
            left: 16,
            right: 16,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              transform: isCardVisible ? 'translateY(0)' : 'translateY(calc(100% - 44px))',
              transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: 'auto',
            }}
          >
            <div style={{ position: 'relative' }}>
              <HideParkingCardToggle
                expanded={isCardVisible}
                onToggle={() => setIsCardVisible((v) => !v)}
              />
              {isSearch ? (
                <UserAlertCard
                  alert={alert}
                  isEmpty={!displayUser}
                  userLocation={userLocation}
                  collapsed={false}
                />
              ) : (
                <CreateAlertCard
                  address={address}
                  onAddressChange={setAddress}
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
    </div>
  )
}
