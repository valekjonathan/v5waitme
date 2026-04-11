import { useEffect, useRef, useState } from 'react'
import { colors } from '../../design/colors'
import MessageCircleIcon from '../../ui/icons/MessageCircleIcon'
import StreetSearch from '../parking/waitme/StreetSearch.jsx'
import UserAlertCard from '../parking/waitme/UserAlertCard.jsx'
import { useAuth } from '../../lib/AuthContext'
import { parseChatPeerFromHash, takePendingDmPeerUserId } from '../../lib/waitmeDmPending.js'
import { useAppScreen } from '../../lib/AppScreenContext'
import { EmbeddedShellContent } from '../../lib/AuthenticatedOverlayEmbeddedContext.jsx'
import { isSupabaseConfigured } from '../../services/supabase.js'
import { isRealSupabaseAuthUid } from '../../services/authUid.js'
import {
  getDevDmThreadsListSnapshotSync,
  getOrCreateDmThread,
  listDmThreadsForUser,
} from '../../services/waitmeChats.js'

function loadThreads(uid) {
  return listDmThreadsForUser(uid).then(({ data, error }) => {
    if (error) return []
    return Array.isArray(data) ? data : []
  })
}

/**
 * Evita pisar una lista ya mostrada con `[]` por error, carrera o respuesta vacía transitoria.
 * `allowEmptyOverwrite`: cuando cambia el usuario autenticado, sí aceptar `[]` como estado válido.
 */
function mergeThreadList(prev, next, opts) {
  const allowEmptyOverwrite = opts?.allowEmptyOverwrite === true
  const p = Array.isArray(prev) ? prev : []
  const n = Array.isArray(next) ? next : []
  if (n.length > 0) return n
  if (allowEmptyOverwrite) return n
  if (p.length > 0) return p
  return n
}

/**
 * @param {{
 *   peerUserId: string
 *   userId: string
 *   listFetchSeqRef: { current: number }
 *   setThreads: (v: unknown[]) => void
 *   syncChatThreadList: ((list: unknown[]) => void) | undefined
 *   openThread: (tid: string, listSnapshot?: unknown[]) => void
 *   logTag: string
 *   isCancelled: () => boolean
 * }} p
 */
/**
 * @param {{ getChatThreadListSnapshot?: () => unknown[] }} nav
 */
function createInitialThreads(nav) {
  const snap = nav.getChatThreadListSnapshot?.()
  if (Array.isArray(snap) && snap.length > 0) return [...snap]
  const dev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  if (dev) {
    const fb = getDevDmThreadsListSnapshotSync()
    if (Array.isArray(fb) && fb.length > 0) return fb
  }
  return []
}

async function runGetOrCreateThenList(p) {
  const seq = ++p.listFetchSeqRef.current
  const { data: tid, error } = await getOrCreateDmThread(p.peerUserId)
  if (p.isCancelled() || seq !== p.listFetchSeqRef.current) return
  if (error) {
    console.error(`[WaitMe][Chats] getOrCreateDmThread (${p.logTag})`, error)
    return
  }
  if (tid == null || tid === '') return
  const list = await loadThreads(p.userId)
  if (p.isCancelled() || seq !== p.listFetchSeqRef.current) return
  let merged = list
  p.setThreads((prev) => {
    merged = mergeThreadList(prev, list, { allowEmptyOverwrite: false })
    return merged
  })
  p.syncChatThreadList?.(merged)
  p.openThread(String(tid), merged)
}

