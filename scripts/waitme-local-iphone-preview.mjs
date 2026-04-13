/**
 * LOCAL_DEV_MAC — única fuente de verdad para el preview tipo iPhone en Safari (Mac).
 *
 * No mezclar con:
 * - WEB_PREVIEW_CLOUD (Vercel): origen HTTPS público; `?iphone=true` opcional para demo.
 * - IOS_BETA_REAL (Capacitor): sin localhost; OAuth vía esquema nativo en auth.js.
 *
 * URL final típica: http://localhost:5173/?iphone=true
 */
import { VITE_DEV_PORT } from './vite-dev-5173.mjs'

/** Query canónica (IphoneFrame.jsx lee `iphone=true` o `iphone=1`). */
export const WAITME_IPHONE_PREVIEW_SEARCH = '?iphone=true'

/** BrowserSync proxy (dev-safari-live-reload): mismo query sobre el puerto del proxy. */
export const WAITME_BROWSER_SYNC_PREVIEW_PORT = 5175

/**
 * @param {number} [port=VITE_DEV_PORT] puerto del servidor (Vite directo o proxy).
 * @returns {string}
 */
export function waitmeLocalIphonePreviewUrl(port = VITE_DEV_PORT) {
  const p = Number(port)
  if (!Number.isFinite(p) || p <= 0) {
    throw new Error(`waitmeLocalIphonePreviewUrl: invalid port (${String(port)})`)
  }
  return `http://localhost:${p}${WAITME_IPHONE_PREVIEW_SEARCH}`
}
