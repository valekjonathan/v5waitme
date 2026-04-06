/**
 * Shell: Header → `<main>` (sin scroll; iOS) → BottomNav fixed.
 * Scroll global: `body` (`global.css`).
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

const mainStyle: CSSProperties = {
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
  /** @deprecated Sin efecto: el scroll vive en `body`. */
  mainOverflow?: 'auto' | 'hidden'
  /** @deprecated Sin efecto. */
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
  const rootStyleMerged: CSSProperties = {
    ...shellRootStyle,
    ...style,
  }

  return (
    <div data-waitme-screen-shell={mainMode} style={rootStyleMerged}>
      <Header interactive={interactive} />
      <main data-waitme-main={mainMode} style={mainStyle}>
        <div data-waitme-content-slot style={{ ...shellMainColumnStyle, ...contentStyle }}>
          {children}
        </div>
      </main>
      <BottomNav interactive={interactive} />
    </div>
  )
}
