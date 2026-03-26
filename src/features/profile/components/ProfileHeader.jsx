import { resolveColorFill } from './profileColors'
import { colors } from '../../../design/colors'
import { spacing, spacingExact } from '../../../design/spacing'
import { radius } from '../../../design/radius'
import { shadows } from '../../../design/shadows'
import Button from '../../../ui/Button'
import CameraIcon from '../../../ui/icons/CameraIcon'

export default function ProfileHeader({ profile, Plate, VehicleIcon }) {
  const cardBorder = `1px solid ${colors.primary}`
  const full_name = profile?.full_name
  const avatar_url = profile?.avatar_url
  const brand = profile?.brand
  const model = profile?.model
  const plate = profile?.plate
  const vehicle_type = profile?.vehicle_type
  const color = profile?.color
  const nameStr = String(full_name ?? '').trim()
  const carStr = String([brand, model].filter(Boolean).join(' ')).trim()
  const colorKey = String(color || 'gris').toLowerCase()

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: spacingExact.profileCardGap,
          padding: spacing.md,
          paddingLeft: spacing.md,
          border: `1.5px solid ${colors.accentYellow}`,
          borderRadius: radius.profile,
          boxSizing: 'border-box',
          overflow: 'hidden',
          background: colors.accentYellowTint,
        }}
      >
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            gap: spacing.sm,
            minWidth: 0,
            padding: spacingExact.profileCardPadding,
            borderRadius: radius.profile,
            boxSizing: 'border-box',
            overflow: 'visible',
            border: `1.5px solid ${colors.primary}`,
            background: 'transparent',
          }}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                position: 'absolute',
                top: -38,
                left: 0,
                width: 96,
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'auto',
              }}
            >
              <Button type="button" variant="reviews">
                Reseñas
              </Button>
            </div>
            <div
              style={{
                width: 96,
                height: 112,
                borderRadius: radius.xl,
                overflow: 'hidden',
                border: cardBorder,
                background: colors.surfaceMuted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {String(avatar_url ?? '').trim() ? (
                <img
                  src={String(avatar_url).trim()}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 26, fontWeight: 600, color: colors.textPrimary }}>
                  {nameStr ? nameStr.charAt(0) : '?'}
                </span>
              )}
            </div>
            <label
              style={{
                position: 'absolute',
                right: 2,
                bottom: 2,
                width: 32,
                height: 32,
                borderRadius: radius.pill,
                background: colors.primaryStrong,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <CameraIcon />
              <input type="file" accept="image/*" style={{ display: 'none' }} />
            </label>
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: spacing.sm,
                minWidth: 0,
                width: '100%',
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  maxWidth: '100%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: '0.01em',
                  color: colors.textPrimary,
                  transform: 'translateY(4px)',
                }}
              >
                {nameStr || '—'}
              </div>
              <div style={{ flexShrink: 0, display: 'flex', gap: 2, marginLeft: -8 }}>
                {'★★★★'.split('').map((s, i) => (
                  <span
                    key={i}
                    style={{
                      color: colors.accentYellow,
                      textShadow: shadows.starGlow,
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            <div
              style={{
                minWidth: 0,
                overflow: 'hidden',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                minHeight: 0,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: colors.textSecondary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%',
                }}
              >
                {carStr || '—'}
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: spacing.sm,
                minWidth: 0,
                width: '100%',
              }}
            >
              <div style={{ flex: 1, minWidth: 0, transform: 'translateY(-4px)' }}>
                <div
                  style={{
                    width: 124,
                    height: 36,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 154,
                      height: 36,
                      flexShrink: 0,
                      transform: 'scaleX(0.8051948051948052)',
                      transformOrigin: 'center center',
                    }}
                  >
                    <Plate value={plate || ''} editable={false} />
                  </div>
                </div>
              </div>
              <div
                style={{
                  flexShrink: 0,
                  width: 72,
                  height: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <VehicleIcon
                  type={vehicle_type || 'car'}
                  color={resolveColorFill(colorKey)}
                  size="default"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
