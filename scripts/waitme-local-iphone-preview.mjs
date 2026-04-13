/**
 * LOCAL_DEV_MAC — única fuente de verdad para la URL del preview tipo iPhone en Safari (Mac).
 *
 * No mezclar con:
 * - App iOS instalada: carga solo `dist/` embebido (`npm run ios:embed:sync`), sin Vite ni localhost.
 * - WEB_PREVIEW_CLOUD (Vercel): origen HTTPS público.
 *
 * URL canónica: http://localhost:5173/?iphone=true
 */
import { VITE_DEV_PORT } from './vite-dev-5173.mjs'

/** Query canónica (`IphoneFrame.jsx` acepta `iphone=true` o `iphone=1`). */
export const WAITME_IPHONE_PREVIEW_SEARCH = '?iphone=true'

/**
 * @param {number} [port=VITE_DEV_PORT] puerto del servidor de desarrollo Vite.
 * @returns {string}
 */
export function waitmeLocalIphonePreviewUrl(port = VITE_DEV_PORT) {
  const p = Number(port)
  if (!Number.isFinite(p) || p <= 0) {
    throw new Error(`waitmeLocalIphonePreviewUrl: invalid port (${String(port)})`)
  }
  return `http://localhost:${p}${WAITME_IPHONE_PREVIEW_SEARCH}`
}
