/**
 * Shell: columna Header → `<main>` (área útil flex) → BottomNav. Overlays de mapa dentro del slot del
 * Map deben usar `MAP_SHELL_OVERLAY` en layout.ts (referencia al área útil, no al viewport).
 */
import { type CSSProperties, type ReactNode } from 'react'
import Header from '../Header'
import BottomNav from '../BottomNav'
import { SCREEN_SHELL_MAIN_MODE, type ScreenShellMainMode } from './layout'

const shellRootStyle: CSSProperties = {
  width: '100%',
  flex: 1,
  minHeight: '100dvh',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
}

const shellMainColumnStyle: CSSProperties = {
  width: '100%',
  maxWidth: 'none',
  margin: 0,
  padding: 0,
  minHeight: 0,
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  alignSelf: 'stretch',
}

export type ScreenShellProps = {
  children: ReactNode
  interactive?: boolean
  style?: CSSProperties
  contentStyle?: CSSProperties
  mainMode?: ScreenShellMainMode
  /** Solo modo inset: `hidden` evita scroll en `<main>` (p. ej. pantalla perfil). */
  mainOverflow?: 'auto' | 'hidden'
  /**
   * Full bleed: por defecto `main` usa overflow hidden; `visible` evita recortar overlays
   * que desbordan (p. ej. lista desplegable StreetSearch).
   */
  fullBleedMainOverflow?: 'hidden' | 'visible'
}

export default function ScreenShell({
  children,
  interactive = true,
  style = {},
  contentStyle = {},
  mainMode = SCREEN_SHELL_MAIN_MODE.INSET,
  mainOverflow = 'auto',
  fullBleedMainOverflow = 'hidden',
}: ScreenShellProps) {
  const fullBleed = mainMode === SCREEN_SHELL_MAIN_MODE.FULL_BLEED

  return (
    <div data-waitme-screen-shell={mainMode} style={{ ...shellRootStyle, ...style }}>
      <Header interactive={interactive} />
      <main
        data-waitme-main={mainMode}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          overflowY: fullBleed ? fullBleedMainOverflow : mainOverflow,
          overflowX: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ ...shellMainColumnStyle, ...contentStyle }}>{children}</div>
      </main>
      <BottomNav interactive={interactive} />
    </div>
  )
}
