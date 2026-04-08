import { useMemo, useState } from 'react'
import { colors } from '../../design/colors'
import ScreenShell from '../../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../../ui/layout/layout'
import MessageCircleIcon from '../../ui/icons/MessageCircleIcon'
import StreetSearch from '../parking/waitme/StreetSearch.jsx'
import { CHAT_MOCK_THREADS } from './chatMockData.js'
import ChatThreadView from './ChatThreadView.jsx'

const BG = colors.background
const shellStyle = { backgroundColor: BG }

/** Misma altura que el bloque avatar de `UserAlertCard` (UserAlertAvatarBlock); ahora circular. */
const CHAT_LIST_AVATAR_PX = 85

const chatRowStyle = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  padding: '10px 4px',
  borderBottom: '1px solid rgba(55, 65, 81, 0.6)',
  boxSizing: 'border-box',
}

const chatAvatarStyle = {
  width: CHAT_LIST_AVATAR_PX,
  height: CHAT_LIST_AVATAR_PX,
  borderRadius: '50%',
  objectFit: 'cover',
  flexShrink: 0,
  border: '2px solid rgba(168, 85, 247, 0.4)',
  backgroundColor: '#111827',
}

const chatNameStyle = {
  fontWeight: 700,
  fontSize: 20,
  color: '#fff',
  lineHeight: 1.2,
  margin: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

export default function ChatsPage() {
  const [threadId, setThreadId] = useState(null)
  const [listFilter, setListFilter] = useState('')

  const localItems = useMemo(
    () =>
      CHAT_MOCK_THREADS.map((t) => ({
        id: t.id,
        label: t.name,
        matchText: `${t.name} ${t.lastMessage}`.toLowerCase(),
      })),
    []
  )

  const filteredThreads = useMemo(() => {
    const q = listFilter.trim().toLowerCase()
    if (!q) return CHAT_MOCK_THREADS
    return CHAT_MOCK_THREADS.filter((t) =>
      `${t.name} ${t.lastMessage}`.toLowerCase().includes(q)
    )
  }, [listFilter])

  const activeThread = useMemo(
    () => CHAT_MOCK_THREADS.find((t) => t.id === threadId) ?? null,
    [threadId]
  )

  if (activeThread) {
    return <ChatThreadView thread={activeThread} onBack={() => setThreadId(null)} />
  }

  return (
    <ScreenShell style={shellStyle} mainMode={SCREEN_SHELL_MAIN_MODE.INSET} mainOverflow="hidden">
      <div
        data-waitme-chats-screen
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          minHeight: 360,
          display: 'flex',
          flexDirection: 'column',
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 8,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ flexShrink: 0, pointerEvents: 'auto' }} role="search">
          <StreetSearch
            placeholder="Buscar..."
            localFilterItems={localItems}
            onLocalSelect={(item) => setThreadId(item.id)}
            onQueryChange={(q) => setListFilter(q)}
          />
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            marginTop: 12,
            paddingBottom: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
        >
          {filteredThreads.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '24px 8px',
              }}
            >
              <div style={{ color: colors.primary, display: 'inline-block' }}>
                <MessageCircleIcon />
              </div>
              <p
                style={{
                  marginTop: 16,
                  marginBottom: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.88)',
                  lineHeight: 1.45,
                }}
              >
                No hay conversaciones que coincidan
              </p>
            </div>
          ) : (
            filteredThreads.map((t) => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => setThreadId(t.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setThreadId(t.id)
                  }
                }}
                style={{ cursor: 'pointer', flexShrink: 0 }}
              >
                <div style={chatRowStyle}>
                  <img
                    src={t.avatarUrl}
                    alt=""
                    width={CHAT_LIST_AVATAR_PX}
                    height={CHAT_LIST_AVATAR_PX}
                    style={chatAvatarStyle}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={chatNameStyle}>{t.name}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </ScreenShell>
  )
}
