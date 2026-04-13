import { Capacitor } from '@capacitor/core'
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Header from '../Header'
import BottomNav from '../BottomNav'
import {
  LAYOUT,
  SCREEN_SHELL_MAIN_MODE,
  shellInsetMainPaddingStyle,
  type ScreenShellMainMode,
} from './layout'

const shellRootStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  ...(Capacitor.isNativePlatform()
    ? { flex: 1, height: 'auto', width: '100%' }
    : { height: '100%' }),
}

export type ScreenShellProps = {
  children: ReactNode
  interactive?: boolean
  style?: CSSProperties
  contentStyle?: CSSProperties
  mainMode?: ScreenShellMainMode
  /** Solo modo inset: `hidden` evita scroll en `<main>` (p. ej. pantalla perfil). */
  mainOverflow?: 'auto' | 'hidden'
}

export default function ScreenShell({
  children,
  interactive = true,
  style = {},
  contentStyle = {},
  mainMode = SCREEN_SHELL_MAIN_MODE.INSET,
  mainOverflow = 'auto',
}: ScreenShellProps) {
  const fullBleed = mainMode === SCREEN_SHELL_MAIN_MODE.FULL_BLEED
  const headerRef = useRef<HTMLElement>(null)
  const navRef = useRef<HTMLElement>(null)
  /** Inset: sin fallback fijo (evita salto 64/88 → real). Primera medición en useLayoutEffect. */
  const [chromePx, setChromePx] = useState<{ header: number; nav: number }>({ header: 0, nav: 0 })

  useLayoutEffect(() => {
    if (import.meta.env.DEV) console.log('[SHELL]')
  }, [])

  useLayoutEffect(() => {
    if (fullBleed) return undefined

    const headerEl = headerRef.current
    const navEl = navRef.current
    if (!headerEl || !navEl) return undefined

    const measure = () => {
      setChromePx({
        header: Math.round(headerEl.getBoundingClientRect().height),
        nav: Math.round(navEl.getBoundingClientRect().height),
      })
    }

    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (ro) {
      ro.observe(headerEl)
      ro.observe(navEl)
    }
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [fullBleed])

  return (
    <div data-waitme-screen-shell={mainMode} style={{ ...shellRootStyle, ...style }}>
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
          overflowY: fullBleed ? 'hidden' : mainOverflow,
          overflowX: 'hidden',
          boxSizing: 'border-box',
          ...(fullBleed
            ? {}
            : shellInsetMainPaddingStyle(LAYOUT.screen.paddingX, chromePx.header, chromePx.nav)),
        }}
      >
        <div
          style={{
            width: '100%',
            minHeight: 0,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            ...(fullBleed
              ? { alignSelf: 'stretch' }
              : {
                  maxWidth: LAYOUT.screen.maxWidth,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }),
            ...contentStyle,
          }}
        >
          {children}
        </div>
      </main>
      <BottomNav ref={navRef} interactive={interactive} />
    </div>
  )
}
