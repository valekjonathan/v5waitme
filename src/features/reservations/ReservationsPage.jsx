import { useMemo } from 'react'
import ScreenShell from '../../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../../ui/layout/layout'
import { colors } from '../../design/colors'
import UserAlertCard from '../parking/waitme/UserAlertCard.jsx'
import { useAuth } from '../../lib/AuthContext'
import { useAppScreen } from '../../lib/AppScreenContext'

const BG = colors.background
const shellStyle = { backgroundColor: BG }

const titleStyle = {
  fontSize: 18,
  fontWeight: 800,
  color: colors.textPrimary,
  margin: '0 0 12px',
  paddingLeft: 4,
}

const emptyStyle = {
  padding: 24,
  textAlign: 'center',
  color: colors.textMuted,
  fontSize: 15,
  fontWeight: 600,
}

const bannerActive = {
  marginBottom: 8,
  padding: '6px 10px',
  borderRadius: 8,
  backgroundColor: 'rgba(139,92,246,0.2)',
  border: '1px solid rgba(139,92,246,0.45)',
  color: colors.textPrimary,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.3,
}

const bannerDone = {
  ...bannerActive,
  backgroundColor: 'rgba(34,197,94,0.15)',
  border: '1px solid rgba(34,197,94,0.4)',
}

export default function ReservationsPage() {
  const { user } = useAuth()
  const { reservations } = useAppScreen()
  const sessionId = user?.id != null ? String(user.id) : ''

  const mine = useMemo(
    () =>
      Array.isArray(reservations)
        ? reservations.filter((r) => r && typeof r === 'object' && String(r.buyerUserId) === sessionId)
        : [],
    [reservations, sessionId]
  )

  return (
    <ScreenShell style={shellStyle} mainMode={SCREEN_SHELL_MAIN_MODE.INSET} mainOverflow="hidden">
      <div
        data-waitme-reservations-screen
        style={{
          width: '100%',
          height: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '12px 16px 24px',
          boxSizing: 'border-box',
          overflowY: 'auto',
        }}
      >
        <h1 style={titleStyle}>Tus reservas</h1>
        {mine.length === 0 ? (
          <div style={emptyStyle}>Aún no tienes reservas.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mine.map((r, i) => {
              const snap = r.alertSnapshot && typeof r.alertSnapshot === 'object' ? r.alertSnapshot : {}
              const st = String(r.status ?? '')
              const completed = st === 'completed'
              const sellerAmt = r.sellerAmount
              const feeAmt = r.feeAmount
              return (
                <div key={r.id != null && String(r.id) !== '' ? String(r.id) : `res-${i}`}>
                  <div style={completed ? bannerDone : bannerActive}>
                    {completed
                      ? `Completada · Vendedor ${typeof sellerAmt === 'number' ? sellerAmt.toFixed(2) : '—'} € · Comisión ${typeof feeAmt === 'number' ? feeAmt.toFixed(2) : '—'} €`
                      : 'Reserva activa'}
                  </div>
                  <UserAlertCard
                    user={snap}
                    streetPickAddress={typeof snap.address === 'string' ? snap.address : undefined}
                    hideBuy
                    isEmpty={false}
                    onBuyAlert={() => {}}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ScreenShell>
  )
}
