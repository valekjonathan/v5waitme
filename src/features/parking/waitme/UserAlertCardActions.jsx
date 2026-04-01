/**
 * Acciones inferiores de UserAlertCard (WaitMe): evita duplicación de bloques chat/tel/navegar.
 */
import { useEffect, useState } from 'react'
import {
  IconClock,
  IconMessageCircle,
  IconNavigation,
  IconPhone,
  IconPhoneOff,
} from './icons.jsx'

function openMapsDirections(alert) {
  if (alert?.latitude != null && alert?.longitude != null) {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${alert.latitude},${alert.longitude}`,
      '_blank'
    )
  }
}

/** Misma altura que el botón morado WaitMe! en la fila principal (y botón premium inferior). */
export const WAITME_BTN_HEIGHT = 32

/** Mismo aspecto que el badge "Info usuario" en `UserAlertCard.jsx` (badgeBase). */
const INFO_USUARIO_BADGE_STYLE = {
  backgroundColor: 'rgba(168, 85, 247, 0.2)',
  color: '#d8b4fe',
  border: '1px solid rgba(192, 132, 252, 0.5)',
  fontWeight: 700,
  fontSize: 12,
  height: 28,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  borderRadius: 6,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  padding: 0,
}

const BTN_48 = {
  width: 48,
  height: WAITME_BTN_HEIGHT,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  padding: 0,
}

const chatStyleGrid = {
  ...BTN_48,
  width: '100%',
  backgroundColor: '#22c55e',
  color: '#fff',
  border: '1px solid rgba(74, 222, 128, 0.5)',
  cursor: 'pointer',
}

const chatStyleRow = {
  ...BTN_48,
  backgroundColor: '#22c55e',
  color: '#fff',
  border: '1px solid rgba(74, 222, 128, 0.5)',
  cursor: 'pointer',
}

const NAV_MUTED = {
  ...BTN_48,
  border: '1px solid rgba(96, 165, 250, 0.5)',
  backgroundColor: 'rgba(55, 65, 81, 0.5)',
  color: '#6b7280',
  cursor: 'not-allowed',
  opacity: 0.6,
}

const phoneStyleGridEnabled = {
  ...BTN_48,
  width: '100%',
  backgroundColor: '#fff',
  color: '#000',
  border: '1px solid rgba(209, 213, 219, 0.5)',
  cursor: 'pointer',
}

const phoneStyleRowEnabled = {
  ...BTN_48,
  backgroundColor: '#fff',
  color: '#000',
  border: '1px solid rgba(209, 213, 219, 0.5)',
  cursor: 'pointer',
}

export default function UserAlertCardActions({
  hideBuy,
  phoneEnabled,
  handleChat,
  handleCall,
  isOperationAccepted,
  alert,
  handleBuy,
  isLoading,
  buyLabel: _buyLabel,
}) {
  const [timeLeftMs, setTimeLeftMs] = useState(0)

  useEffect(() => {
    if (alert?.available_in_minutes == null) {
      setTimeLeftMs(0)
      return undefined
    }

    const end = Date.now() + alert.available_in_minutes * 60000

    const tick = () => {
      const diff = Math.max(0, end - Date.now())
      setTimeLeftMs(diff)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [alert?.available_in_minutes])

  const minutes = Math.floor(timeLeftMs / 60000)
  const seconds = Math.floor((timeLeftMs % 60000) / 1000)
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const navClass = isOperationAccepted ? 'btn-ir-navigate-waitme' : ''
  const navDisabled = !isOperationAccepted || !alert?.latitude || !alert?.longitude

  const navButtonStyle = (width) =>
    isOperationAccepted
      ? {
          ...NAV_MUTED,
          width,
          backgroundColor: '#2563eb',
          color: '#fff',
          cursor: 'pointer',
          opacity: 1,
        }
      : { ...NAV_MUTED, width }

  const phoneGrid = phoneEnabled ? (
    <button type="button" style={phoneStyleGridEnabled} onClick={handleCall}>
      <IconPhone size={16} />
    </button>
  ) : (
    <button type="button" disabled style={{ ...NAV_MUTED, width: '100%' }}>
      <IconPhoneOff size={16} />
    </button>
  )

  const phoneRow = phoneEnabled ? (
    <button type="button" style={phoneStyleRowEnabled} onClick={handleCall}>
      <IconPhone size={16} />
    </button>
  ) : (
    <button type="button" disabled style={NAV_MUTED}>
      <IconPhoneOff size={16} />
    </button>
  )

  const navigateBtn = (width) => (
    <button
      type="button"
      disabled={navDisabled}
      className={navClass}
      style={navButtonStyle(width)}
      onClick={() => {
        if (isOperationAccepted && alert?.latitude && alert?.longitude) openMapsDirections(alert)
      }}
    >
      <IconNavigation size={16} />
    </button>
  )

  if (hideBuy) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <button type="button" style={chatStyleGrid} onClick={handleChat}>
          <IconMessageCircle size={16} />
        </button>
        {phoneGrid}
        {navigateBtn('100%')}
        <div
          style={{
            height: 32,
            borderRadius: 8,
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '0 4px',
          }}
        >
          <span style={{ color: '#4ade80', flexShrink: 0, display: 'flex' }}>
            <IconClock size={14} />
          </span>
          <span style={{ fontSize: 14, color: '#d1d5db', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {alert?.available_in_minutes != null ? `${alert.available_in_minutes} min` : '--'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button type="button" style={chatStyleRow} onClick={handleChat}>
        <IconMessageCircle size={16} />
      </button>
      {phoneRow}
      {navigateBtn(48)}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
        <button
          type="button"
          style={{
            ...INFO_USUARIO_BADGE_STYLE,
            cursor: isLoading ? 'wait' : 'pointer',
          }}
          onClick={handleBuy}
          disabled={isLoading}
        >
          {isLoading ? 'Procesando...' : formatted}
        </button>
      </div>
    </div>
  )
}
