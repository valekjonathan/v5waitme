/**
 * Fuente de verdad del layout compartido perfil + reseñas (tokens y estilos exportados).
 * Columna: `ProfileReviewsLayout.jsx`. Shell global: `ScreenShell` + `layout.ts`.
 * Cambiar aquí solo verificando ambas pantallas; no duplicar números en componentes sueltos.
 */
import { LAYOUT } from '../../ui/layout/layout'

const s = LAYOUT.spacing

/** Ancho máximo compartido perfil / reseñas (coincide con tarjeta amarilla). */
export const PROFILE_REVIEWS_MAX_WIDTH = 360

/** Borde del avatar en pantalla perfil (header compartido con reseñas). */
export const profileScreenAvatarBorder = '2px solid rgba(139,92,246,0.6)'

/**
 * Único contenedor del header (ProfileHeader) en perfil y reseñas — misma referencia, sin duplicar.
 * Ancho máximo alineado con la tarjeta amarilla (PROFILE_REVIEWS_MAX_WIDTH).
 */
export const profileReviewsHeaderContainerStyle = {
  width: '100%',
  maxWidth: PROFILE_REVIEWS_MAX_WIDTH,
  marginTop: 0,
  marginLeft: 'auto',
  marginRight: 'auto',
}

/**
 * Padding horizontal del bloque morado interior.
 * Debe coincidir con ProfileHeader (avatar alineado con badge).
 */
export const innerPurplePaddingX = 10

const reviewsBadgeTopInset = s.md
const reviewsBadgeBottomGap = 6
const reviewsBadgeReservedHeight = 30

export const outerCardTopPadding =
  reviewsBadgeTopInset + reviewsBadgeReservedHeight + reviewsBadgeBottomGap

export const reviewsAvatarWidth = 112

/**
 * Capa del botón Reseñas: mismo ancho que el avatar y mismo eje horizontal.
 * left = padding izquierdo de la tarjeta amarilla (s.md) + padding del bloque morado donde empieza el avatar.
 */
export const reviewsBadgeLayerStyle = {
  position: 'absolute',
  top: reviewsBadgeTopInset,
  left: s.md + innerPurplePaddingX,
  width: reviewsAvatarWidth,
  display: 'flex',
  justifyContent: 'flex-start',
  zIndex: 20,
}

/** Espaciado vertical perfil (centrado fijo, sin scroll): ajuste mínimo para que todo quepa. */
export const profileHeaderCardMarginBottomPx = 4
export const profileFormVerticalGapPx = 6
export const profileCenteredClusterGapPx = 10
/** Solo pantalla perfil (`scrollBody={false}`): menos hueco entre bloques. */
export const profileCenteredClusterGapProfilePx = 8

/** Aire superior: misma referencia que reseñas (no pegado al header de app). */
export const profileReviewsInnerHeaderTopMarginPx = 8

export const layoutActionsStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  width: '100%',
}

/** Profile: columna del formulario (scroll en el body de ProfileReviewsLayout). */
export const profileFormVerticalSlotStyle = {
  flexShrink: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
}

/** Profile sin scroll: alto natural del formulario (evita hueco vacío entre campos y botones). */
export const profileFormVerticalSlotStyleNoScroll = {
  ...profileFormVerticalSlotStyle,
  flex: '0 0 auto',
  minHeight: 0,
  overflow: 'hidden',
}

/** Profile: columna de botones; `paddingBottom` = mismo token que aire superior del header. */
export const profileActionsFooterStyle = {
  flexShrink: 0,
  width: '100%',
  marginTop: 4,
  paddingBottom: profileReviewsInnerHeaderTopMarginPx,
  boxSizing: 'border-box',
}

/** Sección sin padding extra (formulario o resumen pegado al flujo). */
export const profileReviewsSectionFlushStyle = {
  width: '100%',
  padding: 0,
  margin: 0,
}

/** Profile: Section del formulario (solo layout de sección). */
export const profileFormSectionLayoutStyle = {
  width: '100%',
  padding: 0,
}

/** Botones de ancho completo en columna de acciones (perfil). */
export const profileReviewsFullWidthButtonStyle = {
  width: '100%',
  height: 34,
  minHeight: 34,
  maxHeight: 34,
  paddingTop: 4,
  paddingBottom: 4,
  marginTop: 0,
  boxSizing: 'border-box',
}
