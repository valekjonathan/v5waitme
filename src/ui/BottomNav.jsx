import { useAppScreen } from '../lib/AppScreenContext'
import { colors } from '../design/colors'
import { spacingExact } from '../design/spacing'
import Button from './Button'
import NavAlertIcon from './icons/NavAlertIcon'
import NavMapIcon from './icons/NavMapIcon'
import MessageCircleIcon from './icons/MessageCircleIcon'

const labelStyle = {
  marginTop: 2,
  fontSize: 10,
  fontWeight: 700,
  lineHeight: 1,
  whiteSpace: 'nowrap',
}

const divider = <div style={{ height: 32, width: 1, background: colors.border }} aria-hidden />

export default function BottomNav({ interactive = true }) {
  const nav = useAppScreen()

  return (
    <nav
      data-waitme-nav
      style={{
        pointerEvents: 'auto',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 2147483647,
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
        paddingTop: spacingExact.navPaddingTop,
        backgroundColor: colors.background,
        borderTop: '1px solid rgba(255,255,255,0.28)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.25)',
        boxSizing: 'border-box',
        isolation: 'isolate',
        paddingBottom: spacingExact.navPaddingBottomCalc,
      }}
    >
      <div style={{ margin: '0 auto', display: 'flex', maxWidth: 448, alignItems: 'center' }}>
        <Button type="button" variant="nav">
          <div style={{ position: 'relative' }}>
            <NavAlertIcon />
          </div>
          <span style={labelStyle}>Alertas</span>
        </Button>

        {divider}

        <Button
          type="button"
          variant="navActive"
          aria-current="page"
          onClick={interactive ? () => nav?.openHome?.() : undefined}
        >
          <NavMapIcon />
          <span style={labelStyle}>Mapa</span>
        </Button>

        {divider}

        <Button type="button" variant="nav">
          <div style={{ position: 'relative' }}>
            <MessageCircleIcon />
          </div>
          <span style={labelStyle}>Chats</span>
        </Button>
      </div>
    </nav>
  )
}
