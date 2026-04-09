import { useCallback, useEffect, useMemo, useState } from 'react'
import { colors } from '../../design/colors'
import ScreenShell from '../../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../../ui/layout/layout'
import MessageCircleIcon from '../../ui/icons/MessageCircleIcon'
import StreetSearch from '../parking/waitme/StreetSearch.jsx'
import UserAlertCard from '../parking/waitme/UserAlertCard.jsx'
import ChatThreadView from './ChatThreadView.jsx'
import { useAuth } from '../../lib/AuthContext'
import { takePendingDmPeerUserId } from '../../lib/waitmeDmPending.js'
import { isSupabaseConfigured } from '../../services/supabase.js'
import { isRealSupabaseAuthUid } from '../../services/authUid.js'
import {
  dmListCardToAlert,
  getOrCreateDmThread,
  isDmDevFallbackThread,
  listDmThreadsForUser,
} from '../../services/waitmeChats.js'

const BG = colors.background
const shellStyle = { backgroundColor: BG }

export default function ChatsPage() {
  const { user } = useAuth()
  const [threadId, setThreadId] = useState(null)
  const [listFilter, setListFilter] = useState('')
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  /** Peer UUID cuando abrimos hilo vía `openChatsWithPeer` y la lista aún no refleja el hilo. */
  const [peerBootstrap, setPeerBootstrap] = useState(null)

  const userId = user?.id ?? ''
  const dev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  const hasRealSupabaseSession = isSupabaseConfigured() && isRealSupabaseAuthUid(userId)
  const canLoadChats = Boolean(dev || hasRealSupabaseSession)

  const load = useCallback(async () => {
    if (!canLoadChats) {
      setThreads([])
      setLoadError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    const { data, error } = await listDmThreadsForUser(userId)
    if (error) {
      setThreads([])
      setLoadError(error)
    } else {
      setThreads(Array.isArray(data) ? data : [])
      setLoadError(null)
    }
    setLoading(false)
  }, [canLoadChats, userId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!canLoadChats) return
    const peer = takePendingDmPeerUserId()
    if (!peer) return
    void (async () => {
      const { data: tid, error } = await getOrCreateDmThread(peer)
      if (error) {
        console.error('[WaitMe][Chats] getOrCreateDmThread', error)
        return
      }
      await load()
      if (tid) {
        setPeerBootstrap(peer)
        setThreadId(tid)
      }
    })()
  }, [canLoadChats, load])

  const localItems = useMemo(
    () =>
      threads.map((t) => ({
        id: t.id,
        label: t.name,
        matchText: `${t.name} ${t.lastMessage}`.toLowerCase(),
      })),
    [threads]
  )

  const filteredThreads = useMemo(() => {
    const q = listFilter.trim().toLowerCase()
    if (!q) return threads
    return threads.filter((t) => `${t.name} ${t.lastMessage}`.toLowerCase().includes(q))
  }, [listFilter, threads])

  const activeSummary = useMemo(() => {
    const fromList =
      filteredThreads.find((t) => t.id === threadId) ?? threads.find((t) => t.id === threadId) ?? null
    if (fromList) return fromList
    if (threadId && peerBootstrap) {
      return {
        id: threadId,
        name: 'Usuario',
        rating: 4,
        lastMessage: '',
        time: '',
        brand: '',
        model: '',
        plate: '',
        peerUserId: peerBootstrap,
        user_photo: null,
      }
    }
    return null
  }, [filteredThreads, peerBootstrap, threadId, threads])

  if (activeSummary && threadId) {
    return (
      <ChatThreadView
        summary={activeSummary}
        userId={userId}
        localFallback={isDmDevFallbackThread(String(threadId ?? ''))}
        onBack={() => {
          setPeerBootstrap(null)
          setThreadId(null)
        }}
      />
    )
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
        {!hasRealSupabaseSession && !dev ? (
          <div style={{ flexShrink: 0, marginBottom: 8 }}>
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                border: `1px dashed ${colors.primaryBorderMuted}`,
                color: colors.textMuted,
                fontSize: 14,
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              Conecta Supabase e inicia sesión para ver tus conversaciones.
            </div>
          </div>
        ) : null}

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
            gap: 12,
          }}
        >
          {canLoadChats && loading ? (
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                border: `1px dashed ${colors.primaryBorderMuted}`,
                color: colors.textMuted,
                fontSize: 14,
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              Cargando…
            </div>
          ) : null}

          {canLoadChats && loadError && !loading ? (
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                border: `1px dashed ${colors.primaryBorderMuted}`,
                color: colors.textMuted,
                fontSize: 14,
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              No se pudieron cargar las conversaciones. Revisa Supabase y la migración 0003.
            </div>
          ) : null}

          {!loading && !loadError && filteredThreads.length === 0 ? (
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
          ) : null}

          {!loading && !loadError
            ? filteredThreads.map((t) => (
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
                    alert={dmListCardToAlert(t)}
                    isChat
                    lastMessage={t.lastMessage}
                    time={t.time}
                    isEmpty={false}
                    onBuyAlert={() => {}}
                    onChat={() => setThreadId(t.id)}
                    onCall={() => {}}
                  />
                </div>
              ))
            : null}
        </div>
      </div>
    </ScreenShell>
  )
}
