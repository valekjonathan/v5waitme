import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Producción: solo bundle embebido (`webDir: dist`). No `server` aquí.
 * Live Reload LAN: `npm run cap:live:on` o `npm run dev:ios` inyectan `server.url` en
 * `ios/App/App/capacitor.config.json` tras `cap sync` (véase scripts/inject-ios-cap-dev-server.mjs).
 */
const config: CapacitorConfig = {
  appId: 'es.waitme.v5waitme',
  appName: 'WaitMe',
  webDir: 'dist',
}

export default config
