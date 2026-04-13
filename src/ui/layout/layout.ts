/**
 * Contrato maestro de layout (v5waitme).
 * Jerarquía: App (`AppLayout` = IphoneFrame) → ScreenShell (Header + main + BottomNav) → rutas.
 * En modo inset, el padding del `<main>` usa las alturas **medidas** de Header/BottomNav (ver ScreenShell).
 */
import type { CSSProperties } from 'react'

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

/**
 * Padding del `<main>` en modo inset.
 * `headerHeightPx` / `bottomNavHeightPx` deben ser las alturas reales de los nodos fijos
 * (`getBoundingClientRect().height` o `offsetHeight`), que ya incluyen safe-area en sus cajas.
 */
export function shellInsetMainPaddingStyle(
  paddingX: number,
  headerHeightPx: number,
  bottomNavHeightPx: number
): CSSProperties {
  return {
    paddingLeft: paddingX,
    paddingRight: paddingX,
    paddingTop: `${headerHeightPx}px`,
    paddingBottom: `${bottomNavHeightPx}px`,
  }
}
