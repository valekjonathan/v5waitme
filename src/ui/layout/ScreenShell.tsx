/**
 * Shell: columna Header → `<main>` (referencia vertical útil) → BottomNav.
 * Hijos viven en `data-waitme-content-slot`; mapa usa `data-waitme-map-slot` para overlays.
 */
import { type CSSProperties, type ReactNode } from 'react'
import Header from '../Header'
import BottomNav from '../BottomNav'
import { SCREEN_SHELL_MAIN_MODE, type ScreenShellMainMode } from './layout'

const shellRootStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 0%',
  minHeight: 0,
  maxHeight: '100%',
  overflowX: 'hidden',
  overflowY: 'hidden',
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
  /** Reservado (API estable); overflow del `<main>` fijado para iOS PWA. */
  mainOverflow?: 'auto' | 'hidden'
  /** Reservado (API estable); overflow del `<main>` fijado para iOS PWA. */
  fullBleedMainOverflow?: 'auto' | 'hidden' | 'visible'
}

export default function ScreenShell({
  children,
  interactive = true,
  style = {},
  contentStyle = {},
  mainMode = SCREEN_SHELL_MAIN_MODE.INSET,
  mainOverflow: _mainOverflow = 'auto',
  fullBleedMainOverflow: _fullBleedMainOverflow = 'auto',
}: ScreenShellProps) {
  return (
    <div data-waitme-screen-shell={mainMode} style={{ ...shellRootStyle, ...style }}>
      <Header interactive={interactive} />
      <main
        data-waitme-main={mainMode}
        style={{
          flex: 1,
          minHeight: 0,
          height: 'auto',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
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
