/**
 * Copia de WaitMe: src/components/cards/CreateAlertCard.jsx (input nativo + sliders nativos).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { colors } from '../../../design/colors'
import { radius } from '../../../design/radius'
import { getCurrentLocationFast } from '../../../services/location.js'
import { formatSuggestionLabel } from '../../../services/streetSearchService.js'
import { LAYOUT } from '../../../ui/layout/layout'
import { IconClock, IconMapPin, WAITME_ROW_ICON_SLOT } from './icons.jsx'
import { useStreetSearchMapbox } from './useStreetSearchMapbox.js'

const rangeClass = 'waitme-create-alert-range'

const MINUTES_MIN = 5
const MINUTES_MAX = 60
const PRICE_MIN = 3
const PRICE_MAX = 20

function rangeGradientPercent(value, min, max) {
  if (max <= min) return 0
  return ((value - min) / (max - min)) * 100
}

/** Misma base visual que “Continuar con Apple” en `LoginButtons.jsx`. */
const OAUTH_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'
const oauthTransitionBase = `background 180ms ${OAUTH_EASE}, background-image 180ms ${OAUTH_EASE}, box-shadow 180ms ${OAUTH_EASE}, filter 180ms ${OAUTH_EASE}, border-color 180ms ${OAUTH_EASE}`
const appleShadow = {
  idle: '0 2px 12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.06)',
  hover: '0 6px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.08)',
  pressed: '0 1px 8px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.25)',
}
const appleBg =
  'linear-gradient(165deg, rgba(124,58,237,0.35) 0%, rgba(88,28,135,0.55) 45%, rgba(59,7,100,0.95) 100%)'
const oauthButtonBase = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2px 24px',
  cursor: 'pointer',
  border: '1px solid rgba(255, 255, 255, 0.12)',
}

const DEBOUNCE_MS = 80

const suggestLiStyle = {
  padding: '10px 12px',
  color: '#fff',
  fontSize: 12,
  cursor: 'pointer',
  borderBottom: '1px solid rgba(55, 65, 81, 0.5)',
}

