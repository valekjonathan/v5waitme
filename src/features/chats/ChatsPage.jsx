import { useCallback, useEffect, useState } from 'react'
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
  getOrCreateDmThread,
  isDmDevFallbackThread,
  listDmThreadsForUser,
  WAITME_PENDING_THREAD_ID,
} from '../../services/waitmeChats.js'
import { generateReviewsForEntityId, getAverage } from '../../lib/reviewsModel'

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
  /** Evita mensaje «vacío» antes del primer fetch; el fetch no bloquea el primer paint. */
  const [threadsReady, setThreadsReady] = useState(false)
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

  function openThread(id) {
    const sid = String(id ?? '')
    if (!sid) return
    setThreadId(sid)
  }

  const load = useCallback(async () => {
    if (!canLoadChats) {
      setThreads([])
      setLoadError(null)
      setThreadsReady(true)
      return
    }
    setLoadError(null)
    const { data, error } = await listDmThreadsForUser(userId)
    if (error) {
      setLoadError(error)
      setThreads([])
    } else {
      setThreads(Array.isArray(data) ? data : [])
      setLoadError(null)
    }
    setThreadsReady(true)
  }, [canLoadChats, userId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!threadsReady || loadError) return
    nav.syncChatUnreadFromThreads?.(threads)
  }, [nav, threads, threadsReady, loadError])

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
        const row = list.find((t) => t.threadId === tid)
        displayName = String(row?.name ?? '').trim()
        if (!userPhoto && row?.user_photo) userPhoto = String(row.user_photo).trim() || null
      }
      if (cancelled) return

      const bootstrapReviews = generateReviewsForEntityId(peer)
      const summary = {
        threadId: tid,
        /** Siempre peer UUID (reseñas / tarjeta); el hilo va en threadId. */
        id: peer,
        name: displayName,
        user_name: displayName,
        snapshot_user_name: displayName,
        reviews: bootstrapReviews,
        rating: getAverage(bootstrapReviews),
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
      setThreadId(String(tid))
      void load()
    })()
    return () => {
      cancelled = true
    }
  }, [canLoadChats, load, userId, nav.pendingDmVisual])

  const q = listFilter.trim().toLowerCase()
  const filteredThreads = !q
    ? threads
    : threads.filter((t) => `${t.name} ${t.lastMessage}`.toLowerCase().includes(q))

  const fromListForActive =
    filteredThreads.find((t) => t.threadId === threadId) ??
    threads.find((t) => t.threadId === threadId) ??
    null
  const activeSummary =
    fromListForActive ??
    (threadId && resolvedBootstrapSummary && resolvedBootstrapSummary.threadId === threadId
      ? resolvedBootstrapSummary
      : null)

  let directThreadSummary = null
  if (directMatch && pendingVis && hashPeer) {
    const tid = resolvedDirectThreadId
    const snap = String(pendingVis.userName ?? pendingVis.displayName ?? '').trim()
    const directReviews = generateReviewsForEntityId(hashPeer)
    directThreadSummary = {
      threadId: tid ?? WAITME_PENDING_THREAD_ID,
      id: hashPeer,
      name: snap,
      user_name: snap,
      snapshot_user_name: snap,
      peerUserId: hashPeer,
      user_photo: pendingVis.userPhoto,
      phone: pendingVis.phone,
      allow_phone_calls: pendingVis.allowPhoneCalls,
      reviews: directReviews,
      rating: getAverage(directReviews),
      lastMessage: '',
      time: '',
      brand: '',
      model: '',
      plate: '',
      unreadCount: 0,
    }
  }

  function handleBackFromThread() {
    setResolvedBootstrapSummary(null)
    setResolvedDirectThreadId(null)
    setThreadId(null)
    nav.clearPendingDmVisual?.()
    clearChatHashFromUrl()
  }

  const showDirectThread = Boolean(directMatch && directThreadSummary)
  const showListThread = Boolean(!showDirectThread && activeSummary && threadId)

  if (showDirectThread || showListThread) {
    const summary = showDirectThread ? directThreadSummary : activeSummary
    const tid = String(summary?.threadId ?? '')
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
          {canLoadChats && loadError && threadsReady && threads.length === 0 ? (
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

          {threadsReady && !loadError && filteredThreads.length === 0 ? (
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
            ? filteredThreads.map((t) => {
                return (
                  <div
                    key={String(t.threadId)}
                    role="button"
                    tabIndex={0}
                    onClick={() => openThread(t.threadId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openThread(t.threadId)
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
                      onChat={() => openThread(t.threadId)}
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
