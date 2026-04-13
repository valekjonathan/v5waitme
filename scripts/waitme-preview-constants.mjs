/**
 * URL canónica del preview tipo iPhone en Mac (Safari + marco interno `IphoneFrame`).
 * Una sola fuente para dev-ios, dev-web y dev-safari-live-reload.
 */
import { VITE_DEV_PORT } from './vite-dev-5173.mjs'

export const WAITME_IPHONE_PREVIEW_QUERY = 'iphone=true'

/** BrowserSync proxy (live-reload snippet); mismo query que Vite directo. */
export const WAITME_BROWSER_SYNC_PREVIEW_PORT = 5175

export function waitmeIphonePreviewUrl(port = VITE_DEV_PORT) {
  return `http://localhost:${port}/?${WAITME_IPHONE_PREVIEW_QUERY}`
}
