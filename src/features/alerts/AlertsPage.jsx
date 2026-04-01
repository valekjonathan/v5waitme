import { useState } from 'react'
import ScreenShell from '../../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../../ui/layout/layout'

const PURPLE = '#A855F7'
const BG = '#0B0B0F'
const TEXT_GRAY = '#9CA3AF'
const TEXT_WHITE = '#F9FAFB'
const BORDER = 'rgba(168, 85, 247, 0.35)'

const shellStyle = { backgroundColor: BG }

const placeholder = {
  padding: 16,
  borderRadius: 12,
  border: `1px dashed ${BORDER}`,
  color: TEXT_GRAY,
  fontSize: 14,
  fontWeight: 600,
  textAlign: 'center',
  pointerEvents: 'none',
}

const sectionTitle = {
  fontSize: 13,
  fontWeight: 800,
  color: TEXT_GRAY,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  margin: '16px 0 8px',
  pointerEvents: 'none',
}

export default function AlertsPage() {
  const [scope, setScope] = useState('alerts')

  return (
    <ScreenShell style={shellStyle} mainMode={SCREEN_SHELL_MAIN_MODE.INSET} mainOverflow="auto">
      <div style={{ position: 'relative', width: '100%', minHeight: '100%', paddingBottom: 24 }}>
        <button
          type="button"
          onClick={() => setScope('alerts')}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '50%',
            height: 44,
            padding: 0,
            border: 'none',
            borderBottom: scope === 'alerts' ? `2px solid ${PURPLE}` : '2px solid transparent',
            background: 'transparent',
            color: scope === 'alerts' ? TEXT_WHITE : TEXT_GRAY,
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            pointerEvents: 'auto',
            boxSizing: 'border-box',
          }}
        >
          Tus alertas
        </button>
        <button
          type="button"
          onClick={() => setScope('reservations')}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '50%',
            height: 44,
            padding: 0,
            border: 'none',
            borderBottom: scope === 'reservations' ? `2px solid ${PURPLE}` : '2px solid transparent',
            background: 'transparent',
            color: scope === 'reservations' ? TEXT_WHITE : TEXT_GRAY,
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            pointerEvents: 'auto',
            boxSizing: 'border-box',
          }}
        >
          Tus reservas
        </button>

        <div style={{ paddingTop: 56 }}>
          <h2 style={{ ...sectionTitle, marginTop: 0 }}>Activas</h2>
          <div style={placeholder}>
            {scope === 'alerts'
              ? 'No tienes alertas activas. Cuando crees una, aparecerá aquí.'
              : 'No tienes reservas activas.'}
          </div>

          <h2 style={sectionTitle}>Finalizadas</h2>
          <div style={placeholder}>
            {scope === 'alerts'
              ? 'Aquí verás el historial de alertas cerradas.'
              : 'Aquí verás reservas pasadas.'}
          </div>
        </div>
      </div>
    </ScreenShell>
  )
}
