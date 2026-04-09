import { useEffect, useRef, useState } from 'react'
import { useAppScreen } from '../../lib/AppScreenContext'
import { colors } from '../../design/colors'
import { radius } from '../../design/radius'
import ScreenShell from '../../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../../ui/layout/layout'
import Button from '../../ui/Button'
import InputBase from '../../ui/InputBase'
import { IconChevronLeft } from '../parking/waitme/icons.jsx'
import { WaitmeCardNavigateButton, WaitmeCardPhoneButton } from '../parking/waitme/UserAlertCardActions.jsx'
import { supabase, isSupabaseConfigured } from '../../services/supabase.js'
import { isRealSupabaseAuthUid } from '../../services/authUid.js'
import {
  fetchDmMessages,
  formatDmMsgTime,
  isWaitmePendingThreadId,
  sendDmMessage,
} from '../../services/waitmeChats.js'
import { useAuth } from '../../lib/AuthContext'

const BG = colors.background
const shellStyle = { backgroundColor: BG }

/** Gap entre burbujas (8–12px). */
const MESSAGE_GAP = 10

const bubbleShared = {
  maxWidth: '70%',
  padding: '10px 14px',
  fontSize: 15,
  lineHeight: 1.35,
  wordBreak: 'break-word',
  boxSizing: 'border-box',
  borderRadius: 16,
}

const inputActionBtnStyle = {
  width: 44,
  height: 44,
  borderRadius: radius.large,
  border: `1px solid ${colors.border}`,
  background: colors.surfaceMuted,
  color: colors.textPrimary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  padding: 0,
  cursor: 'pointer',
  boxSizing: 'border-box',
}

const attachMenuItemStyle = {
  width: '100%',
  textAlign: 'left',
  padding: '10px 12px',
  borderRadius: 10,
  border: 'none',
  background: 'transparent',
  color: colors.textPrimary,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
}

function pravatarImgIdFromString(s) {
  let h = 0
  const str = String(s || 'user')
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return (h % 70) + 1
}

