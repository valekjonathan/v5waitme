import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Producción: no definas `WAITME_CAP_DEV_SERVER_URL` al hacer `cap sync`.
 * Dev (Live Reload): `npm run dev` (vía `scripts/cap-live-ios.mjs`) o `npm run cap:live:on`.
 * La URL debe ser `http://<IP_LAN>:5173` — nunca localhost (el iPhone no puede resolverla).
 *
 * @see docs/DEV_IOS_LIVE_RELOAD.md
 */
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
    throw new Error('[waitme] WAITME_CAP_DEV_SERVER_URL debe ser http:// (dev cleartext).')
  }
  const host = parsed.hostname.toLowerCase()
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') {
    throw new Error(
      '[waitme] WAITME_CAP_DEV_SERVER_URL no puede ser localhost/127.0.0.1/0.0.0.0. Usa la IP LAN del Mac, p. ej. http://192.168.0.50:5173 (la pone `npm run dev`).'
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
