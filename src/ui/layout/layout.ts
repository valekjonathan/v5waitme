/**
 * Contrato maestro de layout (v5waitme).
 * Jerarquía: IphoneFrame → ScreenShell (Header + `<main>` + BottomNav en flujo flex).
 * Modo inset/fullBleed solo cambia overflow del `<main>`, no padding compensatorio.
 */

/**
 * Overlays de mapa (SearchParking / ParkHere): coordenadas relativas al slot del Map
 * (`position: relative` que envuelve Mapbox). Con Header y BottomNav en flujo flex, ese slot
 * ya es el área útil central; no duplicar aquí huecos de chrome fijo sobre el viewport.
 */
export const MAP_SHELL_OVERLAY = {
  searchRowTopPx: 0,
  /** Columna zoom / botón filtros: mismo ritmo vertical que antes (≈140 − 70 respecto al slot). */
  controlsColumnTopPx: 70,
  filterButtonRightPx: 16,
  /** Tarjeta inferior: el nav global está fuera de `<main>`; solo respiro sobre el borde útil. */
  cardStackBottomPx: 16,
} as const

export const LAYOUT = {
  screen: {
    maxWidth: 448,
    paddingX: 16,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  z: {
    map: 0,
    overlay: 5,
    content: 10,
    nav: 20,
  },
} as const

export const SCREEN_SHELL_MAIN_MODE = {
  INSET: 'inset',
  FULL_BLEED: 'fullBleed',
} as const

export type ScreenShellMainMode =
  (typeof SCREEN_SHELL_MAIN_MODE)[keyof typeof SCREEN_SHELL_MAIN_MODE]
