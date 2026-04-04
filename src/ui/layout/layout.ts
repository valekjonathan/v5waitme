/**
 * Contrato maestro de layout (v5waitme).
 * Jerarquía: IphoneFrame → ScreenShell (Header + `<main>` + BottomNav en flujo flex).
 * ScreenShell expone --waitme-shell-header-h y --waitme-shell-nav-h (px reales) para overlays.
 * Modo inset/fullBleed solo cambia overflow del `<main>`, no padding compensatorio.
 */

/**
 * Anclas del overlay de mapa del modelo viewport original (chrome fijo sobre mapa a pantalla completa).
 * ScreenShell mide Header/BottomNav y define --waitme-shell-header-h / --waitme-shell-nav-h.
 * El map slot empieza bajo el header en flujo: estas fórmulas devuelven la misma Y en pantalla
 * que antes sin duplicar compensación fija dentro del slot.
 */
export const MAP_SHELL_OVERLAY = {
  legacySearchTopPx: 70,
  legacyControlsTopPx: 140,
  legacyCardBottomSearchPx: 88,
  legacyCardBottomParkedPx: 80,
  filterButtonRightPx: 16,
  cardBottomMinPx: 12,
} as const

/** `top` / `bottom` en CSS para hijos del shell (heredan las CSS vars). */
export function cssMapOverlayTopFromLegacy(legacyPx: number): string {
  return `max(0px, calc(${legacyPx}px - var(--waitme-shell-header-h, 0px)))`
}

export function cssMapOverlayBottomFromLegacy(legacyPx: number, minPx: number): string {
  return `max(${minPx}px, calc(${legacyPx}px - var(--waitme-shell-nav-h, 0px)))`
}

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
