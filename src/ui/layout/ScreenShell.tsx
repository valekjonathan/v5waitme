/**
 * Shell: columna Header → `<main>` → BottomNav. Inyecta --waitme-shell-header-h / --waitme-shell-nav-h
 * para que MAP_SHELL_OVERLAY en layout.ts alinee overlays del mapa con el viewport histórico.
 */
import { useCallback, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
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
  const shellRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const navRef = useRef<HTMLElement>(null)

  const syncChromeCssVars = useCallback(() => {
    const root = shellRef.current
    const head = headerRef.current
    const nav = navRef.current
    if (!root || !head || !nav) return
    const h = Math.round(head.getBoundingClientRect().height)
    const n = Math.round(nav.getBoundingClientRect().height)
    root.style.setProperty('--waitme-shell-header-h', `${h}px`)
    root.style.setProperty('--waitme-shell-nav-h', `${n}px`)
  }, [])

  useLayoutEffect(() => {
    const root = shellRef.current
    const head = headerRef.current
    const nav = navRef.current
    if (!root || !head || !nav) return undefined

    syncChromeCssVars()
    const ro = new ResizeObserver(syncChromeCssVars)
    ro.observe(head)
    ro.observe(nav)
    const vv = window.visualViewport
    vv?.addEventListener('resize', syncChromeCssVars)
    window.addEventListener('resize', syncChromeCssVars)
    return () => {
      ro.disconnect()
      vv?.removeEventListener('resize', syncChromeCssVars)
      window.removeEventListener('resize', syncChromeCssVars)
    }
  }, [syncChromeCssVars])

  return (
    <div ref={shellRef} data-waitme-screen-shell={mainMode} style={{ ...shellRootStyle, ...style }}>
      <Header ref={headerRef} interactive={interactive} />
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
      <BottomNav ref={navRef} interactive={interactive} />
    </div>
  )
}
