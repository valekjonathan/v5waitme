/**
 * Copia de WaitMe: src/components/cards/CreateAlertCard.jsx (input nativo + sliders nativos).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { colors } from '../../../design/colors'
import { radius } from '../../../design/radius'
import { reverseGeocodeMapbox } from '../../../services/geocodingSpain.js'
import { getCurrentLocationFast, getCurrentPosition } from '../../../services/location.js'
import { getGlobalMapInstance } from '../../map/mapInstance.js'
import { IconClock, IconEuro, IconMapPin, WAITME_ROW_ICON_SLOT } from './icons.jsx'

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

export default function CreateAlertCard({
  address,
  onAddressChange,
  onRecenter: _onRecenter,
  onCreateAlert,
  isLoading = false,
  mapRef: _mapRef,
}) {
  const [price, setPrice] = useState(3)
  const [minutes, setMinutes] = useState(10)
  const [publishHover, setPublishHover] = useState(false)
  const [publishPressed, setPublishPressed] = useState(false)
  const throttleTimerRef = useRef(null)
  const moveEndHandlerRef = useRef(null)

  const setAddressSafe = useCallback(
    (v) => {
      if (typeof v === 'string' && v.trim()) onAddressChange(v)
    },
    [onAddressChange]
  )

  useEffect(() => {
    let cancelled = false
    const applyAddr = async (lat, lng) => {
      const line = await reverseGeocodeMapbox(lat, lng)
      if (!cancelled && line) setAddressSafe(line)
    }
    const fast = getCurrentLocationFast()
    if (fast && Number.isFinite(fast.latitude) && Number.isFinite(fast.longitude)) {
      void applyAddr(fast.latitude, fast.longitude)
      return () => {
        cancelled = true
      }
    }
    getCurrentPosition(
      (v) => {
        if (cancelled || !v) return
        void applyAddr(v.lat, v.lng)
      },
      () => {}
    )
    return () => {
      cancelled = true
    }
  }, [setAddressSafe])

  useEffect(() => {
    let cancelled = false
    let pollId = null
    const throttleMs = 450

    const scheduleReverse = (lat, lng) => {
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current)
      throttleTimerRef.current = setTimeout(() => {
        throttleTimerRef.current = null
        void reverseGeocodeMapbox(lat, lng).then((line) => {
          if (!cancelled && line) setAddressSafe(line)
        })
      }, throttleMs)
    }

    const attach = (map) => {
      if (!map?.on || moveEndHandlerRef.current) return
      const handler = () => {
        try {
          const c = map.getCenter?.()
          if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return
          scheduleReverse(c.lat, c.lng)
        } catch {
          /* */
        }
      }
      moveEndHandlerRef.current = handler
      map.on('moveend', handler)
    }

    const tryMap = getGlobalMapInstance()
    if (tryMap?.isStyleLoaded?.()) {
      attach(tryMap)
    } else {
      pollId = window.setInterval(() => {
        const map = getGlobalMapInstance()
        if (map?.isStyleLoaded?.()) {
          window.clearInterval(pollId)
          pollId = null
          attach(map)
        }
      }, 120)
    }

    return () => {
      cancelled = true
      if (pollId != null) window.clearInterval(pollId)
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current)
      const map = getGlobalMapInstance()
      const h = moveEndHandlerRef.current
      moveEndHandlerRef.current = null
      if (map && h) map.off('moveend', h)
    }
  }, [setAddressSafe])

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#c084fc', flexShrink: 0, display: 'flex' }}>
            <IconMapPin size={22} />
          </span>
          <input
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="C/ Campoamor, 13"
            autoComplete="off"
            style={{
              flex: 1,
              height: 32,
              fontSize: 12,
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: 6,
              color: '#fff',
              padding: '0 10px',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              ...WAITME_ROW_ICON_SLOT,
              position: 'relative',
              top: 3,
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
              top: 3,
            }}
          >
            <IconEuro size={22} strokeWidth={2} />
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
