import { useState } from 'react'
import ScreenShell from '../../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../../ui/layout/layout'
import { colors } from '../../design/colors'
import UserAlertCard from '../parking/waitme/UserAlertCard.jsx'

const PURPLE = colors.primary
const BG = colors.background
const TEXT_GRAY = colors.textMuted
const TEXT_WHITE = colors.textPrimary

const shellStyle = { backgroundColor: BG }

const sectionTitle = {
  fontSize: 13,
  fontWeight: 800,
  color: TEXT_GRAY,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  margin: '16px 0 8px',
  pointerEvents: 'none',
}

const dashedHintStyle = {
  padding: 16,
  borderRadius: 12,
  border: `1px dashed ${colors.primaryBorderMuted}`,
  color: TEXT_GRAY,
  fontSize: 14,
  fontWeight: 600,
  textAlign: 'center',
}

function DashedHint({ children }) {
  return <div style={dashedHintStyle}>{children}</div>
}

function ScopeTab({ active, onClick, side, children }) {
  const edge = side === 'left' ? { left: 0 } : { right: 0 }
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'absolute',
        ...edge,
        top: 0,
        width: '50%',
        height: 44,
        padding: 0,
        border: 'none',
        borderBottom: active ? `2px solid ${PURPLE}` : '2px solid transparent',
        background: 'transparent',
        color: active ? TEXT_WHITE : TEXT_GRAY,
        fontSize: 15,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        pointerEvents: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </button>
  )
}

function mkAlert(over) {
  const now = Date.now()
  const avail = over.available_in_minutes ?? 15
  return {
    user_name: over.user_name,
    rating: over.rating ?? 4,
    brand: over.brand,
    model: over.model,
    plate: over.plate,
    price: over.price ?? 5,
    latitude: over.latitude ?? 43.36234,
    longitude: over.longitude ?? -5.84998,
    user_photo: over.user_photo ?? null,
    color: over.color ?? 'gris',
    vehicleType: over.vehicleType ?? 'car',
    address: over.address ?? 'Calle Uría, Oviedo',
    available_in_minutes: avail,
    wait_until: new Date(now + avail * 60 * 1000).toISOString(),
    created_date: now,
    phone: over.phone ?? null,
    allow_phone_calls: over.allow_phone_calls ?? false,
    isIncomingRequest: false,
    ...over,
  }
}

const MOCK_ALERTS_ACTIVE = [
  mkAlert({
    user_name: 'Sofía',
    rating: 5,
    brand: 'Peugeot',
    model: '208',
    plate: '3489 KHT',
    price: 6,
    address: 'Calle Gascona, Oviedo',
    available_in_minutes: 12,
  }),
  mkAlert({
    user_name: 'Marcos',
    rating: 4,
    brand: 'Hyundai',
    model: 'i20',
    plate: '7821 LMN',
    price: 4,
    address: 'Plaza Mayor, Gijón',
    available_in_minutes: 22,
  }),
]

const MOCK_ALERTS_DONE = [
  mkAlert({
    user_name: 'Elena',
    rating: 5,
    brand: 'Fiat',
    model: '500',
    plate: '1100 ABC',
    price: 5,
    address: 'Calle Palacio Valdés, Avilés',
    available_in_minutes: 0,
  }),
]

export default function AlertsPage() {
  const [scope, setScope] = useState('alerts')

  return (
    <ScreenShell style={shellStyle} mainMode={SCREEN_SHELL_MAIN_MODE.INSET} mainOverflow="auto">
      <div
        data-waitme-alerts-screen
        style={{ position: 'relative', width: '100%', minHeight: '100%', paddingBottom: 24 }}
      >
        <ScopeTab
          active={scope === 'alerts'}
          onClick={() => setScope('alerts')}
          side="left"
        >
          Tus alertas
        </ScopeTab>
        <ScopeTab
          active={scope === 'reservations'}
          onClick={() => setScope('reservations')}
          side="right"
        >
          Tus reservas
        </ScopeTab>

        <div style={{ paddingTop: 56, paddingLeft: 16, paddingRight: 16 }}>
          <h2 style={{ ...sectionTitle, marginTop: 0 }}>Activas</h2>
          {scope === 'alerts' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {MOCK_ALERTS_ACTIVE.map((a, i) => (
                <UserAlertCard
                  key={`a-${i}`}
                  alert={a}
                  isEmpty={false}
                  hideBuy={false}
                  onBuyAlert={() => {}}
                  onChat={() => {}}
                  onCall={() => {}}
                />
              ))}
            </div>
          ) : (
            <DashedHint>No tienes reservas activas.</DashedHint>
          )}

          <h2 style={sectionTitle}>Finalizadas</h2>
          {scope === 'alerts' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: 0.9 }}>
              {MOCK_ALERTS_DONE.map((a, i) => (
                <UserAlertCard
                  key={`d-${i}`}
                  alert={{ ...a, available_in_minutes: null, wait_until: null }}
                  isEmpty={false}
                  hideBuy
                  onBuyAlert={() => {}}
                  onChat={() => {}}
                  onCall={() => {}}
                />
              ))}
            </div>
          ) : (
            <DashedHint>Aquí verás reservas pasadas.</DashedHint>
          )}
        </div>
      </div>
    </ScreenShell>
  )
}
