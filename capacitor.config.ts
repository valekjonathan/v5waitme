import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Producción / App Store: nunca defines `WAITME_CAP_DEV_SERVER_URL`.
 * Live reload (solo dev): `npm run cap:live:on` → sync con server.url temporal en ios/.
 *
 * @see docs/DEV_IOS_LIVE_RELOAD.md
 */
const devServerUrl = String(process.env.WAITME_CAP_DEV_SERVER_URL ?? '').trim()

const config: CapacitorConfig = {
  appId: 'es.waitme.v5waitme',
  appName: 'WaitMe',
  webDir: 'dist',
  ...(devServerUrl
    ? {
        server: {
          url: devServerUrl,
          cleartext: true,
        },
      }
    : {}),
}

export default config
