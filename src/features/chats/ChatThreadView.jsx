import { useCallback, useEffect, useRef, useState } from 'react'
import { colors } from '../../design/colors'
import { radius } from '../../design/radius'
import ScreenShell from '../../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../../ui/layout/layout'
import Button from '../../ui/Button'
import InputBase from '../../ui/InputBase'
import { IconChevronLeft } from '../parking/waitme/icons.jsx'

const BG = colors.background
const shellStyle = { backgroundColor: BG }

const AUTO_REPLIES = [
  'Vale, gracias por avisar.',
  'Perfecto, quedo pendiente.',
  'Entendido 👍',
  'Ok, nos leemos.',
]

function nextId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * @param {{ thread: import('./chatMockData.js').ChatThread, onBack: () => void }} props
 */
export default function ChatThreadView({ thread, onBack }) {
  const [messages, setMessages] = useState(() => [...thread.messages])
  const [draft, setDraft] = useState('')
  const [pendingBot, setPendingBot] = useState(false)
  const endRef = useRef(null)
  const replyTimerRef = useRef(null)

  const scrollBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollBottom()
  }, [messages, scrollBottom])

  useEffect(() => {
    return () => {
      if (replyTimerRef.current) window.clearTimeout(replyTimerRef.current)
    }
  }, [])

  const sendMine = useCallback(() => {
    const t = draft.trim()
    if (!t || pendingBot) return
    setDraft('')
    const at = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    setMessages((prev) => [...prev, { id: nextId(), from: 'me', text: t, at }])
    setPendingBot(true)
    const delay = 700 + Math.floor(Math.random() * 900)
    replyTimerRef.current = window.setTimeout(() => {
      const botAt = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      const line = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)]
      setMessages((prev) => [...prev, { id: nextId(), from: 'them', text: line, at: botAt }])
      setPendingBot(false)
      replyTimerRef.current = null
    }, delay)
  }, [draft, pendingBot])

  const bubbleBase = {
    maxWidth: '78%',
    padding: '10px 14px',
    borderRadius: radius.medium,
    fontSize: 15,
    lineHeight: 1.35,
    wordBreak: 'break-word',
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
        }}
      >
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 4px 12px',
            borderBottom: `1px solid ${colors.border}`,
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
            <div style={{ fontWeight: 800, fontSize: 17, color: colors.textPrimary }}>{thread.name}</div>
            <div style={{ fontSize: 12, color: colors.textMuted }}>Chat simulado</div>
          </div>
        </div>

        <div
          data-waitme-chat-scroll
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '12px 12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
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
                }}
              >
                <div
                  style={{
                    ...bubbleBase,
                    backgroundColor: mine ? colors.primaryStrong : colors.surfaceMuted,
                    color: colors.textPrimary,
                    border: mine ? 'none' : `1px solid ${colors.primaryBorderMuted}`,
                    borderBottomRightRadius: mine ? 4 : radius.medium,
                    borderBottomLeftRadius: mine ? radius.medium : 4,
                  }}
                >
                  {m.text}
                  <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4, textAlign: mine ? 'right' : 'left' }}>
                    {m.at}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>

        <div
          style={{
            flexShrink: 0,
            padding: '10px 12px 12px',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <InputBase
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe un mensaje…"
            aria-label="Mensaje"
            style={{ flex: 1, textAlign: 'left', height: 44, borderRadius: radius.large }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMine()
              }
            }}
          />
          <Button
            type="button"
            variant="primary"
            style={{ minHeight: 44, height: 44, width: 'auto', padding: '0 16px' }}
            onClick={sendMine}
            disabled={!draft.trim() || pendingBot}
          >
            Enviar
          </Button>
        </div>
      </div>
    </ScreenShell>
  )
}
