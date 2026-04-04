import {
  PROFILE_REVIEWS_MAX_WIDTH,
  profileCenteredClusterGapPx,
  profileReviewsHeaderContainerStyle,
  profileReviewsInnerHeaderTopMarginPx,
} from '../profileReviewsLayout'

/**
 * Columna bajo ScreenShell inset: cluster superior + cuerpo con scroll independiente.
 * Una sola estructura para perfil y reseñas (sin centered / spacers / cluster).
 */
const viewportStyle = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  gap: profileCenteredClusterGapPx,
}

/** Header: no crece con el scroll; misma caja que token compartido. */
const headerFixedStyle = {
  flexShrink: 0,
  marginTop: profileReviewsInnerHeaderTopMarginPx,
  width: '100%',
}

/** Cuerpo: única zona scroll; mismo ancho máximo que la tarjeta. */
const bodyStyle = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  width: '100%',
  maxWidth: PROFILE_REVIEWS_MAX_WIDTH,
  marginLeft: 'auto',
  marginRight: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: profileCenteredClusterGapPx,
  boxSizing: 'border-box',
  WebkitOverflowScrolling: 'touch',
}

/** Slot hijo de ScreenShell (modo inset). */
export const profileReviewsShellContentStyle = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}

export default function ProfileReviewsLayout({ header, children }) {
  return (
    <div style={viewportStyle}>
      <div style={headerFixedStyle}>
        <div style={profileReviewsHeaderContainerStyle}>{header}</div>
      </div>
      <div style={bodyStyle}>{children}</div>
    </div>
  )
}
