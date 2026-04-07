/**
 * Shell: Header → `<main>` (scroll en inset) → BottomNav (fixed al viewport).
 * Modo fullBleed: `<main>` sin scroll; el mapa/overlays rellenan el slot.
 */
import { type CSSProperties, type ReactNode } from 'react'
import Header from '../Header'
import BottomNav from '../BottomNav'
import { SCREEN_SHELL_MAIN_MODE, type ScreenShellMainMode } from './layout'

const shellRootStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: 'var(--app-height)',
  width: '100%',
  overflow: 'hidden',
}

const mainStyleBase: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
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
