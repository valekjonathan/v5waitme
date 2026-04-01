import { useState } from 'react'
import ScreenShell from '../../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../../ui/layout/layout'
import MessageCircleIcon from '../../ui/icons/MessageCircleIcon'

const PURPLE = '#A855F7'
const BG = '#0B0B0F'

const shellStyle = { backgroundColor: BG }

export default function ChatsPage() {
  const [tab, setTab] = useState('chats')

  return (
    <ScreenShell style={shellStyle} mainMode={SCREEN_SHELL_MAIN_MODE.INSET} mainOverflow="hidden">
      <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 360 }}>
        <button
          type="button"
          onClick={() => setTab('chats')}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '50%',
            height: 44,
            padding: 0,
            border: 'none',
            borderBottom: tab === 'chats' ? `2px solid ${PURPLE}` : '2px solid transparent',
            background: 'transparent',
            color: tab === 'chats' ? '#F9FAFB' : '#9CA3AF',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            pointerEvents: 'auto',
            boxSizing: 'border-box',
          }}
        >
          Tus chats
        </button>
        <button
          type="button"
          onClick={() => setTab('requests')}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '50%',
            height: 44,
            padding: 0,
            border: 'none',
            borderBottom: tab === 'requests' ? `2px solid ${PURPLE}` : '2px solid transparent',
            background: 'transparent',
            color: tab === 'requests' ? '#F9FAFB' : '#9CA3AF',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            pointerEvents: 'auto',
            boxSizing: 'border-box',
          }}
        >
          Solicitudes
        </button>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '42%',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ color: 'rgba(255,255,255,0.92)', display: 'inline-block' }}>
            <MessageCircleIcon />
          </div>
          <p
            style={{
              marginTop: 20,
              marginBottom: 0,
              fontSize: 16,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.88)',
              paddingLeft: 24,
              paddingRight: 24,
              lineHeight: 1.45,
            }}
          >
            {tab === 'chats'
              ? 'No tienes ningún chat iniciado'
              : 'No tienes solicitudes pendientes.'}
          </p>
        </div>
      </div>
    </ScreenShell>
  )
}
