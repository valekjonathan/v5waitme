import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Producción: no definas `WAITME_CAP_DEV_SERVER_URL` al hacer `cap sync`.
 * Dev (Live Reload): `npm run cap:live:on` y luego `npm run dev` + Xcode Run.
 *
 * @see docs/DEV_IOS_LIVE_RELOAD.md
 */
const devUrl = String(process.env.WAITME_CAP_DEV_SERVER_URL ?? '').trim()
const isDev = Boolean(devUrl)

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
