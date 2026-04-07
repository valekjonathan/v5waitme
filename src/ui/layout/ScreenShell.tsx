/**
 * Shell: Header → `<main>` (scroll en inset) → BottomNav (flujo normal).
 * Grid `auto 1fr auto` + `height: var(--app-height)`: la fila central tiene alto definido
 * (mismo cálculo Safari / WKWebView); el mapa no depende de flex-basis entre motores.
 */
import { type CSSProperties, type ReactNode } from 'react'
import Header from '../Header'
import BottomNav from '../BottomNav'
import { SCREEN_SHELL_MAIN_MODE, type ScreenShellMainMode } from './layout'

const shellRootStyle: CSSProperties = {
  display: 'grid',
  gridTemplateRows: 'auto 1fr auto',
  gridTemplateColumns: 'minmax(0, 1fr)',
  height: 'var(--app-height)',
  width: '100%',
  overflow: 'hidden',
  boxSizing: 'border-box',
}

const mainStyleBase: CSSProperties = {
  minHeight: 0,
  minWidth: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxSizing: 'border-box',
}

const shellMainColumnStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  maxWidth: 'none',
  margin: 0,
  padding: 0,
  minHeight: 0,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  alignSelf: 'stretch',
}

type ScreenShellProps = {
  children: ReactNode
  interactive?: boolean
  style?: CSSProperties
  contentStyle?: CSSProperties
  mainMode?: ScreenShellMainMode
  /** En modo inset: si `auto`, el scroll vive en `<main>`. */
  mainOverflow?: 'auto' | 'hidden'
  /** @deprecated Sin efecto; reservado por compatibilidad con llamadas antiguas. */
  fullBleedMainOverflow?: 'auto' | 'hidden' | 'visible'
}

export default function ScreenShell({
  children,
  interactive = true,
  style = {},
  contentStyle = {},
  mainMode = SCREEN_SHELL_MAIN_MODE.INSET,
  mainOverflow = 'auto',
  fullBleedMainOverflow: _fullBleedMainOverflow = 'auto',
}: ScreenShellProps) {
  const rootStyleMerged: CSSProperties = {
    ...shellRootStyle,
    ...style,
  }

  const mainOverflowResolved =
    mainMode === SCREEN_SHELL_MAIN_MODE.FULL_BLEED ? 'hidden' : mainOverflow

  const mainStyleMerged: CSSProperties = {
    ...mainStyleBase,
    overflow: mainOverflowResolved,
    WebkitOverflowScrolling: mainOverflowResolved === 'auto' ? 'touch' : undefined,
  }

  return (
    <div data-waitme-screen-shell={mainMode} style={rootStyleMerged}>
      <Header interactive={interactive} />
      <main data-waitme-main={mainMode} style={mainStyleMerged}>
        <div data-waitme-content-slot style={{ ...shellMainColumnStyle, ...contentStyle }}>
          {children}
        </div>
      </main>
      <BottomNav interactive={interactive} />
    </div>
  )
}
