/**
 * Shell: columna Header → `<main>` (referencia vertical útil) → BottomNav.
 * Hijos viven en `data-waitme-content-slot`; mapa usa `data-waitme-map-slot` para overlays.
 */
import { type CSSProperties, type ReactNode } from 'react'
import Header from '../Header'
import BottomNav from '../BottomNav'
import { SCREEN_SHELL_MAIN_MODE, type ScreenShellMainMode } from './layout'

const shellRootStyle: CSSProperties = {
  width: '100%',
  flex: 1,
  minHeight: 0,
  height: '100%',
  maxHeight: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflowX: 'hidden',
  overflowY: 'hidden',
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
   * Full bleed: por defecto `main` usa overflow-y auto; `visible` evita recortar overlays
   * que desbordan (p. ej. lista desplegable StreetSearch).
   */
  fullBleedMainOverflow?: 'auto' | 'hidden' | 'visible'
}

export default function ScreenShell({
  children,
  interactive = true,
  style = {},
  contentStyle = {},
  mainMode = SCREEN_SHELL_MAIN_MODE.INSET,
  mainOverflow = 'auto',
  fullBleedMainOverflow = 'auto',
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
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          overflowY: fullBleed ? fullBleedMainOverflow : mainOverflow,
          overflowX: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div data-waitme-content-slot style={{ ...shellMainColumnStyle, ...contentStyle }}>
          {children}
        </div>
      </main>
      <BottomNav interactive={interactive} />
    </div>
  )
}
