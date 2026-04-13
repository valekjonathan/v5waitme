import {
  PROFILE_REVIEWS_MAX_WIDTH,
  profileCenteredClusterGapPx,
  profileReviewsHeaderContainerStyle,
} from '../profileReviewsLayout'

/**
 * Columna bajo ScreenShell inset: header fijo arriba, cuerpo con scroll independiente.
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
  marginTop: 25,
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

/**
 * Perfil: pie fijo; solo el formulario hace scroll (evita “scroll de página” en el bloque de acciones).
 */
const bodyStickyOuterStyle = {
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  width: '100%',
  maxWidth: PROFILE_REVIEWS_MAX_WIDTH,
  marginLeft: 'auto',
  marginRight: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: profileCenteredClusterGapPx,
  boxSizing: 'border-box',
}

const bodyScrollOnlyStyle = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: profileCenteredClusterGapPx,
  boxSizing: 'border-box',
  WebkitOverflowScrolling: 'touch',
}

const footerStickyStyle = {
  flexShrink: 0,
  width: '100%',
}

/** Slot hijo de ScreenShell (modo inset). */
export const profileReviewsShellContentStyle = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}

/**
 * @param {object} props
 * @param {import('react').ReactNode} props.header
 * @param {import('react').ReactNode} props.children
 * @param {import('react').ReactNode} [props.footer] Perfil: acciones fijas; solo `children` hace scroll.
 */
export default function ProfileReviewsLayout({ header, children, footer = null }) {
  return (
    <div style={viewportStyle}>
      <div style={headerFixedStyle}>
        <div style={profileReviewsHeaderContainerStyle}>{header}</div>
      </div>
      {footer != null ? (
        <div style={bodyStickyOuterStyle}>
          <div style={bodyScrollOnlyStyle}>{children}</div>
          <div style={footerStickyStyle}>{footer}</div>
        </div>
      ) : (
        <div style={bodyStyle}>{children}</div>
      )}
    </div>
  )
}
