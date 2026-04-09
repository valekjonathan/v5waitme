import { useEffect, useRef, useState } from 'react'
import { colors } from '../../design/colors'
import ScreenShell from '../../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../../ui/layout/layout'
import MessageCircleIcon from '../../ui/icons/MessageCircleIcon'
import StreetSearch from '../parking/waitme/StreetSearch.jsx'
import UserAlertCard from '../parking/waitme/UserAlertCard.jsx'
import ChatThreadView from './ChatThreadView.jsx'
import { useAuth } from '../../lib/AuthContext'
import { parseChatPeerFromHash, takePendingDmPeerUserId } from '../../lib/waitmeDmPending.js'
import { useAppScreen } from '../../lib/AppScreenContext'
import { isSupabaseConfigured } from '../../services/supabase.js'
import { isRealSupabaseAuthUid } from '../../services/authUid.js'
import {
  getOrCreateDmThread,
  isDmDevFallbackThread,
  listDmThreadsForUser,
} from '../../services/waitmeChats.js'

const BG = colors.background
const shellStyle = { backgroundColor: BG }

function clearChatHashFromUrl() {
  if (typeof window !== 'undefined' && window.location.hash.startsWith('#/chat/')) {
    const { pathname, search } = window.location
    window.history.replaceState(null, '', pathname + search)
  }
}

async function fetchThreadsForUser(uid) {
  const { data, error } = await listDmThreadsForUser(uid)
  if (error) return { list: [], error }
  return { list: Array.isArray(data) ? data : [], error: null }
}

/**
 * @param {{
 *   peerUserId: string
 *   userId: string
 *   listFetchSeqRef: { current: number }
 *   setThreads: (v: unknown[]) => void
 *   setFetchError: (v: unknown) => void
 *   openThreadById: (tid: string) => void
 *   logTag: string
 *   isCancelled: () => boolean
 * }} p
 */
async function runGetOrCreateThenList(p) {
  const seq = ++p.listFetchSeqRef.current
  const { data: tid, error } = await getOrCreateDmThread(p.peerUserId)
  if (p.isCancelled() || seq !== p.listFetchSeqRef.current) return
  if (error) {
    console.error(`[WaitMe][Chats] getOrCreateDmThread (${p.logTag})`, error)
    return
  }
  if (!tid) return
  const { list, error: listErr } = await fetchThreadsForUser(p.userId)
  if (p.isCancelled() || seq !== p.listFetchSeqRef.current) return
  if (listErr) {
    p.setFetchError(listErr)
    p.setThreads([])
    return
  }
  p.setThreads(list)
  p.setFetchError(null)
  p.openThreadById(String(tid))
}

