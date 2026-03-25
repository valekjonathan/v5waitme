import { useAppScreen } from '../lib/AppScreenContext'
import { colors } from '../design/colors'
import { spacing, spacingExact } from '../design/spacing'
import { radius } from '../design/radius'
import Button from './Button'
import SettingsIcon from './icons/SettingsIcon'
import UserIcon from './icons/UserIcon'

export default function Header({ interactive = true }) {
  const nav = useAppScreen()

  return (
    <header
      data-waitme-header
      style={{
        pointerEvents: 'auto',
        position: 'fixed',
        left: 0,
        right: 0,
        zIndex: 60,
        top: 0,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        backgroundColor: colors.background,
        // Un poco más de contraste que 0.08: en Safari + scale(IphoneFrame) el pelo de 1px a veces casi no se percibe
        borderBottom: '1px solid rgba(255,255,255,0.28)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.25)',
        boxSizing: 'border-box',
        isolation: 'isolate',
      }}
    >
      <div style={{ position: 'relative', padding: `${spacingExact.headerPaddingY}px ${spacingExact.headerPaddingX}px` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <div style={{ width: 40, height: 40 }} />
            <div
              style={{
                position: 'relative',
                display: 'flex',
                cursor: 'pointer',
                alignItems: 'center',
                gap: spacing.xs,
                overflow: 'visible',
                borderRadius: radius.pill,
                border: `1px solid ${colors.primaryBorder}`,
                backgroundColor: colors.primarySoft,
                padding: `${spacingExact.balancePillPaddingY}px ${spacingExact.balancePillPaddingX}px`,
              }}
            >
              <span style={{ position: 'relative', fontSize: 14, fontWeight: 700, color: colors.primary }}>0.00€</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: spacingExact.headerGap }}>
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
}
