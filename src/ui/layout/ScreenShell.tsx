/**
 * Shell: columna Header → `<main>` (referencia vertical útil) → BottomNav.
 * El alto útil global lo fija `App.jsx` en `html` (`--app-height` desde visualViewport); esta columna lo hereda por flex.
 * BottomNav fijo usa `--vv-offset-top` + `--waitme-bottom-nav-h` solo en modo standalone (ver `readStandaloneDisplayMode`).
 */
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { Capacitor } from '@capacitor/core'
import Header from '../Header'
import BottomNav from '../BottomNav'
import { SCREEN_SHELL_MAIN_MODE, type ScreenShellMainMode } from './layout'

function readStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false
  const mq =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone =
    typeof navigator !== 'undefined' &&
    'standalone' in navigator &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  const capacitorNative = Capacitor.isNativePlatform() === true
  return Boolean(mq || iosStandalone || capacitorNative)
}

const shellRootStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
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

type ScreenShellProps = {
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
  const standalone = useMemo(() => readStandaloneDisplayMode(), [])
  const bottomNavRef = useRef<HTMLElement | null>(null)
  const [navHeightPx, setNavHeightPx] = useState(0)

  useLayoutEffect(() => {
    if (!standalone) {
      setNavHeightPx(0)
      return undefined
    }
    const el = bottomNavRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined

    const measure = () => {
      const h = el.getBoundingClientRect().height
      setNavHeightPx(Math.ceil(h))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [standalone])

  const navVar =
    standalone && navHeightPx > 0 ? (`${navHeightPx}px` as const) : standalone ? '0px' : undefined

  const rootStyleMerged: CSSProperties = {
    ...shellRootStyle,
    ...style,
    ...(navVar != null ? ({ ['--waitme-bottom-nav-h' as string]: navVar } as CSSProperties) : {}),
  }

  const mainStyle: CSSProperties = {
    flex: 1,
    minHeight: 0,
    height: 'auto',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    ...(standalone ? { paddingBottom: 'var(--waitme-bottom-nav-h, 0px)' } : {}),
  }

  return (
    <div data-waitme-screen-shell={mainMode} style={rootStyleMerged}>
      <Header interactive={interactive} />
      <main data-waitme-main={mainMode} style={mainStyle}>
        <div data-waitme-content-slot style={{ ...shellMainColumnStyle, ...contentStyle }}>
          {children}
        </div>
      </main>
      <BottomNav ref={bottomNavRef} interactive={interactive} fixedToViewport={standalone} />
    </div>
  )
}
