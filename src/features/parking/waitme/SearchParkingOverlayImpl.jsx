/**
 * Equivalente a WaitMe SearchMapOverlay: buscador, filtros, MapScreenPanel, pin, zoom.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { getCurrentLocationFast, subscribeToLocation } from '../../../services/location.js'
import { flyGlobalMapTo } from '../../map/mapControls.js'
import MapFilters from './MapFilters.jsx'
import MapScreenPanel from './MapScreenPanel.jsx'
import MapZoomControls from './MapZoomControls.jsx'
import WaitMeCenterPin from './CenterPin.jsx'
import StreetSearch from './StreetSearch.jsx'
import UserAlertCard from './UserAlertCard.jsx'
import { IconSlidersHorizontal } from './icons.jsx'
import { simulatedUserToAlert } from './simulatedUserToAlert.js'

const PIN_HEIGHT = 54
const HEADER_FALLBACK_PX = 69

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function countFiltered(users, filters, userLoc) {
  if (!users?.length) return 0
  const ulat = userLoc?.latitude
  const ulng = userLoc?.longitude
  const hasUser = Number.isFinite(ulat) && Number.isFinite(ulng)
  return users.filter((u) => {
    if (u.priceEUR > filters.maxPrice) return false
    if (hasUser) {
      const d = haversineKm(ulat, ulng, u.lat, u.lng)
      if (d > filters.maxDistance) return false
    }
    return true
  }).length
}

/** Mismo aspecto que el contenedor del buscador (`StreetSearch.jsx`): panel oscuro + borde morado + blur. */
const filterBtnStyle = {
  boxSizing: 'border-box',
  width: 36,
  height: 36,
  borderRadius: 12,
  border: '1px solid rgba(168, 85, 247, 0.5)',
  color: '#fff',
  background: 'rgba(15, 23, 42, 0.9)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  position: 'absolute',
  top: 140,
  right: 16,
  zIndex: 999,
  pointerEvents: 'auto',
}

export default function SearchParkingOverlayImpl({ highlightUser, allUsers = [] }) {
  const cardRef = useRef(null)
  const [pinTop, setPinTop] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [cardCollapsed, setCardCollapsed] = useState(false)
  const [filters, setFilters] = useState({ maxPrice: 7, maxMinutes: 25, maxDistance: 1 })
  const [userLocation, setUserLocation] = useState(() => {
    const fast = getCurrentLocationFast()
    if (fast && Number.isFinite(fast.latitude) && Number.isFinite(fast.longitude)) {
      return { latitude: fast.latitude, longitude: fast.longitude }
    }
    return null
  })

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

  const alert = useMemo(() => {
    const a = simulatedUserToAlert(highlightUser)
    if (!a || !highlightUser) return a
    return { ...a, rating: highlightUser.stars ?? a.rating }
  }, [highlightUser])
  const alertsCount = useMemo(
    () => countFiltered(allUsers, filters, userLocation),
    [allUsers, filters, userLocation]
  )

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const updatePinPosition = () => {
      const headerEl = document.querySelector('[data-waitme-header]')
      const panelInner = document.querySelector('[data-map-screen-panel-inner]')
      const headerBottom = headerEl?.getBoundingClientRect()?.bottom ?? HEADER_FALLBACK_PX
      const cardRect = (panelInner ?? card)?.getBoundingClientRect?.()
      if (!cardRect) return
      const midPoint = (headerBottom + cardRect.top) / 2
      const pinTopViewport = midPoint - PIN_HEIGHT
      const pinTopInOverlay = pinTopViewport - headerBottom
      setPinTop(Math.max(0, pinTopInOverlay))
    }

    updatePinPosition()
    const ro = new ResizeObserver(updatePinPosition)
    ro.observe(card)
    window.addEventListener('resize', updatePinPosition)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updatePinPosition)
    }
  }, [])

  const onStreetSelect = ({ lng, lat }) => {
    flyGlobalMapTo(lng, lat)
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none',
      }}
      aria-hidden
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
          zIndex: 1000,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }} role="search">
          <StreetSearch onSelect={onStreetSelect} placeholder="¿Dónde quieres aparcar?" />
        </div>
      </div>

      {!showFilters ? (
        <button
          type="button"
          aria-label="Filtros"
          style={filterBtnStyle}
          onClick={() => setShowFilters(true)}
        >
          <IconSlidersHorizontal size={20} />
        </button>
      ) : null}

      {showFilters ? (
        <>
          <div
            role="presentation"
            onClick={() => setShowFilters(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
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

      <div
        ref={cardRef}
        style={{
          pointerEvents: 'none',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        <button
          type="button"
          aria-label={cardCollapsed ? 'Mostrar tarjeta' : 'Ocultar tarjeta'}
          aria-expanded={!cardCollapsed}
          onClick={() => setCardCollapsed((v) => !v)}
          style={{
            position: 'absolute',
            top: -22,
            right: 14,
            width: 36,
            height: 36,
            borderRadius: 10,
            background: '#111827',
            border: '1.5px solid #8B5CF6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 80,
            cursor: 'pointer',
            pointerEvents: 'auto',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.22)',
            padding: 0,
            fontFamily: 'inherit',
          }}
        >
          <span
            style={{
              color: '#fff',
              fontSize: 14,
              lineHeight: '14px',
              fontWeight: 700,
            }}
          >
            {cardCollapsed ? '↑' : '↓'}
          </span>
        </button>
        <MapScreenPanel measureLabel="navigate" cardShiftUp={7}>
          <div style={{ pointerEvents: 'auto' }}>
            <UserAlertCard
              alert={alert}
              isEmpty={!highlightUser}
              userLocation={userLocation}
              collapsed={cardCollapsed}
            />
          </div>
        </MapScreenPanel>
      </div>

      {pinTop != null && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            zIndex: 10,
            pointerEvents: 'none',
            top: 0,
          }}
        >
          <WaitMeCenterPin top={pinTop} />
        </div>
      )}

      <MapZoomControls measureLabel="navigate" />
    </div>
  )
}
