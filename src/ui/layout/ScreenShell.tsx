/**
 * Shell: Header y BottomNav en flujo `block`; `<main>` con alto explícito
 * `calc(var(--app-height) - medida header - medida nav)` (sin grid 1fr ni flex en `<main>`).
 * El hueco central coincide en Safari / WKWebView; el slot hijo llena `main` al 100%.
 */
import { type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from 'react'
import Header from '../Header'
import BottomNav from '../BottomNav'
import { SCREEN_SHELL_MAIN_MODE, type ScreenShellMainMode } from './layout'

/** Evita main con alto 0 antes de medir (safe area + fila ~40px + paddings). */
const CHROME_FALLBACK_PX = 72

const shellRootStyle: CSSProperties = {
  display: 'block',
  height: 'var(--app-height)',
  width: '100%',
  overflow: 'hidden',
  boxSizing: 'border-box',
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
  const headerRef = useRef<HTMLElement | null>(null)
  const navRef = useRef<HTMLElement | null>(null)
  const [chromePx, setChromePx] = useState({
    top: CHROME_FALLBACK_PX,
    bottom: CHROME_FALLBACK_PX,
  })

  useLayoutEffect(() => {
    const headerEl = headerRef.current
    const navEl = navRef.current

    const measure = () => {
      setChromePx({
        top: headerEl?.offsetHeight ?? 0,
        bottom: navEl?.offsetHeight ?? 0,
      })
    }

    measure()

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            measure()
          })
        : null

    if (headerEl && ro) ro.observe(headerEl)
    if (navEl && ro) ro.observe(navEl)
    window.addEventListener('resize', measure)

    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const rootStyleMerged: CSSProperties = {
    ...shellRootStyle,
    ...style,
  }

  const mainOverflowResolved =
    mainMode === SCREEN_SHELL_MAIN_MODE.FULL_BLEED ? 'hidden' : mainOverflow

  const mainHeight = `calc(var(--app-height) - ${chromePx.top}px - ${chromePx.bottom}px)`

  const mainStyleMerged: CSSProperties = {
    display: 'block',
    height: mainHeight,
    width: '100%',
    overflow: mainOverflowResolved,
    boxSizing: 'border-box',
    WebkitOverflowScrolling: mainOverflowResolved === 'auto' ? 'touch' : undefined,
  }

  const isFullBleed = mainMode === SCREEN_SHELL_MAIN_MODE.FULL_BLEED
  const shellMainColumnStyle: CSSProperties = {
    width: '100%',
    ...(isFullBleed
      ? { height: '100%', minHeight: 0 }
      : { minHeight: '100%', minWidth: 0 }),
    maxWidth: 'none',
    margin: 0,
    padding: 0,
    boxSizing: 'border-box',
  }

  return (
    <div data-waitme-screen-shell={mainMode} style={rootStyleMerged}>
      <Header ref={headerRef} interactive={interactive} />
      <main data-waitme-main={mainMode} style={mainStyleMerged}>
        <div data-waitme-content-slot style={{ ...shellMainColumnStyle, ...contentStyle }}>
          {children}
        </div>
      </main>
      <BottomNav ref={navRef} interactive={interactive} />
    </div>
  )
}
