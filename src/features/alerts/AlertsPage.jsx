import { useCallback, useEffect, useState } from 'react'
import ScreenShell from '../../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../../ui/layout/layout'
import { colors } from '../../design/colors'
import UserAlertCard from '../parking/waitme/UserAlertCard.jsx'
import { useAuth } from '../../lib/AuthContext'
import { isSupabaseConfigured } from '../../services/supabase.js'
import { isRealSupabaseAuthUid } from '../../services/authUid.js'
import {
  fetchParkingAlertsForUser,
  parkingAlertRowToCard,
} from '../../services/waitmeAlerts.js'

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

export default function AlertsPage() {
  const { user } = useAuth()
  const [scope, setScope] = useState('alerts')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const userId = user?.id ?? ''
  const dev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  const hasRealSupabaseSession = isSupabaseConfigured() && isRealSupabaseAuthUid(userId)
  const canLoadAlerts = Boolean(dev || hasRealSupabaseSession)

  const load = useCallback(async () => {
    if (!canLoadAlerts) {
      setRows([])
      setLoadError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    const { data, error } = await fetchParkingAlertsForUser({
      userId,
      listingScope: scope === 'reservations' ? 'reservations' : 'alerts',
    })
    if (error) {
      setRows([])
      setLoadError(error)
    } else {
      setRows(Array.isArray(data) ? data : [])
      setLoadError(null)
    }
    setLoading(false)
  }, [canLoadAlerts, userId, scope])

  useEffect(() => {
    void load()
  }, [load])

  const offlineHint = !hasRealSupabaseSession && !dev ? (
      <DashedHint>
        Conecta Supabase e inicia sesión para cargar tu historial de alertas y reservas.
      </DashedHint>
    ) : null

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
          {offlineHint}

          {canLoadAlerts && loading ? (
            <DashedHint>Cargando…</DashedHint>
          ) : null}

          {canLoadAlerts && loadError && !loading ? (
            <DashedHint>No se pudieron cargar los datos. Revisa la conexión y el proyecto Supabase.</DashedHint>
          ) : null}

          <h2 style={{ ...sectionTitle, marginTop: 0 }}>Activas</h2>
          {scope === 'alerts' ? (
            rows.filter((r) => String(r.status) === 'active').length === 0 &&
            !loading &&
            !loadError &&
            canLoadAlerts ? (
              <DashedHint>No tienes alertas activas.</DashedHint>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {rows
                  .filter((r) => String(r.status) === 'active')
                  .map((r) => {
                    const user = parkingAlertRowToCard(r)
                    if (import.meta.env.DEV) {
                      console.log('SOURCE USER:', user.id, user.name)
                    }
                    return (
                      <UserAlertCard
                        key={user.id}
                        user={user}
                        isEmpty={false}
                        hideBuy={false}
                        onBuyAlert={() => {}}
                        onCall={() => {}}
                      />
                    )
                  })}
              </div>
            )
          ) : (
            <DashedHint>No tienes reservas activas.</DashedHint>
          )}

          <h2 style={sectionTitle}>Finalizadas</h2>
          {scope === 'alerts' ? (
            rows.filter((r) => String(r.status) !== 'active').length === 0 &&
            !loading &&
            !loadError &&
            canLoadAlerts ? (
              <DashedHint>No hay alertas finalizadas.</DashedHint>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: 0.9 }}>
                {rows
                  .filter((r) => String(r.status) !== 'active')
                  .map((r) => {
                    const user = parkingAlertRowToCard(r, { clearTimers: true })
                    if (import.meta.env.DEV) {
                      console.log('SOURCE USER:', user.id, user.name)
                    }
                    return (
                      <UserAlertCard
                        key={user.id}
                        user={user}
                        isEmpty={false}
                        hideBuy
                        onBuyAlert={() => {}}
                        onCall={() => {}}
                      />
                    )
                  })}
              </div>
            )
          ) : (
            <DashedHint>Aquí verás reservas pasadas.</DashedHint>
          )}
        </div>
      </div>
    </ScreenShell>
  )
}
