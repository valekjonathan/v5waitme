/**
 * Única fuente de altura visible para layout (--app-height) y depuración de mapa/pin.
 * Usa `visualViewport` (barra de URL iOS, teclado, PWA); sin ramas por navegador.
 */

export function getWaitmeVisualViewportHeight() {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport
  if (vv && Number.isFinite(vv.height) && vv.height > 0) return vv.height
  return window.innerHeight
}

/**
 * Escribe variables CSS ligadas al visual viewport. Llamar antes del primer paint si es posible.
 */
export function syncWaitmeViewportCssVars() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  const vv = window.visualViewport
  const h = vv && vv.height > 0 ? vv.height : window.innerHeight
  const root = document.documentElement
  root.style.setProperty('--app-height', `${h}px`)
  root.style.setProperty('--vv-height', `${h}px`)
  root.style.setProperty('--vv-offset-top', `${vv?.offsetTop ?? 0}px`)
  root.style.setProperty('--vv-offset-left', `${vv?.offsetLeft ?? 0}px`)
}

let lastViewportDebugLog = 0

/** DEV: VIEWPORT HEIGHT, SAFE AREAS, OFFSET FINAL (limitado para no spamear en scroll). */
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
    VIEWPORT_HEIGHT: `${h}px`,
    SAFE_AREAS: { top: st, bottom: sb },
    OFFSET_FINAL: offset,
    ...extra,
  })
}

/**
 * Mantiene --app-height y variables auxiliares alineadas con el visual viewport.
 */
export function subscribeWaitmeViewportCssVars() {
  if (typeof window === 'undefined') return () => {}

  const run = () => {
    syncWaitmeViewportCssVars()
    logWaitmeViewportDebug()
  }

  run()

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
