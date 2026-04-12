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
  height: '100%',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
}

/**
 * Valores previos a la primera medición (solo evitan 0px un frame). Deben ser sustituidos
 * al instante por ResizeObserver; no son el contrato de layout (eso son las medidas reales).
 */
const CHROME_MEASURE_FALLBACK_HEADER_PX = 64
const CHROME_MEASURE_FALLBACK_NAV_PX = 88

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
  const [chromePx, setChromePx] = useState<{ header: number; nav: number }>({
    header: CHROME_MEASURE_FALLBACK_HEADER_PX,
    nav: CHROME_MEASURE_FALLBACK_NAV_PX,
  })

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
