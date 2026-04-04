import { forwardRef } from 'react'
import { useAppScreen } from '../lib/AppScreenContext'
import {
  APP_SCREEN_ALERTS,
  APP_SCREEN_CHATS,
  APP_SCREEN_HOME,
  APP_SCREEN_PARK_HERE,
  APP_SCREEN_SEARCH_PARKING,
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
const navPaddingBottomCalc = `${s.xs}px`
const labelStyle = {
  marginTop: 2,
  fontSize: 10,
  fontWeight: 700,
  lineHeight: 1,
  whiteSpace: 'nowrap',
}

const divider = <div style={{ height: 32, width: 1, background: colors.border }} aria-hidden />

const BottomNav = forwardRef(function BottomNav(
  { interactive = true, fixedToViewport = false },
  ref
) {
  const nav = useAppScreen()
  const { screen } = nav
  const { status, isProfileComplete } = useAuth()
  const notice = useProfileIncompleteNotice()

  const isMapActive =
    screen === APP_SCREEN_HOME ||
    screen === APP_SCREEN_SEARCH_PARKING ||
    screen === APP_SCREEN_PARK_HERE
  const isAlertsActive = screen === APP_SCREEN_ALERTS
  const isChatActive = screen === APP_SCREEN_CHATS

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
        ...(fixedToViewport
          ? {
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
            }
          : {
              position: 'relative',
              flexShrink: 0,
            }),
        zIndex: 2147483647,
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
        paddingTop: navPaddingTop,
        backgroundColor: colors.background,
        borderTop: '1px solid rgba(255,255,255,0.28)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.25)',
        boxSizing: 'border-box',
        isolation: 'isolate',
        paddingBottom: navPaddingBottomCalc,
      }}
    >
      <div style={{ margin: '0 auto', display: 'flex', maxWidth: 448, alignItems: 'center' }}>
        <Button
          type="button"
          variant={isAlertsActive ? 'navActive' : 'nav'}
          aria-current={isAlertsActive ? 'page' : undefined}
          onClick={guardOr(() => nav?.openAlerts?.())}
        >
          <NavAlertIcon />
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
          onClick={guardOr(() => nav?.openChats?.())}
        >
          <MessageCircleIcon />
          <span style={labelStyle}>Chats</span>
        </Button>
      </div>
    </nav>
  )
})

BottomNav.displayName = 'BottomNav'

export default BottomNav
