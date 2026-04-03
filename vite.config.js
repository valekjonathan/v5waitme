import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig(({ mode, command }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '')
  const url = String(fileEnv.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const key = String(
    fileEnv.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  ).trim()
  if (!url || !key) {
    if (command === 'build') {
      throw new Error(
        '[vite] Build bloqueado: definen VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (p. ej. .env.local o variables del proveedor de deploy).'
      )
    }
    console.warn(
      '[vite] Sin VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY: `npm run dev` continúa; auth y perfil quedan desactivados hasta configurar el entorno.'
    )
  }

  const sentryAuth = String(process.env.SENTRY_AUTH_TOKEN || '').trim()
  const sentryOrg = String(process.env.VITE_SENTRY_ORG || process.env.SENTRY_ORG || '').trim()
  const sentryProject = String(
    process.env.VITE_SENTRY_PROJECT || process.env.SENTRY_PROJECT || ''
  ).trim()
  const sentryPlugins =
    command === 'build' && sentryAuth && sentryOrg && sentryProject
      ? [
          sentryVitePlugin({
            org: sentryOrg,
            project: sentryProject,
            authToken: sentryAuth,
          }),
        ]
      : []

  return {
    plugins: [react(), ...sentryPlugins],
    build: { chunkSizeWarningLimit: 2500 },
    server: {
      host: 'localhost',
      port: 5173,
      strictPort: true,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
      hmr: {
        overlay: false,
      },
      watch: {
        usePolling: true,
      },
    },
  }
})
