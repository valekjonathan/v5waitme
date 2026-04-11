/**
 * Única fuente para layout: `visualViewport.height` → `--app-height` (sin `window.innerHeight`).
 * El offset de cámara del pin vive en `Map.jsx` (solo `getBoundingClientRect` del contenedor Mapbox).
 */

function getWaitmeVisualViewportHeight() {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport
  if (vv && Number.isFinite(vv.height) && vv.height > 0) return vv.height
  return 0
}

/**
 * Escribe variables CSS ligadas al visual viewport. Solo cuando `visualViewport.height` es válido
 * (sin rellenar con `innerHeight`: Safari vs WKWebView quedarían desalineados).
 */
export function syncWaitmeViewportCssVars() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  const vv = window.visualViewport
  if (!vv || !(vv.height > 0)) return
  const h = vv.height
  const root = document.documentElement
  root.style.setProperty('--app-height', `${h}px`)
  root.style.setProperty('--vv-height', `${h}px`)
  root.style.setProperty('--vv-offset-top', `${vv.offsetTop ?? 0}px`)
  root.style.setProperty('--vv-offset-left', `${vv.offsetLeft ?? 0}px`)
}

let lastViewportDebugLog = 0

/** DEV: altura visual viewport, safe areas, offset final de cámara (anti-spam en scroll). */
export function logWaitmeViewportDebug(extra = {}) {
  if (!import.meta.env.DEV || typeof document === 'undefined' || typeof window === 'undefined') {
    return
  }
  const now = Date.now()
  if (now - lastViewportDebugLog < 400) return
  lastViewportDebugLog = now
  const h = getWaitmeVisualViewportHeight()
  const cs = getComputedStyle(document.documentElement)
  const st = cs.getPropertyValue('--safe-top').trim() || '0px'
  const sb = cs.getPropertyValue('--safe-bottom').trim() || '0px'
  const offset =
    typeof window.__WAITME_PIN_OFFSET_Y__ === 'number' ? window.__WAITME_PIN_OFFSET_Y__ : 'n/a'
  console.info('[WaitMe][VIEWPORT]', {
    VIEWPORT_HEIGHT: h > 0 ? `${h}px` : '(sin visualViewport aún; CSS fallback)',
    SAFE_AREAS: { top: st, bottom: sb },
    OFFSET_FINAL: offset,
    ...extra,
  })
}

/**
 * Mismos eventos en todos los entornos: `visualViewport` resize/scroll + ventana resize/orientación.
 */
export function subscribeWaitmeViewportEvents(handler) {
  if (typeof window === 'undefined') return () => {}

  const run = () => handler()
  const vv = window.visualViewport
  vv?.addEventListener('resize', run)
  vv?.addEventListener('scroll', run)
  window.addEventListener('resize', run)
  window.addEventListener('orientationchange', run)

  return () => {
    vv?.removeEventListener('resize', run)
    vv?.removeEventListener('scroll', run)
    window.removeEventListener('resize', run)
    window.removeEventListener('orientationchange', run)
  }
}

/**
 * Mantiene `--app-height` y variables auxiliares; reutiliza la misma suscripción de eventos que el mapa.
 * Primer frame en WKWebView: `visualViewport.height` a veces es 0; se reintenta en rAF y microtarea.
 */
export function subscribeWaitmeViewportCssVars() {
  if (typeof window === 'undefined') return () => {}

  const run = () => {
    syncWaitmeViewportCssVars()
    logWaitmeViewportDebug()
  }

  run()
  const rafId = window.requestAnimationFrame(run)
  const t0 = window.setTimeout(run, 0)
  const unsub = subscribeWaitmeViewportEvents(run)

  return () => {
    window.cancelAnimationFrame(rafId)
    window.clearTimeout(t0)
    unsub()
  }
}
