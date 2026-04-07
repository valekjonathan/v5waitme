import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Producción: no definas `WAITME_CAP_DEV_SERVER_URL` al hacer `cap sync`.
 * Dev (Live Reload): `npm run dev:ios` / `npm run dev` o `npm run cap:live:on` (misma URL que `VITE_DEV_LAN_ORIGIN` en `.env.local`).
 * Solo `http://<IP_LAN>:<puerto Vite>` (10.x o 192.168.x). Nunca localhost, Vercel ni otros dominios.
 *
 * @see docs/DEV_IOS_LIVE_RELOAD.md
 * @see docs/FLUJO_JONATHAN.md
 */
function isPrivateLanIPv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!m) return false
  const a = Number(m[1])
  const b = Number(m[2])
  if (a === 127 || a === 0) return false
  if (a === 10) return true
  if (a === 192 && b === 168) return true
  return false
}

function assertLanDevServerUrl(url: string): void {
  const trimmed = url.trim()
  if (!trimmed) return
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('[waitme] WAITME_CAP_DEV_SERVER_URL no es una URL válida.')
  }
  if (parsed.protocol !== 'http:') {
    throw new Error('[waitme] WAITME_CAP_DEV_SERVER_URL debe ser http:// (no https ni Vercel).')
  }
  const host = parsed.hostname.toLowerCase()
  if (host.includes('vercel.app') || host.includes('vercel.com')) {
    throw new Error(
      '[waitme] No uses Vercel en WAITME_CAP_DEV_SERVER_URL. Usa la IP LAN del Mac (npm run dev → cap-live-ios).'
    )
  }
  if (host.includes('.') && !/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    throw new Error(
      '[waitme] WAITME_CAP_DEV_SERVER_URL no puede usar dominios externos; solo IP LAN 10.x.x.x o 192.168.x.x.'
    )
  }
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') {
    throw new Error(
      '[waitme] WAITME_CAP_DEV_SERVER_URL no puede ser localhost/127.0.0.1/0.0.0.0. Usa http://<IP_LAN>:5173 (npm run dev).'
    )
  }
  if (!isPrivateLanIPv4(host)) {
    throw new Error(
      '[waitme] WAITME_CAP_DEV_SERVER_URL debe ser IP LAN privada (10.x.x.x o 192.168.x.x), p. ej. http://192.168.0.50:5173.'
    )
  }
  const wantPort = String(process.env.VITE_DEV_PORT || '5173').trim() || '5173'
  const port = parsed.port
  if (!port || port !== wantPort) {
    throw new Error(
      `[waitme] WAITME_CAP_DEV_SERVER_URL debe incluir el puerto :${wantPort} (Vite dev), p. ej. http://${host}:${wantPort}`
    )
  }
}

const devUrl = String(process.env.WAITME_CAP_DEV_SERVER_URL ?? '').trim()
const isDev = Boolean(devUrl)

if (isDev) {
  assertLanDevServerUrl(devUrl)
}

const config: CapacitorConfig = {
  appId: 'es.waitme.v5waitme',
  appName: 'WaitMe',
  webDir: 'dist',
  ...(isDev
    ? {
        server: {
          url: devUrl,
          cleartext: true,
        },
      }
    : {}),
}

export default config
