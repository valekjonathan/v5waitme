import { useLayoutEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'

/**
 * Safari Mac + Vite dev + localhost: marco tipo iPhone para orientar el layout.
 * No producción, no túnel/ngrok, no Capacitor, no viewport estrecho (móvil real).
 */
export function isWaitmeDevDesktopLocalhostPreview() {
  if (typeof window === 'undefined') return false
  if (!import.meta.env.DEV) return false
  if (Capacitor.isNativePlatform()) return false
  const host = window.location.hostname
  if (host !== 'localhost' && host !== '127.0.0.1') return false
  if (typeof window.matchMedia !== 'function') return false
  if (window.matchMedia('(max-width: 767px)').matches) return false
  if (window.navigator.standalone === true) return false
  return true
}

/**
 * Contenedor opcional en dev: centra la app y mide el alto real del “teléfono”
 * para `--app-height` (evita mezclar altura de ventana con el marco).
 */
export function DevRootChrome({ children }) {
  const innerRef = useRef(null)
  const enabled = typeof window !== 'undefined' && isWaitmeDevDesktopLocalhostPreview()

  useLayoutEffect(() => {
    if (!enabled) return undefined
    const el = document.documentElement
    el.classList.add('waitme-dev-root-frame')
    const inner = innerRef.current
    if (!inner) {
      return () => {
        el.classList.remove('waitme-dev-root-frame')
      }
    }

    const sync = () => {
      const r = inner.getBoundingClientRect()
      const h = Math.round(r.height)
      if (h > 0) {
        el.style.setProperty('--app-height', `${h}px`)
      }
      window.dispatchEvent(new Event('resize'))
    }

    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(inner)
    window.addEventListener('resize', sync)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', sync)
      el.classList.remove('waitme-dev-root-frame')
      el.style.removeProperty('--app-height')
    }
  }, [enabled])

  if (!enabled) return children

  return (
    <div
      data-waitme-dev-root-chrome
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#121214',
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      <div
        ref={innerRef}
        data-waitme-dev-phone-surface
        style={{
          width: '100%',
          maxWidth: 390,
          height: 'min(844px, calc(100vh - 48px))',
          borderRadius: 44,
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          background: '#000',
        }}
      >
        {children}
      </div>
    </div>
  )
}

/** En runtime real el contenido va al viewport; el marco solo vive en `DevRootChrome`. */
export default function IphoneFrame({ children }) {
  return children
}
