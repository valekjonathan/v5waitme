import { useEffect, useMemo, useState } from 'react'
import { colors } from '../../../design/colors'
import { radius } from '../../../design/radius'
import { shadows } from '../../../design/shadows'
import Button from '../../../ui/Button'
import CameraIcon from '../../../ui/icons/CameraIcon'
import Plate from './Plate'
import { VehicleIcon } from './VehicleIcons'
import { resolveColorFill } from './profileColors'
import { Stack } from '../../../ui/primitives/Stack'
import { Row } from '../../../ui/primitives/Row'
import { LAYOUT } from '../../../ui/layout/layout'
import { useAppScreen } from '../../../lib/AppScreenContext'
import { renderHeaderStarSlots } from '../../../lib/ratingStars'
import {
  PROFILE_REVIEWS_MAX_WIDTH,
  innerPurplePaddingX,
  outerCardTopPadding,
  profileHeaderCardMarginBottomPx,
  reviewsAvatarWidth,
  reviewsBadgeLayerStyle,
} from '../../shared/profileReviewsLayout'

const s = LAYOUT.spacing
const rootStyle = {
  width: '100%',
  boxSizing: 'border-box',
  overflow: 'visible',
  marginBottom: profileHeaderCardMarginBottomPx,
}
const outerYellowCardStyle = {
  width: '100%',
  maxWidth: PROFILE_REVIEWS_MAX_WIDTH,
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: s.md,
  paddingTop: outerCardTopPadding,
  paddingLeft: s.md,
  border: `1.5px solid ${colors.accentYellow}`,
  borderRadius: radius.profile,
  boxSizing: 'border-box',
  overflow: 'visible',
  background: `${colors.accentYellow}10`,
  cursor: 'pointer',
}

const innerPurpleCardStyle = {
  width: '100%',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'stretch',
  gap: s.sm,
  minWidth: 0,
  padding: innerPurplePaddingX,
  borderRadius: radius.profile,
  boxSizing: 'border-box',
  overflow: 'visible',
  border: `1.5px solid ${colors.primary}`,
  background: colors.background,
}
const avatarStyle = {
  width: reviewsAvatarWidth,
  height: 128,
  borderRadius: radius.xl,
  overflow: 'hidden',
  border: `1px solid ${colors.primary}`,
  background: colors.surfaceMuted,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
const avatarColStyle = { position: 'relative', flexShrink: 0, width: reviewsAvatarWidth }
const avatarUploadLabelStyle = {
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
}
const hiddenFileInputStyle = { display: 'none' }
const reviewsButtonStyle = {
  width: reviewsAvatarWidth,
  height: 28,
  padding: 0,
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
}
const avatarFallbackLetterStyle = { fontSize: 30, fontWeight: 700, color: colors.textPrimary }
const infoColStyle = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: 0,
  overflow: 'visible',
}
const nameTextStyle = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: '0.01em',
  color: colors.textPrimary,
}
const secondaryTextStyle = {
  margin: 0,
  fontSize: 14,
  color: colors.textSecondary,
  fontWeight: 500,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
const nameRowStyle = { width: '100%', minWidth: 0 }
const emailContainerStyle = {
  position: 'absolute',
  top: 4,
  right: 4,
  width: 160,
  height: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 18,
}
const emailStyle = {
  fontSize: 13,
  color: '#ddd',
  textAlign: 'center',
  lineHeight: '16px',
}
const nameHeaderStackStyle = { width: '100%', minWidth: 0 }
const starsWrapStyle = { flexShrink: 0, display: 'flex', gap: 1, marginLeft: 'auto' }
const starStyle = { color: colors.accentYellow, textShadow: shadows.starGlow }
const starEmptyStyle = { color: colors.textMuted, textShadow: 'none' }
const carRowStyle = {
  minWidth: 0,
  overflow: 'hidden',
  flex: 1,
  display: 'flex',
  alignItems: 'center',
}
const plateVehicleRowStyle = { width: '100%', minWidth: 0, alignItems: 'center' }
const plateWrapStyle = { flexShrink: 0, width: 124 }
const plateBoxStyle = {
  width: 124,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
const vehicleWrapStyle = {
  flex: 1,
  height: 38,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export default function ProfileHeader({ profile }) {
  const { openReviews } = useAppScreen()
  const displayName =
    String(profile?.full_name ?? '')
      .trim()
      .split(/\s+/)[0]
      .slice(0, 10) || 'Nombre'
  const carText =
    String(
      [profile?.brand, profile?.model].filter((v) => String(v ?? '').trim()).join(' ')
    ).trim() || 'Marca Modelo'
  const plateText = String(profile?.plate ?? '').trim() || '0000 XXX'
  const avatarUrl = String(profile?.avatar_url ?? '').trim()
  const colorKey = String(profile?.color || 'gris').toLowerCase()
  const vehicleType = profile?.vehicle_type || 'car'
  const [avatarReady, setAvatarReady] = useState(false)
  const fallbackInitial = useMemo(() => {
    const raw = String(displayName ?? '').trim()
    return raw ? raw.charAt(0).toUpperCase() : 'U'
  }, [displayName])
  const avatarImageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: avatarReady ? 1 : 0,
    transition: 'opacity 220ms ease-out',
  }

  useEffect(() => {
    setAvatarReady(false)
  }, [avatarUrl])

  return (
    <div style={rootStyle}>
      <div
        style={outerYellowCardStyle}
        onClick={() => openReviews?.()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') openReviews?.()
        }}
      >
        <div style={reviewsBadgeLayerStyle}>
          <Button
            type="button"
            variant="reviews"
            style={reviewsButtonStyle}
            onClick={(event) => {
              event.stopPropagation()
              openReviews?.()
            }}
          >
            Reseñas
          </Button>
        </div>
        <div style={emailContainerStyle}>
          <span style={emailStyle}>{profile?.email || 'tuemail@tuemail.com'}</span>
        </div>
        <div style={innerPurpleCardStyle}>
          <div style={avatarColStyle}>
            <div style={avatarStyle}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar del perfil"
                  onLoad={() => setAvatarReady(true)}
                  style={avatarImageStyle}
                />
              ) : (
                <span style={avatarFallbackLetterStyle}>{fallbackInitial}</span>
              )}
            </div>
            <label style={avatarUploadLabelStyle} onClick={(event) => event.stopPropagation()}>
              <CameraIcon />
              <input type="file" accept="image/*" style={hiddenFileInputStyle} />
            </label>
          </div>

          <Stack gap={0} style={infoColStyle}>
            <Stack gap={0} style={nameHeaderStackStyle}>
              <Row gap={s.sm} align="flex-start" style={nameRowStyle}>
                <p style={nameTextStyle}>{displayName}</p>
                <div style={starsWrapStyle}>
                  {renderHeaderStarSlots(1).map((star, i) => (
                    <span key={i} style={star === '★' ? starStyle : starEmptyStyle}>
                      {star}
                    </span>
                  ))}
                </div>
              </Row>
            </Stack>
            <div style={carRowStyle}>
              <p style={secondaryTextStyle}>{carText}</p>
            </div>
            <Row gap={s.sm} align="flex-end" style={plateVehicleRowStyle}>
              <div style={plateWrapStyle}>
                <div style={plateBoxStyle}>
                  <Plate width={124} value={plateText} editable={false} />
                </div>
              </div>
              <div style={vehicleWrapStyle}>
                <VehicleIcon type={vehicleType} color={resolveColorFill(colorKey)} size="default" />
              </div>
            </Row>
          </Stack>
        </div>
      </div>
    </div>
  )
}
