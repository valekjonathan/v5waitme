/**
 * Contrato maestro de layout (v5waitme).
 * Jerarquía: IphoneFrame → ScreenShell (Header + `<main>` + BottomNav en flujo flex).
 * Contenido útil: `<main>` → `data-waitme-content-slot` → (mapa) `data-waitme-map-slot`.
 * Coordenadas de overlays del mapa: sólo en px dentro del map slot, sin viewport ni chrome.
 */

/** Coordenadas en px relativas únicamente a `[data-waitme-map-slot]`. */
export const MAP_SLOT = {
  searchTop: 12,
  controlsTop: 82,
  filterRight: 16,
  cardBottomSearch: 24,
  cardBottomParked: 16,
  /** Alto visible al colapsar la tarjeta inferior (fila peek). */
  cardPeek: 44,
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
