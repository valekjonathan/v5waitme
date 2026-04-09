import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { getProfile } from '../../services/profile.js'
import {
  dmListCardToAlert,
  getOrCreateDmThread,
  isDmDevFallbackThread,
  listDmThreadsForUser,
  WAITME_PENDING_THREAD_ID,
} from '../../services/waitmeChats.js'

const BG = colors.background
const shellStyle = { backgroundColor: BG }

function clearChatHashFromUrl() {
  if (typeof window !== 'undefined' && window.location.hash.startsWith('#/chat/')) {
    const { pathname, search } = window.location
    window.history.replaceState(null, '', pathname + search)
  }
}

export default function ChatsPage() {
  const nav = useAppScreen()
  const { user } = useAuth()
  const [threadId, setThreadId] = useState(null)
  const [listFilter, setListFilter] = useState('')
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  /** Solo ruta sin snapshot de tarjeta (hash/bookmark). */
  const [resolvedBootstrapSummary, setResolvedBootstrapSummary] = useState(null)
  /** UUID real del hilo cuando abrimos desde tarjeta (tras RPC). */
  const [resolvedDirectThreadId, setResolvedDirectThreadId] = useState(null)

  const userId = user?.id ?? ''
  const dev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  const hasRealSupabaseSession = isSupabaseConfigured() && isRealSupabaseAuthUid(userId)
  const canLoadChats = Boolean(dev || hasRealSupabaseSession)

  const hashPeer = parseChatPeerFromHash()
  const pendingVis = nav.pendingDmVisual
  const directMatch = Boolean(hashPeer && pendingVis && pendingVis.peerId === hashPeer)

  const openThread = useCallback(
    (id) => {
      const sid = String(id ?? '')
      if (!sid) return
      setThreadId(sid)
    },
    []
  )

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
    if (loading || loadError) return
    nav.syncChatUnreadFromThreads?.(threads)
  }, [nav, threads, loading, loadError])

  useEffect(() => {
    if (!nav?.chatsListResetGeneration) return
    setResolvedBootstrapSummary(null)
    setResolvedDirectThreadId(null)
    setThreadId(null)
    nav.clearPendingDmVisual?.()
  }, [nav?.chatsListResetGeneration, nav])

  /** Desde tarjeta mapa: un solo RPC en segundo plano; el hilo ya se muestra con snapshot. */
  useEffect(() => {
    if (!canLoadChats || !directMatch || !hashPeer) return
    let cancelled = false
    void (async () => {
      const { data: tid, error } = await getOrCreateDmThread(hashPeer)
      if (cancelled) return
      if (error) {
        console.error('[WaitMe][Chats] getOrCreateDmThread (direct)', error)
        return
      }
      if (tid) setResolvedDirectThreadId(tid)
      void load()
    })()
    return () => {
      cancelled = true
    }
  }, [canLoadChats, directMatch, hashPeer, load])

  /** Hash/pending sin snapshot (p. ej. enlace guardado): relleno tras red. */
  useEffect(() => {
    if (!canLoadChats) return
    const peer = parseChatPeerFromHash() ?? takePendingDmPeerUserId()
    if (!peer) return
    if (nav.pendingDmVisual?.peerId === peer) return

    let cancelled = false
    void (async () => {
      const { data: tid, error } = await getOrCreateDmThread(peer)
      if (cancelled) return
      if (error) {
        console.error('[WaitMe][Chats] getOrCreateDmThread', error)
        return
      }
      if (!tid) return

      let displayName = ''
      let userPhoto = null
      const { data: prof } = await getProfile(peer)
      if (cancelled) return
      displayName = String(prof?.full_name ?? '').trim()
      userPhoto = prof?.avatar_url != null ? String(prof.avatar_url).trim() || null : null
      if (!displayName) {
        const listResult = await listDmThreadsForUser(userId)
        const list = Array.isArray(listResult.data) ? listResult.data : []
        const row = list.find((t) => t.id === tid)
        displayName = String(row?.name ?? '').trim()
        if (!userPhoto && row?.user_photo) userPhoto = String(row.user_photo).trim() || null
      }
      if (cancelled) return

      const summary = {
        id: tid,
        name: displayName,
        rating: 4,
        lastMessage: '',
        time: '',
        brand: '',
        model: '',
        plate: '',
        peerUserId: peer,
        user_photo: userPhoto,
        unreadCount: 0,
        phone: null,
        allow_phone_calls: false,
      }
      setResolvedBootstrapSummary(summary)
      openThread(tid)
      void load()
    })()
    return () => {
      cancelled = true
    }
  }, [canLoadChats, load, openThread, userId, nav.pendingDmVisual])

  const filteredThreads = useMemo(() => {
    const q = listFilter.trim().toLowerCase()
    if (!q) return threads
    return threads.filter((t) => `${t.name} ${t.lastMessage}`.toLowerCase().includes(q))
  }, [listFilter, threads])

  const activeSummary = useMemo(() => {
    const fromList =
      filteredThreads.find((t) => t.id === threadId) ?? threads.find((t) => t.id === threadId) ?? null
    if (fromList) return fromList
    if (
      threadId &&
      resolvedBootstrapSummary &&
      resolvedBootstrapSummary.id === threadId
    ) {
      return resolvedBootstrapSummary
    }
    return null
  }, [filteredThreads, resolvedBootstrapSummary, threadId, threads])

  const directThreadSummary = useMemo(() => {
    if (!directMatch || !pendingVis || !hashPeer) return null
    const tid = resolvedDirectThreadId
    return {
      id: tid ?? WAITME_PENDING_THREAD_ID,
      name: pendingVis.displayName,
      peerUserId: hashPeer,
      user_photo: pendingVis.userPhoto,
      phone: pendingVis.phone,
      allow_phone_calls: pendingVis.allowPhoneCalls,
      rating: 4,
      lastMessage: '',
      time: '',
      brand: '',
      model: '',
      plate: '',
      unreadCount: 0,
    }
  }, [directMatch, pendingVis, hashPeer, resolvedDirectThreadId])

  const handleBackFromThread = useCallback(() => {
    setResolvedBootstrapSummary(null)
    setResolvedDirectThreadId(null)
    setThreadId(null)
    nav.clearPendingDmVisual?.()
    clearChatHashFromUrl()
  }, [nav])

  const showDirectThread = Boolean(directMatch && directThreadSummary)
  const showListThread = Boolean(!showDirectThread && activeSummary && threadId)

  if (showDirectThread || showListThread) {
    const summary = showDirectThread ? directThreadSummary : activeSummary
    const tid = String(summary?.id ?? '')
    const localFb = isDmDevFallbackThread(tid)
    return (
      <ChatThreadView
        summary={summary}
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
          {canLoadChats && loading && threads.length === 0 ? (
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

          {canLoadChats && loadError && !loading && threads.length === 0 ? (
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

          {!loadError && filteredThreads.length > 0
            ? filteredThreads.map((t) => (
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openThread(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openThread(t.id)
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
                    onChat={() => openThread(t.id)}
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
