import { useCallback, useEffect, useRef, useState } from 'react'
import { colors } from '../../design/colors'
import { radius } from '../../design/radius'
import ScreenShell from '../../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../../ui/layout/layout'
import Button from '../../ui/Button'
import InputBase from '../../ui/InputBase'
import { IconChevronLeft } from '../parking/waitme/icons.jsx'
import { supabase, isSupabaseConfigured } from '../../services/supabase.js'
import { isRealSupabaseAuthUid } from '../../services/authUid.js'
import {
  fetchDmMessages,
  formatDmMsgTime,
  sendDmMessage,
} from '../../services/waitmeChats.js'

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

function nextTempId() {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * @param {{ summary: Record<string, unknown>, userId: string, onBack: () => void, localFallback?: boolean }} props
 */
export default function ChatThreadView({ summary, userId, onBack, localFallback = false }) {
  const s = summary && typeof summary === 'object' ? summary : {}
  const threadId = String(s.id ?? '')
  const title = String(s.name ?? 'Chat')

  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [bootError, setBootError] = useState(null)
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  const scrollBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollBottom()
  }, [messages, scrollBottom])

  useEffect(() => {
    let cancelled = false
    if (!threadId) {
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

  const sendMine = useCallback(async () => {
    const t = draft.trim()
    if (!t || sending || !threadId) return
    if (!localFallback && !isRealSupabaseAuthUid(userId)) return
    setDraft('')
    setSending(true)
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
  }, [draft, localFallback, sending, threadId, userId])

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
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: colors.textPrimary }}>{title}</div>
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
            {messages.map((m) => {
              const mine = m.from === 'me'
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    justifyContent: mine ? 'flex-end' : 'flex-start',
                    width: '100%',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      ...bubbleShared,
                      backgroundColor: mine ? colors.primaryStrong : colors.surfaceMuted,
                      color: colors.textPrimary,
                      border: mine ? 'none' : `1px solid ${colors.border}`,
                    }}
                  >
                    {m.text}
                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.75,
                        marginTop: 4,
                        textAlign: mine ? 'right' : 'left',
                      }}
                    >
                      {m.at}
                    </div>
                  </div>
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
              flexDirection: 'row',
              gap: 8,
              alignItems: 'center',
              borderTop: `1px solid ${colors.border}`,
              backgroundColor: BG,
              boxSizing: 'border-box',
            }}
          >
            <InputBase
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribe un mensaje…"
              aria-label="Mensaje"
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
              disabled={!draft.trim() || sending || Boolean(bootError)}
            >
              Enviar
            </Button>
          </div>
        </div>
      </div>
    </ScreenShell>
  )
}
