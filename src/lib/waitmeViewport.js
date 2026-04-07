/**
 * Única fuente: altura visible = solo `visualViewport.height` (sin `window.innerHeight`).
 * `--app-height`, safe areas en CSS, y offset de cámara Mapbox para el pin (Home / parking).
 */

import { GAP_CARD_TOP, GAP_SEARCH_BOTTOM } from '../features/map/mapGapSelectors.js'

/** Centro vertical del visual viewport en coordenadas de cliente (p. ej. `offsetTop + height/2`). */
export function getWaitmeVisualViewportCenterClientY() {
  if (typeof window === 'undefined') return null
  const vv = window.visualViewport
  const h = getWaitmeVisualViewportHeight()
  if (!vv || !(h > 0)) return null
  return vv.offsetTop + h / 2
}

export function getWaitmeVisualViewportHeight() {
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
  const visualCenterY = getWaitmeVisualViewportCenterClientY()
  const offset =
    typeof window.__WAITME_PIN_OFFSET_Y__ === 'number' ? window.__WAITME_PIN_OFFSET_Y__ : 'n/a'
  console.info('[WaitMe][VIEWPORT]', {
    VIEWPORT_HEIGHT: h > 0 ? `${h}px` : '(sin visualViewport aún; CSS fallback)',
    VISUAL_CENTER_Y: visualCenterY != null ? `${visualCenterY}px` : 'n/a',
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
 */
export function subscribeWaitmeViewportCssVars() {
  if (typeof window === 'undefined') return () => {}

  const run = () => {
    syncWaitmeViewportCssVars()
    logWaitmeViewportDebug()
  }

  run()
  return subscribeWaitmeViewportEvents(run)
}

function measureWaitmePinVsMapCenter(pinEl, mapShellEl) {
  if (!pinEl || !mapShellEl) return null
  const pinRect = pinEl.getBoundingClientRect()
  const mapRect = mapShellEl.getBoundingClientRect()
  const pinTipY = pinRect.bottom
  const mapCenterY = mapRect.top + mapRect.height / 2
  return { offsetY: pinTipY - mapCenterY, pinTipY, mapCenterY }
}

/**
 * Home/Login: `__WAITME_PIN_OFFSET_Y__` = punta del pin vs centro vertical del mapa.
 * Parking con hueco medible: cámara con project/unproject (sin offset global).
 */
export function applyWaitmePinAndParkingCamera(pinEl, mapShellEl, parkingBandPinAdjust) {
  if (typeof window === 'undefined' || !pinEl || !mapShellEl) return

  const measured = measureWaitmePinVsMapCenter(pinEl, mapShellEl)
  if (!measured) return
  const offsetVersusMapCenter = measured.offsetY

  if (!parkingBandPinAdjust) {
    window.__WAITME_PIN_OFFSET_Y__ = offsetVersusMapCenter
    logWaitmeViewportDebug({
      mapOffsetY_px: offsetVersusMapCenter,
      mapCenterY_vs_pinTip: {
        mapCenterY_px: measured.mapCenterY,
        pinTipY_px: measured.pinTipY,
      },
    })
    return
  }

  const searchEl = document.querySelector(GAP_SEARCH_BOTTOM)
  const cardEl = document.querySelector(GAP_CARD_TOP)
  if (!searchEl || !cardEl) {
    window.__WAITME_PIN_OFFSET_Y__ = offsetVersusMapCenter
    logWaitmeViewportDebug({ mapOffsetY_px: offsetVersusMapCenter })
    return
  }
  const searchBottom = searchEl.getBoundingClientRect().bottom
  const cardTop = cardEl.getBoundingClientRect().top
  if (!(cardTop > searchBottom)) {
    window.__WAITME_PIN_OFFSET_Y__ = offsetVersusMapCenter
    logWaitmeViewportDebug({ mapOffsetY_px: offsetVersusMapCenter })
    return
  }

  delete window.__WAITME_PIN_OFFSET_Y__
  logWaitmeViewportDebug({ mapOffsetY_px: 'gap-mode' })
}