export default function ChatsPage() {
  const nav = useAppScreen()
  const { user } = useAuth()
  const [threadId, setThreadId] = useState(null)
  const [listFilter, setListFilter] = useState('')
  const [threads, setThreads] = useState([])
  const [fetchError, setFetchError] = useState(null)
  /** Evita que dos `listDmThreadsForUser` concurrentes pisen la lista (orden de respuesta). */
  const listFetchSeqRef = useRef(0)

  const userId = user?.id ?? ''
  const dev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  const hasRealSupabaseSession = isSupabaseConfigured() && isRealSupabaseAuthUid(userId)
  const canLoadChats = Boolean(dev || hasRealSupabaseSession)

  const hashPeer = parseChatPeerFromHash()
  const pendingVis = nav.pendingDmVisual
  const directMatch = Boolean(hashPeer && pendingVis && pendingVis.peerId === hashPeer)

  function openThreadById(tid) {
    const s = String(tid ?? '').trim()
    if (!s) return
    setThreadId(s)
  }

  useEffect(() => {
    let cancelled = false
    if (!canLoadChats) {
      setThreads([])
      setFetchError(null)
      return undefined
    }
    setFetchError(null)
    const seq = ++listFetchSeqRef.current
    void (async () => {
      const { list, error } = await fetchThreadsForUser(userId)
      if (cancelled || seq !== listFetchSeqRef.current) return
      if (error) {
        setFetchError(error)
        setThreads([])
      } else {
        setThreads(list)
        setFetchError(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [canLoadChats, userId])

  useEffect(() => {
    if (fetchError) return
    nav.syncChatUnreadFromThreads?.(threads)
  }, [nav, threads, fetchError])

  useEffect(() => {
    if (!nav?.chatsListResetGeneration) return
    setThreadId(null)
    nav.clearPendingDmVisual?.()
  }, [nav?.chatsListResetGeneration, nav])

  /** Si el hilo ya no está en la lista (datos reales), no dejar threadId colgado. */
  useEffect(() => {
    if (!threadId) return
    if (threads.length === 0) return
    const ok = threads.some((t) => String(t.threadId) === String(threadId))
    if (!ok) setThreadId(null)
  }, [threadId, threads])

  /** Mapa → chat con snapshot: un RPC y lista actualizada; fila activa sale del mapper. */
  useEffect(() => {
    if (!canLoadChats || !directMatch || !hashPeer) return undefined
    let cancelled = false
    void runGetOrCreateThenList({
      peerUserId: hashPeer,
      userId,
      listFetchSeqRef,
      setThreads,
      setFetchError,
      openThreadById,
      logTag: 'direct',
      isCancelled: () => cancelled,
    })
    return () => {
      cancelled = true
    }
  }, [canLoadChats, directMatch, hashPeer, userId])

  /** Hash o peer pendiente en sessionStorage: mismo flujo — lista del mapper, sin objetos armados aquí. */
  useEffect(() => {
    if (!canLoadChats) return undefined
    const peerFromHash = parseChatPeerFromHash()
    const peer = peerFromHash ?? takePendingDmPeerUserId()
    if (!peer) return undefined
    if (nav.pendingDmVisual?.peerId === peer) return undefined

    let cancelled = false
    void runGetOrCreateThenList({
      peerUserId: peer,
      userId,
      listFetchSeqRef,
      setThreads,
      setFetchError,
      openThreadById,
      logTag: 'bootstrap',
      isCancelled: () => cancelled,
    })
    return () => {
      cancelled = true
    }
  }, [canLoadChats, userId, nav.pendingDmVisual])

  const q = listFilter.trim().toLowerCase()
  const filteredThreads = !q
    ? threads
    : threads.filter((t) => `${t.name} ${t.lastMessage}`.toLowerCase().includes(q))

  const activeSummary = threadId
    ? filteredThreads.find((t) => String(t.threadId) === String(threadId)) ??
      threads.find((t) => String(t.threadId) === String(threadId)) ??
      null
    : null

  function handleBackFromThread() {
    setThreadId(null)
    nav.clearPendingDmVisual?.()
    clearChatHashFromUrl()
  }

  if (threadId && activeSummary) {
    const tid = String(activeSummary.threadId).trim()
    const localFb = isDmDevFallbackThread(tid)
    return (
      <ChatThreadView
        summary={activeSummary}
        userId={userId}
        localFallback={localFb}
        onBack={handleBackFromThread}
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
            placeholderMuted
            enableSuggestions={false}
            onQueryChange={(query) => setListFilter(query)}
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
          {canLoadChats && fetchError && threads.length === 0 ? (
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

          {!fetchError && filteredThreads.length === 0 ? (
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
                {threads.length === 0 ? 'No hay conversaciones' : 'No hay conversaciones que coincidan'}
              </p>
            </div>
          ) : null}

          {!fetchError && filteredThreads.length > 0
            ? filteredThreads.map((t) => {
                const threadKey = String(t.threadId).trim()
                return (
                  <div
                    key={threadKey}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      if (
                        e.target.closest(
                          '[data-waitme-chat-avatar-reviews], [data-waitme-chat-name-reviews]'
                        )
                      ) {
                        return
                      }
                      if (e.target.closest('[data-waitme-chat-delete]')) return
                      if (!threadKey) return
                      openThreadById(threadKey)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        if (!threadKey) return
                        openThreadById(threadKey)
                      }
                    }}
                    style={{ cursor: 'pointer', flexShrink: 0 }}
                  >
                    <UserAlertCard
                      user={t}
                      isChat
                      lastMessage={t.lastMessage}
                      time={t.time}
                      isEmpty={false}
                      onBuyAlert={() => {}}
                      onChat={() => openThreadById(threadKey)}
                      onCall={() => {}}
                    />
                  </div>
                )
              })
            : null}
        </div>
      </div>
    </ScreenShell>
  )
}
