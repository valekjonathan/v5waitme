import { useMemo, useState } from 'react'
import { colors } from '../../design/colors'
import ScreenShell from '../../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../../ui/layout/layout'
import MessageCircleIcon from '../../ui/icons/MessageCircleIcon'
import StreetSearch from '../parking/waitme/StreetSearch.jsx'
import UserAlertCard from '../parking/waitme/UserAlertCard.jsx'
import { CHAT_MOCK_THREADS, threadToChatAlert } from './chatMockData.js'
import ChatThreadView from './ChatThreadView.jsx'

const BG = colors.background
const shellStyle = { backgroundColor: BG }

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
            gap: 12,
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
                <UserAlertCard
                  alert={threadToChatAlert(t)}
                  chatListMode
                  isEmpty={false}
                  onBuyAlert={() => {}}
                  onChat={() => setThreadId(t.id)}
                  onCall={() => {}}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </ScreenShell>
  )
}
