import { forwardRef, memo } from 'react'
import { useAppScreen } from '../lib/AppScreenContext'
import {
  ACTIVE_SCREEN_ALERTS,
  ACTIVE_SCREEN_CHATS,
  ACTIVE_SCREEN_MAP,
  ACTIVE_SCREEN_THREAD,
} from '../lib/appScreenState.js'
import { useAuth } from '../lib/AuthContext'
import { useProfileIncompleteNotice } from '../lib/ProfileIncompleteNoticeContext.jsx'
import { colors } from '../design/colors'
import { LAYOUT } from './layout/layout'
import Button from './Button'
import NavAlertIcon from './icons/NavAlertIcon'
import NavMapIcon from './icons/NavMapIcon'
import MessageCircleIcon from './icons/MessageCircleIcon'

const s = LAYOUT.spacing
const navPaddingTop = s.sm - 2
const labelStyle = {
  marginTop: 2,
  fontSize: 10,
  fontWeight: 700,
  lineHeight: 1,
  whiteSpace: 'nowrap',
}

const divider = <div style={{ height: 32, width: 1, background: colors.border }} aria-hidden />

const BottomNav = memo(
  forwardRef(function BottomNav({ interactive = true }, ref) {
  const nav = useAppScreen()
  const { activeScreen, chatUnreadTotal = 0, activeWaitmeReservationBadgeCount = 0 } = nav
  const { status, isProfileComplete } = useAuth()
  const notice = useProfileIncompleteNotice()

  const isMapActive = activeScreen === ACTIVE_SCREEN_MAP
  const isAlertsActive = activeScreen === ACTIVE_SCREEN_ALERTS
  const isChatActive =
    activeScreen === ACTIVE_SCREEN_CHATS || activeScreen === ACTIVE_SCREEN_THREAD

  const guardOr = (fn) => {
    if (!interactive) return undefined
    return () => {
      if (status === 'authenticated' && !isProfileComplete) {
        notice?.requestNotice?.()
        return
      }
      fn?.()
    }
  }

  return (
    <nav
      ref={ref}
      data-waitme-nav
      style={{
        pointerEvents: 'auto',
        width: '100%',
        flexShrink: 0,
        zIndex: LAYOUT.z.nav,
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
        paddingTop: navPaddingTop,
        backgroundColor: colors.background,
        borderTop: '2px solid rgba(255,255,255,0.22)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.25)',
        boxSizing: 'border-box',
        isolation: 'isolate',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div style={{ margin: '0 auto', display: 'flex', maxWidth: 448, alignItems: 'center' }}>
        <Button
          type="button"
          variant={isAlertsActive ? 'navActive' : 'nav'}
          aria-current={isAlertsActive ? 'page' : undefined}
          onClick={guardOr(() => nav?.openAlerts?.())}
        >
          <span
            style={{
              position: 'relative',
              width: 40,
              height: 40,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <NavAlertIcon />
            {activeWaitmeReservationBadgeCount > 0 ? (
              <span
                className="waitme-reservation-nav-dot"
                aria-hidden
                style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 2,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #c084fc, #7c3aed)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  boxShadow: '0 0 8px rgba(168,85,247,0.7)',
                  pointerEvents: 'none',
                }}
              />
            ) : null}
          </span>
          <span style={labelStyle}>Alertas</span>
        </Button>

        {divider}

        <Button
          type="button"
          variant={isMapActive ? 'navActive' : 'nav'}
          aria-current={isMapActive ? 'page' : undefined}
          onClick={interactive ? () => nav?.openHome?.() : undefined}
        >
          <NavMapIcon />
          <span style={labelStyle}>Mapa</span>
        </Button>

        {divider}

        <Button
          type="button"
          variant={isChatActive ? 'navActive' : 'nav'}
          aria-current={isChatActive ? 'page' : undefined}
          onClick={guardOr(() => nav?.openChatsRoot?.())}
        >
          <span
            style={{
              position: 'relative',
              width: 40,
              height: 40,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MessageCircleIcon />
            {chatUnreadTotal > 0 ? (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 6,
                  right: -19,
                  width: 18,
                  height: 18,
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  borderRadius: '50%',
                  border: '1px solid rgba(34, 197, 94, 0.5)',
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  color: '#fff',
                  fontWeight: 700,
                  lineHeight: 1,
                  overflow: 'hidden',
                  fontSize: chatUnreadTotal > 9 ? 7 : 9,
                }}
              >
                {chatUnreadTotal > 99 ? '99+' : chatUnreadTotal}
              </span>
            ) : null}
          </span>
          <span style={labelStyle}>Chats</span>
        </Button>
      </div>
    </nav>
  )
  })
)

BottomNav.displayName = 'BottomNav'

export default BottomNav