function nextTempId() {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * @param {{ summary: Record<string, unknown>, userId: string, onBack: () => void, localFallback?: boolean }} props
 */
export default function ChatThreadView({ summary, userId, onBack, localFallback = false }) {
  const s = summary && typeof summary === 'object' ? summary : {}
  /** Solo `threadId` del hilo; nunca mezclar con `id` (peer en tarjetas). */
  const threadId = String(s.threadId ?? '').trim()
  const threadPending = isWaitmePendingThreadId(threadId)
  const peerIdStr = String(s.peer_user_id ?? '').trim()
  const displayName = String(s.snapshot_user_name ?? s.user_name ?? s.name ?? '').trim()
  const peerPhotoUploaded = String(s.user_photo ?? '').trim()
  const peerAvatar =
    peerPhotoUploaded ||
    `https://i.pravatar.cc/150?img=${pravatarImgIdFromString(displayName || peerIdStr || threadId)}`
  const peerPhone = String(s.phone ?? '').trim()
  const headerCallEnabled = Boolean(peerPhone && s.allow_phone_calls !== false)
  const { openUserReviews } = useAppScreen()
  const auth = useAuth()
  const meta =
    auth?.user?.user_metadata && typeof auth.user.user_metadata === 'object' ? auth.user.user_metadata : {}
  const myAvatarUrl =
    String(auth?.profile?.avatar_url ?? '').trim() || String(meta.avatar_url ?? meta.picture ?? '').trim()
  const myAvatarFallback = `https://i.pravatar.cc/150?img=${pravatarImgIdFromString(userId || 'me')}`
  const myAvatar = myAvatarUrl || myAvatarFallback

  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [attachOpen, setAttachOpen] = useState(false)
  const [attachPreviewUrl, setAttachPreviewUrl] = useState(null)
  const [bootError, setBootError] = useState(null)
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)
  const scrollRef = useRef(null)
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)

  const separatorLabel = 'Hoy'

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  useEffect(() => {
    return () => {
      if (attachPreviewUrl) URL.revokeObjectURL(attachPreviewUrl)
    }
  }, [attachPreviewUrl])

  function onAttachImageChosen(e) {
    const input = e.target
    const f = input.files?.[0]
    input.value = ''
    if (!f || !String(f.type ?? '').startsWith('image/')) return
    setAttachPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(f)
    })
    setAttachOpen(false)
  }

  function clearAttachPreview() {
    setAttachPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  useEffect(() => {
    let cancelled = false
    if (!threadId) {
      setMessages([])
      setBootError(null)
      return undefined
    }
    if (isWaitmePendingThreadId(threadId)) {
      setMessages([])
      setBootError(null)
      return undefined
    }
    if (!localFallback && !isRealSupabaseAuthUid(userId)) {
      setMessages([])
      setBootError(null)
      return undefined
    }
    void (async () => {
      const { data, error } = await fetchDmMessages(userId, threadId)
      if (cancelled) return
      if (error) {
        setMessages([])
        setBootError(error)
        return
      }
      setBootError(null)
      setMessages(Array.isArray(data) ? data : [])
    })()
    return () => {
      cancelled = true
    }
  }, [threadId, userId, localFallback])

  useEffect(() => {
    if (
      localFallback ||
      isWaitmePendingThreadId(threadId) ||
      !isSupabaseConfigured() ||
      !supabase ||
      !threadId ||
      !isRealSupabaseAuthUid(userId)
    ) {
      return undefined
    }
    const filter = `thread_id=eq.${threadId}`
    const ch = supabase
      .channel(`waitme-dm-${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'waitme_dm_messages', filter },
        (payload) => {
          const row = payload.new
          if (!row || row.thread_id !== threadId) return
          setMessages((prev) => {
            const mid = row.id
            if (prev.some((m) => m.id === mid)) return prev
            const mine = row.sender_id === userId
            return [
              ...prev,
              {
                id: mid,
                from: mine ? 'me' : 'them',
                text: String(row.body ?? ''),
                at: formatDmMsgTime(row.created_at ? String(row.created_at) : ''),
              },
            ]
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(ch)
    }
  }, [threadId, userId, localFallback])

  async function sendMine() {
    const t = draft.trim()
    if (!t || sending || !threadId || isWaitmePendingThreadId(threadId)) return
    if (!localFallback && !isRealSupabaseAuthUid(userId)) return
    setDraft('')
    setSending(true)
    setAttachOpen(false)
    const optimistic = {
      id: nextTempId(),
      from: 'me',
      text: t,
      at: formatDmMsgTime(new Date().toISOString()),
    }
    setMessages((prev) => [...prev, optimistic])
    const { data, error } = await sendDmMessage(userId, threadId, t)
    if (error) {
      console.error('[WaitMe][ChatThreadView] send', error)
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setDraft(t)
    } else if (data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...data, id: data.id } : m))
      )
    }
    setSending(false)
  }

  function isReadSimulated(idx) {
    for (let i = idx + 1; i < messages.length; i++) {
      if (messages[i]?.from === 'them') return true
    }
    return false
  }

  return (
    <ScreenShell style={shellStyle} mainMode={SCREEN_SHELL_MAIN_MODE.INSET} mainOverflow="hidden">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          width: '100%',
          backgroundColor: BG,
        }}
      >
        <header
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 4px 10px',
            borderBottom: `1px solid ${colors.border}`,
            backgroundColor: BG,
          }}
        >
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver"
            style={{
              border: 'none',
              background: 'transparent',
              color: colors.primary,
              padding: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconChevronLeft size={22} />
          </button>
          <button
            type="button"
            aria-label="Ver reseñas"
            onClick={() => {
              if (peerIdStr) openUserReviews(peerIdStr)
            }}
            style={{
              padding: 0,
              margin: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              flexShrink: 0,
              lineHeight: 0,
            }}
          >
            <img
              src={peerAvatar}
              alt=""
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: '1px solid rgba(139,92,246,0.5)',
                objectFit: 'cover',
                boxSizing: 'border-box',
                display: 'block',
              }}
            />
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            {displayName ? (
              <div style={{ fontWeight: 800, fontSize: 17, color: colors.textPrimary }}>{displayName}</div>
            ) : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <WaitmeCardPhoneButton enabled={headerCallEnabled} phone={peerPhone} />
            <WaitmeCardNavigateButton enabled={false} onClick={() => {}} />
          </div>
        </header>

        {bootError ? (
          <div
            style={{
              flexShrink: 0,
              padding: 12,
              fontSize: 13,
              fontWeight: 600,
              color: colors.textMuted,
              textAlign: 'center',
            }}
          >
            No se pudieron cargar los mensajes.
          </div>
        ) : null}

        {/* Cuerpo: lista scroll + barra fija abajo (tipo WhatsApp) */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
          }}
        >
          <div
            data-waitme-chat-scroll
            ref={scrollRef}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              display: 'flex',
              flexDirection: 'column',
              gap: MESSAGE_GAP,
              padding: '8px 12px 12px',
              boxSizing: 'border-box',
            }}
          >
            {messages.length > 0 ? (
              <div
                aria-hidden
                style={{
                  textAlign: 'center',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.4)',
                  margin: '12px 0',
                  flexShrink: 0,
                }}
              >
                {separatorLabel}
              </div>
            ) : null}

            {messages.map((m, idx) => {
              const mine = m.from === 'me'
              const read = mine ? isReadSimulated(idx) : false
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    justifyContent: mine ? 'flex-end' : 'flex-start',
                    alignItems: 'flex-end',
                    width: '100%',
                    flexShrink: 0,
                    gap: 8,
                  }}
                >
                  {!mine ? (
                    <img
                      src={peerAvatar}
                      alt=""
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        border: '1px solid rgba(139,92,246,0.5)',
                        flexShrink: 0,
                        objectFit: 'cover',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : null}
                  <div
                    style={{
                      ...bubbleShared,
                      backgroundColor: mine ? colors.primaryStrong : colors.surfaceMuted,
                      color: colors.textPrimary,
                      border: mine ? 'none' : `1px solid ${colors.border}`,
                      position: 'relative',
                      paddingBottom: mine ? 22 : undefined,
                    }}
                  >
                    {m.text}
                    <div
                      style={{
                        position: mine ? 'absolute' : 'static',
                        right: mine ? 10 : undefined,
                        bottom: mine ? 6 : undefined,
                        fontSize: 11,
                        opacity: 0.75,
                        marginTop: mine ? 0 : 4,
                        display: 'flex',
                        justifyContent: mine ? 'flex-end' : 'flex-start',
                        gap: 4,
                        alignItems: 'center',
                      }}
                    >
                      <span>{m.at}</span>
                      {mine ? (
                        <span
                          aria-hidden
                          style={{
                            width: 16,
                            height: 16,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: 2,
                            color: read ? '#22c55e' : 'rgba(255,255,255,0.5)',
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            {read ? (
                              <>
                                <path d="M3 12l4 4L17 6" />
                                <path d="M7 12l4 4L21 6" />
                              </>
                            ) : (
                              <path d="M5 12l4 4L19 6" />
                            )}
                          </svg>
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {mine ? (
                    <img
                      src={myAvatar}
                      alt=""
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        border: '1px solid rgba(139,92,246,0.5)',
                        flexShrink: 0,
                        objectFit: 'cover',
                        boxSizing: 'border-box',
                        marginLeft: 0,
                      }}
                    />
                  ) : null}
                </div>
              )
            })}
            <div ref={endRef} style={{ flexShrink: 0, width: '100%', height: 1 }} aria-hidden />
          </div>

          <div
            style={{
              flexShrink: 0,
              width: '100%',
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              borderTop: `1px solid ${colors.border}`,
              backgroundColor: BG,
              boxSizing: 'border-box',
              position: 'relative',
            }}
          >
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onAttachImageChosen}
              style={{ display: 'none' }}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={onAttachImageChosen}
              style={{ display: 'none' }}
            />
            {attachPreviewUrl ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 8px',
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  background: colors.surfaceMuted,
                  boxSizing: 'border-box',
                }}
              >
                <img
                  src={attachPreviewUrl}
                  alt=""
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
                <button
                  type="button"
                  onClick={clearAttachPreview}
                  style={{
                    marginLeft: 'auto',
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: colors.surfaceElevated,
                    color: colors.textPrimary,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Quitar
                </button>
              </div>
            ) : null}
            <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center', width: '100%' }}>
            <button
              type="button"
              aria-label="Adjuntar"
              onClick={() => setAttachOpen((v) => !v)}
              style={inputActionBtnStyle}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <div
              aria-hidden={!attachOpen}
              style={{
                position: 'absolute',
                left: 12,
                bottom: 8 + 44 + 8,
                width: 220,
                padding: 8,
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                background: 'rgba(17, 24, 39, 0.95)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxSizing: 'border-box',
                opacity: attachOpen ? 1 : 0,
                transform: attachOpen ? 'translateY(0)' : 'translateY(6px)',
                transition: 'none',
                pointerEvents: attachOpen ? 'auto' : 'none',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setAttachOpen(false)
                  cameraInputRef.current?.click()
                }}
                style={attachMenuItemStyle}
              >
                Hacer foto
              </button>
              <button
                type="button"
                onClick={() => {
                  setAttachOpen(false)
                  galleryInputRef.current?.click()
                }}
                style={attachMenuItemStyle}
              >
                Elegir de galería
              </button>
            </div>
            <InputBase
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribe un mensaje…"
              aria-label="Mensaje"
              disabled={threadPending}
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: 'left',
                height: 44,
                borderRadius: radius.large,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void sendMine()
                }
              }}
            />
            <Button
              type="button"
              variant="primary"
              style={{ flexShrink: 0, minHeight: 44, height: 44, width: 'auto', padding: '0 16px' }}
              onClick={() => void sendMine()}
              disabled={!draft.trim() || sending || Boolean(bootError) || threadPending}
            >
              Enviar
            </Button>
            </div>
          </div>
        </div>
      </div>
    </ScreenShell>
  )
}