export default function ChatsPage() {
  const nav = useAppScreen()
  const { user } = useAuth()
  const [listFilter, setListFilter] = useState('')
  const [threads, setThreads] = useState(() => createInitialThreads(nav))
  const listFetchSeqRef = useRef(0)
  const lastThreadsUserIdRef = useRef(/** @type {string} */ (''))
  /** Lista local lista (fetch propio o skip si ya vino del NavigationContext). */
  const threadsListLoadDoneRef = useRef(false)

  const userId = user?.id ?? ''
  const dev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  const hasRealSupabaseSession = isSupabaseConfigured() && isRealSupabaseAuthUid(userId)
  const hasUser = Boolean(userId)
  const canUseSupabaseDm = Boolean(dev || hasRealSupabaseSession)

  const hashPeer = parseChatPeerFromHash()
  const pendingVis = nav.pendingDmVisual
  const directMatch = Boolean(hashPeer && pendingVis && pendingVis.peerId === hashPeer)

  useEffect(() => {
    if (!hasUser) {
      nav.syncChatThreadList?.(threads)
      return
    }
    const snap = nav.getChatThreadListSnapshot?.()
    const snapLen = Array.isArray(snap) ? snap.length : 0
    const globalReady = nav.chatThreadListFetchedForUserId === userId
    if (threads.length === 0 && snapLen > 0) return
    if (!globalReady && !threadsListLoadDoneRef.current && threads.length === 0) return
    nav.syncChatThreadList?.(threads)
  }, [nav, threads, hasUser, userId, nav.chatThreadListFetchedForUserId])

  useEffect(() => {
    const epoch = nav.chatThreadListEpoch ?? 0
    if (!epoch) return
    const snap = nav.getChatThreadListSnapshot?.()
    if (!Array.isArray(snap) || snap.length === 0) return
    setThreads((prev) => (prev.length > 0 ? prev : [...snap]))
    threadsListLoadDoneRef.current = true
  }, [nav, nav.chatThreadListEpoch])

  useEffect(() => {
    let cancelled = false
    if (!hasUser) {
      threadsListLoadDoneRef.current = true
      return undefined
    }
    const priorUserId = lastThreadsUserIdRef.current
    const switchedUser = priorUserId !== userId
    if (switchedUser) {
      threadsListLoadDoneRef.current = false
    }
    lastThreadsUserIdRef.current = userId

    if (nav.chatThreadListFetchedForUserId === userId && userId !== '') {
      threadsListLoadDoneRef.current = true
      return () => {
        cancelled = true
      }
    }

    const seq = ++listFetchSeqRef.current
    void loadThreads(userId).then((rows) => {
      if (cancelled || seq !== listFetchSeqRef.current) return
      threadsListLoadDoneRef.current = true
      setThreads((prev) => mergeThreadList(prev, rows, { allowEmptyOverwrite: switchedUser }))
    })
    return () => {
      cancelled = true
    }
  }, [hasUser, userId, nav.chatThreadListFetchedForUserId])

  useEffect(() => {
    nav.syncChatUnreadFromThreads?.(threads)
  }, [nav, threads])

  useEffect(() => {
    if (!nav?.chatsListResetGeneration) return
    nav.clearPendingDmVisual?.()
  }, [nav?.chatsListResetGeneration, nav])

  useEffect(() => {
    if (!canUseSupabaseDm || !directMatch || !hashPeer) return undefined
    let cancelled = false
    void runGetOrCreateThenList({
      peerUserId: hashPeer,
      userId,
      listFetchSeqRef,
      setThreads,
      syncChatThreadList: nav.syncChatThreadList,
      openThread: nav.openThread,
      logTag: 'direct',
      isCancelled: () => cancelled,
    })
    return () => {
      cancelled = true
    }
  }, [canUseSupabaseDm, directMatch, hashPeer, userId, nav.openThread, nav.syncChatThreadList])

  useEffect(() => {
    if (!canUseSupabaseDm) return undefined
    const peerFromHash = parseChatPeerFromHash()
    const peer = peerFromHash ?? takePendingDmPeerUserId()
    if (peer == null || peer === '') return undefined
    if (nav.pendingDmVisual?.peerId === peer) return undefined

    let cancelled = false
    void runGetOrCreateThenList({
      peerUserId: peer,
      userId,
      listFetchSeqRef,
      setThreads,
      syncChatThreadList: nav.syncChatThreadList,
      openThread: nav.openThread,
      logTag: 'bootstrap',
      isCancelled: () => cancelled,
    })
    return () => {
      cancelled = true
    }
  }, [canUseSupabaseDm, userId, nav.pendingDmVisual, nav.openThread, nav.syncChatThreadList])

  const threadsSafe = Array.isArray(threads) ? threads : []

  const q = listFilter.trim().toLowerCase()
  const filteredThreads = !q
    ? threadsSafe
    : threadsSafe.filter((t) => `${t.name} ${t.lastMessage}`.toLowerCase().includes(q))

  const listRows = filteredThreads.filter(
    (t) => t.threadId != null && String(t.threadId).trim() !== ''
  )

  function openThreadFromList(threadKey) {
    if (threadKey == null || threadKey === '') return
    nav.openThread(String(threadKey), threadsSafe)
  }

  const inner = (
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
        {listRows.map((t) => {
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
                if (threadKey === '') return
                openThreadFromList(threadKey)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (threadKey === '') return
                  openThreadFromList(threadKey)
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
                onChat={() => openThreadFromList(threadKey)}
                onCall={() => {}}
              />
            </div>
          )
        })}

        {listRows.length === 0 ? (
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
              {threadsSafe.length === 0 ? 'No hay conversaciones' : 'No hay conversaciones que coincidan'}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )

  /** `ScreenShell` global vive en `App.jsx` (`AuthenticatedRoutes`); aquí solo el slot de contenido. */
  return <EmbeddedShellContent>{inner}</EmbeddedShellContent>
}
