/**
 * Shell: columna flex — raíz y `<main>` en cadena flex (WKWebView); scroll inset en el slot.
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
  width: '100%',
  overflow: 'hidden',
  boxSizing: 'border-box',
}

type ScreenShellProps = {
  children: ReactNode
  interactive?: boolean
  style?: CSSProperties
  contentStyle?: CSSProperties
  /** Se fusiona en `<main>` (p. ej. `overflow: 'visible'` en mapa fullBleed para dropdowns). */
  screenMainStyle?: CSSProperties
  mainMode?: ScreenShellMainMode
  /** En modo inset: si `auto`, el scroll vive en el slot de contenido. */
  mainOverflow?: 'auto' | 'hidden'
  /** @deprecated Sin efecto; reservado por compatibilidad con llamadas antiguas. */
  fullBleedMainOverflow?: 'auto' | 'hidden' | 'visible'
}

export default function ScreenShell({
  children,
  interactive = true,
  style = {},
  contentStyle = {},
  screenMainStyle = {},
  mainMode = SCREEN_SHELL_MAIN_MODE.INSET,
  mainOverflow = 'auto',
  fullBleedMainOverflow: _fullBleedMainOverflow = 'auto',
}: ScreenShellProps) {
  const rootStyleMerged: CSSProperties = {
    ...shellRootStyle,
    ...style,
  }

  const mainStyle: CSSProperties = {
    flex: '1 1 0%',
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'column',
  }

  const mainOverflowResolved =
    mainMode === SCREEN_SHELL_MAIN_MODE.FULL_BLEED ? 'hidden' : mainOverflow

  const contentSlotStyle: CSSProperties = {
    flex: '1 1 0%',
    minHeight: 0,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'stretch',
    overflow: mainOverflowResolved,
    WebkitOverflowScrolling: mainOverflowResolved === 'auto' ? 'touch' : undefined,
  }

  return (
    <div data-waitme-screen-shell={mainMode} style={rootStyleMerged}>
      <Header interactive={interactive} />
      <main data-waitme-main={mainMode} style={{ ...mainStyle, ...screenMainStyle }}>
        <div data-waitme-content-slot style={{ ...contentSlotStyle, ...contentStyle }}>
          {children}
        </div>
      </main>
      <BottomNav interactive={interactive} />
    </div>
  )
}
