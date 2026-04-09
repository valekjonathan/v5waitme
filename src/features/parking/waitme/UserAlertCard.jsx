/**
 * Copia de WaitMe: src/components/cards/UserAlertCard.jsx (sin Tailwind: estilos inline).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { colors } from '../../../design/colors'
import { radius } from '../../../design/radius'
import { shadows } from '../../../design/shadows'
import { renderHeaderStarSlots } from '../../../lib/ratingStars'
import Plate from '../../profile/components/Plate.jsx'
import { VehicleIcon } from '../../profile/components/VehicleIcons.jsx'
import { getCarFill } from './carUtils.js'
import { formatTimeHHmm } from './dateEs.js'
import { IconClock, IconMapPin, IconNavigation, IconX } from './icons.jsx'
import UserAlertCardActions, { WAITME_BTN_HEIGHT } from './UserAlertCardActions.jsx'

/** Mismo morado que el icono del reloj en esta tarjeta. */
const CLOCK_PURPLE = '#c084fc'

/** Mismas estrellas que `ProfileHeader.jsx` (renderHeaderStarSlots + tamaño). */
const profileStarFilled = {
  color: colors.accentYellow,
  textShadow: shadows.starGlow,
  fontSize: 16,
  lineHeight: 1,
}
const profileStarEmpty = {
  color: colors.textMuted,
  textShadow: 'none',
  fontSize: 16,
  lineHeight: 1,
}

/** Clon de `LoginButtons.jsx` (Continuar con Apple): gradiente, sombras, transición, hover/press. */
const OAUTH_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'
const oauthTransitionBase = `background 180ms ${OAUTH_EASE}, background-image 180ms ${OAUTH_EASE}, box-shadow 180ms ${OAUTH_EASE}, filter 180ms ${OAUTH_EASE}, border-color 180ms ${OAUTH_EASE}, backdrop-filter 180ms ${OAUTH_EASE}`
const appleShadow = {
  idle: '0 4px 16px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(147, 51, 234, 0.08)',
  hover:
    '0 10px 32px rgba(0, 0, 0, 0.22), 0 0 36px rgba(147, 51, 234, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.06)',
  pressed:
    '0 2px 10px rgba(0, 0, 0, 0.4), 0 0 12px rgba(147, 51, 234, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.2)',
}
const appleBg =
  'linear-gradient(165deg, rgba(124,58,237,0.35) 0%, rgba(88,28,135,0.55) 45%, rgba(59,7,100,0.95) 100%)'
const oauthButtonBase = {
  padding: '2px 24px',
  cursor: 'pointer',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
}

const USER_CARD_AVATAR_WRAP = {
  width: 95,
  height: 85,
  borderRadius: 8,
  overflow: 'hidden',
  border: '2px solid rgba(168, 85, 247, 0.4)',
  backgroundColor: '#111827',
  flexShrink: 0,
}