export default function CreateAlertCard({
  address,
  onAddressChange,
  onAddressResolved,
  userLocation = null,
  onRecenter: _onRecenter,
  onCreateAlert,
  isLoading = false,
  mapRef: _mapRef,
}) {
  const [price, setPrice] = useState(3)
  const [minutes, setMinutes] = useState(10)
  const [publishHover, setPublishHover] = useState(false)
  const [publishPressed, setPublishPressed] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [suggestOpen, setSuggestOpen] = useState(false)
  const addressRowRef = useRef(null)

  const proximity = useMemo(() => {
    const lat = userLocation?.latitude
    const lng = userLocation?.longitude
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
    const fast = getCurrentLocationFast()
    if (fast && Number.isFinite(fast.latitude) && Number.isFinite(fast.longitude)) {
      return { lat: fast.latitude, lng: fast.longitude }
    }
    return null
  }, [userLocation?.latitude, userLocation?.longitude])

  const { runSearch, abortAndNewSession, pickSuggestion } = useStreetSearchMapbox({
    proximity,
    enableSuggestions: true,
  })

  const applySuggestions = useCallback((list) => {
    setSuggestions(list)
  }, [])

  useEffect(() => {
    const q = (address || '').trim()
    if (q.length < 2) {
      abortAndNewSession()
      setSuggestions([])
      return undefined
    }
    const t = window.setTimeout(() => runSearch(address, applySuggestions), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [address, runSearch, abortAndNewSession, applySuggestions])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (addressRowRef.current && !addressRowRef.current.contains(e.target)) {
        setSuggestOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  const handlePickSuggestion = async (suggestion) => {
    await pickSuggestion(suggestion, (payload) => {
      onAddressChange(payload.address)
      onAddressResolved?.(payload)
      setSuggestions([])
      setSuggestOpen(false)
    })
  }

  const handleCreate = () => {
    onCreateAlert?.({ price, minutes })
  }

  const clearPublishPress = () => setPublishPressed(false)
  const publishTransform = publishPressed ? 'scale(0.96)' : 'scale(1)'
  const publishTransition = `${oauthTransitionBase}, transform 260ms cubic-bezier(0.34, 1.35, 0.64, 1)`
  const publishShadowKey = publishPressed ? 'pressed' : publishHover ? 'hover' : 'idle'
  const publishStyle = {
    ...oauthButtonBase,
    width: '100%',
    minHeight: 64,
    height: 64,
    borderRadius: radius.xxl,
    fontSize: 16,
    fontWeight: 500,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    backgroundColor: colors.primaryStrong,
    backgroundImage: appleBg,
    color: colors.textPrimary,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: appleShadow[publishShadowKey],
    transform: publishTransform,
    transition: publishTransition,
    filter: publishHover && !publishPressed ? 'brightness(1.05)' : 'none',
    opacity: isLoading || !address ? 0.7 : 1,
    cursor: isLoading || !address ? 'not-allowed' : 'pointer',
  }

  const minutesPct = useMemo(
    () => rangeGradientPercent(minutes, MINUTES_MIN, MINUTES_MAX),
    [minutes]
  )
  const pricePct = useMemo(() => rangeGradientPercent(price, PRICE_MIN, PRICE_MAX), [price])

  const minutesTrackStyle = useMemo(
    () => ({
      marginTop: 4,
      background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${minutesPct}%, rgba(255,255,255,0.2) ${minutesPct}%, rgba(255,255,255,0.2) 100%)`,
    }),
    [minutesPct]
  )

  const priceTrackStyle = useMemo(
    () => ({
      marginTop: 4,
      background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${pricePct}%, rgba(255,255,255,0.2) ${pricePct}%, rgba(255,255,255,0.2) 100%)`,
    }),
    [pricePct]
  )

  return (
    <div
      data-alert-card
      data-create-alert-card
      data-waitme-parking-gap-card-top
      style={{
        pointerEvents: 'auto',
        backgroundColor: 'rgba(17, 24, 39, 0.92)',
        borderRadius: 16,
        padding: '16px 20px',
        border: '2px solid rgba(168, 85, 247, 0.55)',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        .${rangeClass} {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 3px;
          outline: none;
        }
        .${rangeClass}::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #8B5CF6;
          border: 2px solid #ffffff;
          cursor: pointer;
        }
        .${rangeClass}::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #8B5CF6;
          border: 2px solid #ffffff;
          cursor: pointer;
        }
        .${rangeClass}::-moz-range-track {
          height: 6px;
          border-radius: 3px;
          background: transparent;
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1,
          minHeight: 0,
          gap: 24,
        }}
      >
        <div
          ref={addressRowRef}
          style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, zIndex: 2 }}
        >
          <span style={{ color: '#c084fc', flexShrink: 0, display: 'flex' }}>
            <IconMapPin size={22} />
          </span>
          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <input
              value={address}
              onChange={(e) => {
                onAddressChange(e.target.value)
                setSuggestOpen(true)
              }}
              onFocus={() => setSuggestOpen(true)}
              placeholder="Calle Ejemplo, 13"
              autoComplete="off"
              style={{
                width: '100%',
                height: 32,
                fontSize: 12,
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: 6,
                color: '#fff',
                padding: '0 10px',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {suggestOpen && (address || '').trim().length >= 2 && suggestions.length > 0 ? (
              <ul
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  backgroundColor: 'rgba(17, 24, 39, 0.98)',
                  border: '1px solid rgba(168, 85, 247, 0.45)',
                  borderRadius: 8,
                  zIndex: LAYOUT.z.streetSearchResults,
                  maxHeight: 180,
                  overflowY: 'auto',
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                }}
              >
                {suggestions.map((f, idx) => (
                  <li
                    key={String(f.mapbox_id ?? idx)}
                    role="button"
                    tabIndex={0}
                    style={suggestLiStyle}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handlePickSuggestion(f)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePickSuggestion(f)}
                  >
                    {formatSuggestionLabel(f)}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              ...WAITME_ROW_ICON_SLOT,
              position: 'relative',
              top: 2,
            }}
          >
            <IconClock size={22} strokeWidth={2} />
          </span>
          <div style={{ flex: 1, marginTop: 8 }}>
            <label style={{ color: '#fff', fontSize: 12, fontWeight: 500, display: 'block' }}>
              Me voy en:
              <span
                style={{
                  color: '#c084fc',
                  fontWeight: 700,
                  fontSize: 22,
                  lineHeight: 1,
                  marginLeft: 8,
                }}
              >
                {minutes} minutos
              </span>
            </label>
            <input
              type="range"
              className={rangeClass}
              min={MINUTES_MIN}
              max={MINUTES_MAX}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              style={minutesTrackStyle}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              ...WAITME_ROW_ICON_SLOT,
              position: 'relative',
              top: 2,
            }}
          >
            <span
              style={{
                ...WAITME_ROW_ICON_SLOT,
                position: 'relative',
                top: 2,
                fontSize: 22,
                lineHeight: 1,
                fontWeight: 600,
              }}
              aria-hidden
            >
              €
            </span>
          </span>
          <div style={{ flex: 1, marginTop: 8 }}>
            <label style={{ color: '#fff', fontSize: 12, fontWeight: 500, display: 'block' }}>
              Precio:
              <span
                style={{
                  color: '#c084fc',
                  fontWeight: 700,
                  fontSize: 22,
                  lineHeight: 1,
                  marginLeft: 42,
                }}
              >
                {price} euros
              </span>
            </label>
            <input
              type="range"
              className={rangeClass}
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={1}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              style={priceTrackStyle}
            />
          </div>
        </div>

        <button
          type="button"
          style={publishStyle}
          onClick={handleCreate}
          disabled={isLoading || !address}
          onMouseEnter={() => setPublishHover(true)}
          onMouseLeave={() => {
            setPublishHover(false)
            clearPublishPress()
          }}
          onMouseDown={() => setPublishPressed(true)}
          onMouseUp={clearPublishPress}
          onTouchStart={() => setPublishPressed(true)}
          onTouchEnd={clearPublishPress}
          onTouchCancel={clearPublishPress}
        >
          {isLoading ? 'Publicando...' : 'Publicar mi WaitMe!'}
        </button>
      </div>
    </div>
  )
}
