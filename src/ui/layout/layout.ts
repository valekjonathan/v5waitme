/**
 * Contrato maestro de layout (v5waitme).
 * Jerarquía: IphoneFrame → ScreenShell (Header + `<main>` + BottomNav en flujo flex).
 * Modo inset/fullBleed solo cambia overflow del `<main>`, no padding compensatorio.
 */

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