const USER_CARD_NAME_STYLE = {
  fontWeight: 700,
  fontSize: 20,
  color: '#fff',
  lineHeight: 1,
  minHeight: 22,
  margin: 0,
  display: 'block',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

/** Lista Chats: hora en cabecera (misma fila que Info usuario). */
const CHAT_HEADER_TIME_STYLE = {
  fontSize: 15,
  fontWeight: 500,
  color: 'rgba(255,255,255,0.4)',
  lineHeight: 1,
  flexShrink: 0,
  whiteSpace: 'nowrap',
}

const CHAT_PREVIEW_TEXT_STYLE = {
  fontSize: 14,
  fontWeight: 500,
  color: '#e5e7eb',
  lineHeight: 1.35,
  margin: 0,
  marginTop: 6,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

/** Misma caja 28×28 que badge "Info usuario" (altura); X y badge unread comparten caja. */
const CHAT_HEADER_ACTION_BOX = {
  width: 28,
  height: 28,
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  flexShrink: 0,
}

/** Estilo base del botón X lista chats (mismo borde/relleno que sistema rojo tarjeta). */
const CHAT_DELETE_BTN_STYLE = {
  ...CHAT_HEADER_ACTION_BOX,
  borderRadius: 8,
  border: '1px solid rgba(239, 68, 68, 0.5)',
  backgroundColor: 'rgba(239, 68, 68, 0.2)',
  color: '#f87171',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

/**
 * Badge no leídos: misma caja/borde que X; solo forma y color verdes.
 */
const CHAT_UNREAD_BADGE_STYLE = {
  ...CHAT_HEADER_ACTION_BOX,
  borderRadius: '50%',
  border: '1px solid rgba(34, 197, 94, 0.5)',
  backgroundColor: 'rgba(34, 197, 94, 0.2)',
  color: '#fff',
  fontWeight: 700,
  lineHeight: 1,
  overflow: 'hidden',
}

function pravatarImgIdFromString(s) {
  let h = 0
  const str = String(s || 'user')
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return (h % 70) + 1
}

function UserAlertAvatarBlock({ alert }) {
  const name = String(alert?.user_name || 'Usuario')
  const photo = alert?.user_photo
  const seed = useMemo(() => pravatarImgIdFromString(name), [name])
  const [brokenPhoto, setBrokenPhoto] = useState(false)
  const [pravatarIx, setPravatarIx] = useState(seed)

  useEffect(() => {
    setBrokenPhoto(false)
    setPravatarIx(seed)
  }, [seed, photo, alert?.id])

  const useUploaded = Boolean(photo) && !brokenPhoto
  const src = useUploaded ? photo : `https://i.pravatar.cc/150?img=${pravatarIx}`

  return (
    <div style={USER_CARD_AVATAR_WRAP}>
      <img
        src={src}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={() => {
          if (photo && !brokenPhoto) {
            setBrokenPhoto(true)
            return
          }
          setPravatarIx((i) => (i >= 70 ? 1 : i + 1))
        }}
      />
    </div>
  )
}

function UserAlertCard({
  alert,
  onBuyAlert,
  onChat,
  onCall,
  onReject,
  isLoading = false,
  isEmpty = false,
  userLocation,
  buyLabel = 'WaitMe!',
  hideBuy = false,
  showDistanceInMeters: _showDistanceInMeters = false,
  showCountdownTimer: _showCountdownTimer = false,
  isOperationAccepted = false,
  collapsed = false,
  /** Lista chats: misma tarjeta que parking + bloque “Últimos mensajes” al pie. */
  showLastMessage = false,
  lastMessage = '',
  /** Lista Chats: oculta fila Chats/Llamada/Navegar/contador y botón WaitMe inferior (misma tarjeta). */
  hideParkingActionsRow = false,
  /** Variante lista Chats: UI distinta sin romper parking/alertas. */
  isChat = false,
  /** Hora mostrada arriba a la derecha (lista Chats). */
  time: chatTimeProp = '',
}) {
  const normalizedUserLocation = useMemo(() => {
    if (!userLocation) return null

    if (Array.isArray(userLocation) && userLocation.length === 2) {
      const lat = Number(userLocation[0])
      const lng = Number(userLocation[1])
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { latitude: lat, longitude: lng }
      return null
    }

    const lat = Number(userLocation.latitude ?? userLocation.lat)
    const lng = Number(userLocation.longitude ?? userLocation.lng)
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { latitude: lat, longitude: lng }
    return null
  }, [userLocation])

  const toMs = (v) => {
    if (v == null) return null
    if (v instanceof Date) return v.getTime()
    if (typeof v === 'number') return v < 1e12 ? v * 1000 : v
    if (typeof v === 'string') {
      const s = v.trim()
      if (!s) return null
      const n = Number(s)
      if (!Number.isNaN(n) && /^\d+(?:\.\d+)?$/.test(s)) return n < 1e12 ? n * 1000 : n
      const t = new Date(s).getTime()
      return Number.isNaN(t) ? null : t
    }
    return null
  }

  const calculateDistanceLabel = useCallback(
    (lat, lng) => {
      const nLat = Number(lat)
      const nLng = Number(lng)
      if (!Number.isFinite(nLat) || !Number.isFinite(nLng) || !normalizedUserLocation) return null

      const R = 6371e3
      const φ1 = normalizedUserLocation.latitude * (Math.PI / 180)
      const φ2 = nLat * (Math.PI / 180)
      const Δφ = (nLat - normalizedUserLocation.latitude) * (Math.PI / 180)
      const Δλ = (nLng - normalizedUserLocation.longitude) * (Math.PI / 180)

      const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const meters = R * c

      if (!Number.isFinite(meters)) return null

      return { value: Math.round(meters), unit: ' m' }
    },
    [normalizedUserLocation]
  )

  const waitUntilTs = alert?.wait_until ? toMs(alert.wait_until) : null
  const waitUntilLabel = useMemo(() => {
    if (!waitUntilTs) return '--:--'
    try {
      return formatTimeHHmm(waitUntilTs)
    } catch {
      return '--:--'
    }
  }, [waitUntilTs])

  const priceText = useMemo(() => {
    const n = Number(alert?.price)
    if (!Number.isFinite(n)) return '--'
    return `${n} €`
  }, [alert?.price])

  const phoneEnabled = Boolean(alert?.phone && alert?.allow_phone_calls !== false)

  const handleChat = () => {
    onChat?.(alert)
  }
  const handleCall = () => {
    onCall?.(alert)
  }
  const handleBuy = () => {
    if (isLoading) return
    onBuyAlert?.(alert)
  }

  const handleDeleteChatClick = (e) => {
    e.stopPropagation()
    if (window.confirm('¿Quieres eliminar la conversación?')) {
      console.log('[UserAlertCard] delete conversation', alert?.id)
    }
  }

  const carLabel = `${alert?.brand || ''} ${alert?.model || ''}`.trim() || 'Coche'

  const distanceLabel = useMemo(
    () => calculateDistanceLabel(alert?.latitude, alert?.longitude),
    [alert?.latitude, alert?.longitude, calculateDistanceLabel]
  )

  const [waitMePremiumHover, setWaitMePremiumHover] = useState(false)
  const [waitMePremiumPressed, setWaitMePremiumPressed] = useState(false)

  const badgeBase = {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    color: '#d8b4fe',
    border: '1px solid rgba(192, 132, 252, 0.5)',
    fontWeight: 700,
    fontSize: 12,
    height: 28,
    width: 95,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    borderRadius: 6,
    cursor: 'default',
    userSelect: 'none',
    pointerEvents: 'none',
  }

  if (isEmpty || !alert) {
    return (
      <div
        data-waitme-parking-gap-card-top
        style={{
          backgroundColor: 'rgba(17, 24, 39, 0.8)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          borderRadius: 12,
          padding: '16px',
          border: '2px solid rgba(168, 85, 247, 0.5)',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <div
            style={{ color: '#A855F7', display: 'flex', justifyContent: 'center', marginBottom: 8 }}
          >
            <IconMapPin size={40} />
          </div>
          <p style={{ fontSize: 12, margin: 0 }}>Toca un coche en el mapa para ver sus datos</p>
        </div>
      </div>
    )
  }

  const lastMessageText =
    typeof lastMessage === 'string' && lastMessage.trim() !== ''
      ? lastMessage
      : (alert?.chatLastMessage ?? '')

  const chatUnread = Math.max(0, Number(alert?.chatUnreadCount ?? 0))

  const btnIcon = {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    fontFamily: 'inherit',
  }

  const applePremiumTransition = `${oauthTransitionBase}, transform 260ms cubic-bezier(0.34, 1.35, 0.64, 1)`
  const waitMePremiumShadowKey = waitMePremiumPressed
    ? 'pressed'
    : waitMePremiumHover
      ? 'hover'
      : 'idle'
  const waitMePremiumTransform = waitMePremiumPressed ? 'scale(0.96)' : 'scale(1)'
  const waitMePremiumStyle = {
    ...oauthButtonBase,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: WAITME_BTN_HEIGHT,
    height: WAITME_BTN_HEIGHT,
    padding: 0,
    borderRadius: radius.xxl,
    fontSize: 16,
    fontWeight: 500,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    backgroundColor: colors.primaryStrong,
    backgroundImage: appleBg,
    color: colors.textPrimary,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: appleShadow[waitMePremiumShadowKey],
    transform: waitMePremiumTransform,
    transition: applePremiumTransition,
    filter: waitMePremiumHover && !waitMePremiumPressed ? 'brightness(1.05)' : 'none',
    cursor: isLoading ? 'wait' : 'pointer',
  }

  const vehicleIconNode = (
    <VehicleIcon type={alert?.vehicleType} color={getCarFill(alert?.color)} size="header" />
  )

  return (
    <div
      data-alert-card
      data-waitme-parking-gap-card-top
      style={{
        backgroundColor: '#111827',
        borderRadius: 12,
        padding: 8,
        border: '2px solid rgba(168, 85, 247, 0.5)',
        position: 'relative',
        overflow: 'visible',
        transform: collapsed ? 'translateY(85%)' : 'translateY(0)',
        transition: 'transform 0.3s ease',
      }}
    >
      {isChat ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
            width: '100%',
            minWidth: 0,
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <div style={{ ...badgeBase, boxSizing: 'border-box' }}>Info usuario</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }} aria-hidden />
          <div style={{ ...CHAT_HEADER_TIME_STYLE, textAlign: 'center' }}>{chatTimeProp || ''}</div>
          <div style={{ flex: 1, minWidth: 0 }} aria-hidden />
          <button
            type="button"
            onClick={handleDeleteChatClick}
            style={CHAT_DELETE_BTN_STYLE}
            aria-label="Eliminar conversación"
          >
            <IconX size={16} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ flexShrink: 0 }}>
            <div style={badgeBase}>Info usuario</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }} aria-hidden />
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            {distanceLabel ? (
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(168, 85, 247, 0.5)',
                  borderRadius: 12,
                  padding: '2px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  height: 28,
                  boxSizing: 'border-box',
                }}
              >
                <span style={{ color: '#c084fc', display: 'flex' }}>
                  <IconNavigation size={12} />
                </span>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>
                  {distanceLabel.value}
                  {distanceLabel.unit}
                </span>
              </div>
            ) : null}
            <div
              style={{
                backgroundColor: 'rgba(22, 163, 74, 0.2)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 8,
                padding: '2px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                height: 28,
              }}
            >
              <span
                style={{ color: '#4ade80', fontWeight: 700, fontSize: 14, display: 'flex', gap: 2 }}
              >
                {priceText.replace('.00', '')} <span style={{ fontSize: 10 }}>↑</span>
              </span>
            </div>
            {onReject ? (
              <button
                type="button"
                onClick={onReject}
                style={{
                  ...btnIcon,
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  color: '#f87171',
                }}
                aria-label="Cerrar"
              >
                <IconX size={20} />
              </button>
            ) : null}
          </div>
        </div>
      )}

      <div style={{ borderTop: '1px solid rgba(55, 65, 81, 0.8)', marginBottom: 4 }} />

      <div style={{ display: 'flex', gap: 10, alignItems: isChat ? 'flex-start' : undefined }}>
        <UserAlertAvatarBlock alert={alert} />

        <div
          style={{
            flex: 1,
            ...(isChat ? { minHeight: 85 } : { height: 85 }),
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              minWidth: 0,
              minHeight: 28,
            }}
          >
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                minHeight: 28,
              }}
            >
              <span style={USER_CARD_NAME_STYLE}>{(alert?.user_name || 'Usuario').split(' ')[0]}</span>
            </div>

            {!isChat ? (
              <div
                style={{
                  width: 64,
                  marginLeft: 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexShrink: 0,
                  transform: 'translateX(-12px)',
                }}
              >
                {renderHeaderStarSlots(Number(alert?.rating ?? 0)).map((star, i) => (
                  <span key={i} style={star === '★' ? profileStarFilled : profileStarEmpty}>
                    {star}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {isChat && chatUnread > 0 ? (
            <span
              style={{
                ...CHAT_UNREAD_BADGE_STYLE,
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: chatUnread > 9 ? 9 : 11,
                zIndex: 1,
                pointerEvents: 'none',
              }}
            >
              {chatUnread > 99 ? '99+' : chatUnread}
            </span>
          ) : null}

          {isChat ? (
            <p style={CHAT_PREVIEW_TEXT_STYLE}>{lastMessageText}</p>
          ) : (
            <>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#e5e7eb',
                  lineHeight: 1,
                  margin: 0,
                  marginTop: 4,
                }}
              >
                {carLabel}
              </p>

              <div style={{ position: 'relative', marginTop: 4 }}>
                <Plate value={alert?.plate} width={140} />

                <div
                  style={{
                    position: 'absolute',
                    right: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                >
                  {vehicleIconNode}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {!isChat ? (
        <div style={{ paddingTop: 6, borderTop: '1px solid rgba(55, 65, 81, 0.8)', marginTop: 4 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              marginLeft: 8,
            }}
          >
            {alert?.address ? (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#c084fc',
                }}
              >
                <IconMapPin size={14} />
              </span>
              <span
                style={{
                  color: '#FFFFFF',
                  fontWeight: 600,
                  lineHeight: '20px',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {alert.address}
              </span>
            </span>
          ) : null}

          {alert?.available_in_minutes != null ? (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                overflow: 'hidden',
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: CLOCK_PURPLE,
                }}
              >
                <IconClock size={14} />
              </span>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  minWidth: 0,
                  lineHeight: 1.35,
                }}
              >
                <span style={{ color: CLOCK_PURPLE, fontWeight: 600 }}>
                  {alert.isIncomingRequest ? 'Te vas en ' : 'Se va en '}
                </span>
                <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 15 }}>
                  {alert.available_in_minutes} min
                </span>
                <span style={{ color: '#FFFFFF', fontWeight: 700, margin: '0 4px' }}>·</span>
                <span style={{ color: CLOCK_PURPLE, fontWeight: 600 }}>
                  {alert.isIncomingRequest ? 'Debes esperar hasta las ' : 'Te espera hasta las '}
                </span>
                <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 15 }}>
                  {waitUntilLabel}
                </span>
              </span>
            </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {!hideParkingActionsRow && !isChat ? (
        <div style={{ marginTop: 8 }}>
          <UserAlertCardActions
            hideBuy={hideBuy}
            phoneEnabled={phoneEnabled}
            handleChat={handleChat}
            handleCall={handleCall}
            isOperationAccepted={isOperationAccepted}
            alert={alert}
            handleBuy={handleBuy}
            isLoading={isLoading}
            buyLabel={buyLabel}
          />
          <div
            style={{
              width: '100%',
              height: 1,
              background: 'rgba(255,255,255,0.1)',
              marginTop: 10,
              marginBottom: 0,
            }}
          />
          <div style={{ marginTop: 10, marginBottom: 0 }}>
            <button
              type="button"
              disabled={isLoading}
              onClick={handleBuy}
              onMouseEnter={() => setWaitMePremiumHover(true)}
              onMouseLeave={() => {
                setWaitMePremiumHover(false)
                setWaitMePremiumPressed(false)
              }}
              onMouseDown={() => setWaitMePremiumPressed(true)}
              onMouseUp={() => setWaitMePremiumPressed(false)}
              onTouchStart={() => setWaitMePremiumPressed(true)}
              onTouchEnd={() => setWaitMePremiumPressed(false)}
              onTouchCancel={() => setWaitMePremiumPressed(false)}
              style={waitMePremiumStyle}
            >
              {isLoading ? 'Procesando...' : buyLabel}
            </button>
          </div>
        </div>
      ) : null}

      {showLastMessage && !isChat ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Últimos mensajes:</div>
          <div style={{ fontSize: 14 }}>{lastMessageText}</div>
        </div>
      ) : null}
    </div>
  )
}

export default React.memo(UserAlertCard)
