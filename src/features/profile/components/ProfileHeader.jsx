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
import { filledStarsFromAverage5, renderHeaderStarSlots } from '../../../lib/ratingStars'
import { profileDisplayFirstName } from '../../../services/profile.js'
import {
  PROFILE_REVIEWS_MAX_WIDTH,
  innerPurplePaddingX,
  outerCardTopPadding,
  profileHeaderCardMarginBottomPx,
  profileScreenAvatarBorder,
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
const emailContainerStyle = {
  position: 'absolute',
  top: 4,
  left: reviewsAvatarWidth,
  right: 0,
  height: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
  zIndex: 20,
}
const emailTextStyle = {
  margin: 0,
  fontSize: 13,
  color: '#ddd',
  lineHeight: '16px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
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
const avatarStyleBase = {
  width: reviewsAvatarWidth,
  height: 128,
  borderRadius: radius.xl,
  overflow: 'hidden',
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
  minWidth: 0,
  flex: 1,
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
const plateVehicleRowStyle = {
  width: '100%',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: s.sm,
}
const plateWrapStyle = { flexShrink: 0, width: 124 }
const vehicleWrapStyle = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingRight: innerPurplePaddingX,
  boxSizing: 'border-box',
  marginRight: 3,
}
const vehicleIconNudgeStyle = {
  marginLeft: -6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
const avatarImgStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

/**
 * Tarjeta amarilla única (Perfil y Reseñas montan este mismo componente).
 * Estructura: tokens `reviewsBadgeLayerStyle` + email en esquina + bloque morado con nombre único.
 */
export default function ProfileHeader({ profile, avatarBorder, averageRating = 0 }) {
  const { openReviews } = useAppScreen()
  if (!profile) return null
  const avatarStyle = {
    ...avatarStyleBase,
    border: avatarBorder ?? profileScreenAvatarBorder,
  }
  const displayName = profileDisplayFirstName(profile?.full_name)
  const carText =
    String(
      [profile?.brand, profile?.model].filter((v) => String(v ?? '').trim()).join(' ')
    ).trim() || 'Marca Modelo'
  const plateText = String(profile?.plate ?? '').trim() || '0000 XXX'
  const displayEmail = profile?.email || ''
  const avatarUrl = profile?.avatar_url || ''
  const colorKey = String(profile?.color || 'gris').toLowerCase()
  const vehicleType = profile?.vehicle_type || 'car'
  const fallbackLetter = (displayName || profile?.email || 'U').charAt(0)
  const headerStarFill = filledStarsFromAverage5(averageRating)

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
        {displayEmail ? (
          <div style={emailContainerStyle}>
            <span style={emailTextStyle}>{displayEmail}</span>
          </div>
        ) : null}

        <div style={innerPurpleCardStyle}>
          <div style={avatarColStyle}>
            <div style={avatarStyle}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" referrerPolicy="no-referrer" style={avatarImgStyle} />
              ) : (
                <div style={avatarFallbackLetterStyle}>{fallbackLetter}</div>
              )}
            </div>
            <label style={avatarUploadLabelStyle} onClick={(event) => event.stopPropagation()}>
              <CameraIcon />
              <input type="file" accept="image/*" style={hiddenFileInputStyle} />
            </label>
          </div>

          <Stack gap={0} style={infoColStyle}>
            <Row gap={s.sm} align="flex-start" style={nameRowStyle}>
              <p style={nameTextStyle}>{displayName}</p>
              <div style={starsWrapStyle}>
                {renderHeaderStarSlots(headerStarFill).map((star, i) => (
                  <span key={i} style={star === '★' ? starStyle : starEmptyStyle}>
                    {star}
                  </span>
                ))}
              </div>
            </Row>
            <div style={carRowStyle}>
              <p style={secondaryTextStyle}>{carText}</p>
            </div>
            <div style={plateVehicleRowStyle}>
              <div style={plateWrapStyle}>
                <Plate width={124} value={plateText} editable={false} />
              </div>
              <div style={vehicleWrapStyle}>
                <div style={vehicleIconNudgeStyle}>
                  <VehicleIcon type={vehicleType} color={resolveColorFill(colorKey)} size="large" />
                </div>
              </div>
            </div>
          </Stack>
        </div>
      </div>
    </div>
  )
}
