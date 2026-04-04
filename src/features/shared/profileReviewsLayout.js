/**
 * Fuente de verdad del layout compartido perfil + reseñas (tokens y estilos exportados).
 * Columna: `ProfileReviewsLayout.jsx`. Shell global: `ScreenShell` + `layout.ts`.
 * Cambiar aquí solo verificando ambas pantallas; no duplicar números en componentes sueltos.
 */
import { LAYOUT } from '../../ui/layout/layout'

const s = LAYOUT.spacing

/** Ancho máximo compartido perfil / reseñas (coincide con tarjeta amarilla). */
export const PROFILE_REVIEWS_MAX_WIDTH = 360

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

export const reviewsBadgeTopInset = s.md
export const reviewsBadgeBottomGap = 6
export const reviewsBadgeReservedHeight = 30

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
export const profileHeaderCardMarginBottomPx = 6
export const profileFormVerticalGapPx = 10
export const profileActionsFooterMarginTopPx = 8
export const profileCenteredClusterGapPx = 12

/**
 * Separación dentro del content slot (`data-waitme-content-slot`), bajo el borde superior de `<main>`.
 */
export const profileReviewsInnerHeaderTopMarginPx = 25

export const layoutActionsStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
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

/** Profile: columna de botones (no encoge; queda bajo el slot del formulario). */
export const profileActionsFooterStyle = {
  flexShrink: 0,
  width: '100%',
  marginTop: profileActionsFooterMarginTopPx,
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
  height: 44,
}
