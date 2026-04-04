/**
 * Contrato maestro de layout (v5waitme).
 * Jerarquía: IphoneFrame → ScreenShell (Header + `<main>` + BottomNav en flujo flex).
 * Única referencia vertical del contenido: `<main>` → `data-waitme-content-slot` (100 % del main).
 * Overlays de mapa: offsets sólo respecto a `[data-waitme-map-slot]`, sin viewport ni restas de chrome.
 * Modo inset/fullBleed solo cambia overflow del `<main>`, no padding compensatorio.
 */

/**
 * Posiciones dentro del nodo `[data-waitme-map-slot]` (hijo directo del content slot en mapa).
 * Paridad con el producto histórico: 70→140 entre fila buscador y columna zoom/filtros; 88/80 al borde inferior de pantalla con nav ya fuera del slot ⇒ inset inferior en el slot.
 */
export const MAP_SLOT_OVERLAY = {
  searchRowTopPx: 12,
  /** Misma separación vertical histórica entre top buscador (70) y top controles (140). */
  searchToControlsTopGapPx: 70,
  /** = searchRowTopPx + searchToControlsTopGapPx */
  zoomColumnTopPx: 82,
  filterButtonRightPx: 16,
  cardBottomSearchPx: 24,
  cardBottomParkedPx: 16,
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
