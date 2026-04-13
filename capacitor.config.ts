import type { CapacitorConfig } from '@capacitor/cli'

/**
 * App nativa iOS: solo bundle estático embebido (`webDir: dist`).
 * No `server`, no `server.url`, no live reload: el WKWebView carga `dist/` copiado en el proyecto Xcode.
 * Flujo: `npm run ios:embed:sync` (build + `cap sync ios` sin variables de dev).
 */
const config: CapacitorConfig = {
  appId: 'es.waitme.v5waitme',
  appName: 'WaitMe',
  webDir: 'dist',
}

export default config
