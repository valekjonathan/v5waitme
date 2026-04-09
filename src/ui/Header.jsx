import { forwardRef, useLayoutEffect, useRef, useState } from 'react'
import { useAppScreen } from '../lib/AppScreenContext'
import { colors } from '../design/colors'
import { radius } from '../design/radius'
import { LAYOUT } from './layout/layout'
import Button from './Button'
import SettingsIcon from './icons/SettingsIcon'
import UserIcon from './icons/UserIcon'

const s = LAYOUT.spacing
const HEADER_GAP = s.md
const HEADER_PADDING_Y = s.md
const HEADER_PADDING_X = s.lg
const BALANCE_PILL_PADDING_Y = s.sm - 2
const BALANCE_PILL_PADDING_X = s.md

const Header = forwardRef(function Header({ interactive = true }, ref) {
  const nav = useAppScreen()
  const innerRef = useRef(null)
  const logoRef = useRef(null)
  const pillRef = useRef(null)
  const [pillLeft, setPillLeft] = useState(null)

  useLayoutEffect(() => {
    const compute = () => {
      const inner = innerRef.current
      const logo = logoRef.current
      const pill = pillRef.current
      if (!inner || !logo || !pill) return
      const innerRect = inner.getBoundingClientRect()
      const logoRect = logo.getBoundingClientRect()
      const pillRect = pill.getBoundingClientRect()
      const spaceEndX = Math.max(0, logoRect.left - innerRect.left)
      const centerX = spaceEndX / 2
      const nextLeft = Math.max(0, centerX - pillRect.width / 2)
      setPillLeft(nextLeft)
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  return (
    <header
      ref={ref}
      data-waitme-header
      style={{
        pointerEvents: 'auto',
        position: 'relative',
        width: '100%',
        flexShrink: 0,
        zIndex: 60,
        backgroundColor: colors.background,
        // Contraste suave con el mapa / fondo
        borderBottom: '1px solid rgba(255,255,255,0.28)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.25)',
        boxSizing: 'border-box',
        isolation: 'isolate',
      }}
    >
      <div
        ref={innerRef}
        style={{
          position: 'relative',
          paddingTop: `calc(env(safe-area-inset-top, 0px) + ${HEADER_PADDING_Y}px)`,
          paddingBottom: HEADER_PADDING_Y,
          paddingLeft: HEADER_PADDING_X,
          paddingRight: HEADER_PADDING_X,
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 40, height: 40 }} aria-hidden />
          <div
            ref={pillRef}
            style={{
              position: 'absolute',
              left: pillLeft == null ? 0 : pillLeft,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              cursor: 'pointer',
              alignItems: 'center',
              gap: s.xs,
              overflow: 'visible',
              borderRadius: radius.pill,
              border: `1px solid ${colors.primaryBorder}`,
              backgroundColor: colors.primarySoft,
              padding: `${BALANCE_PILL_PADDING_Y}px ${BALANCE_PILL_PADDING_X}px`,
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                position: 'relative',
                fontSize: 14,
                fontWeight: 700,
                color: colors.primary,
              }}
            >
              0.00€
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: HEADER_GAP,
            }}
          >
            <Button type="button" variant="ghost" style={{ overflow: 'visible' }}>
              <SettingsIcon />
            </Button>

            <Button
              type="button"
              variant="ghostProfile"
              aria-label="Perfil"
              onClick={interactive ? () => nav?.openProfile?.() : undefined}
            >
              <UserIcon />
            </Button>
          </div>
        </div>

        <div
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            ref={logoRef}
            style={{
              width: '100%',
              userSelect: 'none',
              textAlign: 'center',
              fontSize: 24,
              fontWeight: 600,
              lineHeight: '24px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span style={{ color: colors.textPrimary }}>Wait</span>
            <span style={{ color: colors.primary }}>Me!</span>
          </span>
        </div>
      </div>
    </header>
  )
})

Header.displayName = 'Header'

export default Header
