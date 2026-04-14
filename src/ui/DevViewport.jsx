import { Capacitor } from '@capacitor/core'
import { useLayoutEffect } from 'react'

const DEV_VIEWPORT_WIDTH_PX = 390

export function isStandaloneDisplayMode(win) {
  if (!win) return false
  try {
    if (win.matchMedia?.('(display-mode: standalone)')?.matches) return true
  } catch {
    /* */
  }
  return win.navigator?.standalone === true
}

export function shouldUseDevViewport(win) {
  if (!win || !import.meta.env.DEV) return false
  if (Capacitor.isNativePlatform()) return false
  return !isStandaloneDisplayMode(win)
}

const devViewportRootStyle = {
  width: `${DEV_VIEWPORT_WIDTH_PX}px`,
  maxWidth: '100vw',
  height: '100%',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

export default function DevViewport({ children }) {
  const enabled = typeof window !== 'undefined' && shouldUseDevViewport(window)

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !enabled) return undefined
    const el = document.documentElement
    el.setAttribute('data-waitme-dev-viewport', 'ios')
    return () => el.removeAttribute('data-waitme-dev-viewport')
  }, [enabled])

  if (!enabled) return <>{children}</>

  return <div data-waitme-dev-viewport-root style={devViewportRootStyle}>{children}</div>
}
