import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Evita el mismo aviso dos veces cuando herramientas cargan esta config más de una vez en el mismo proceso. */
let sentryUploadHintLogged = false

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
  const sentryOrg = String(process.env.SENTRY_ORG || process.env.VITE_SENTRY_ORG || '').trim()
  const sentryProject = String(
    process.env.SENTRY_PROJECT || process.env.VITE_SENTRY_PROJECT || ''
  ).trim()
  const sentryUploadReady = Boolean(sentryAuth && sentryOrg && sentryProject)
  const sentryPlugins =
    command === 'build' && sentryUploadReady
      ? [
          sentryVitePlugin({
            org: sentryOrg,
            project: sentryProject,
            authToken: sentryAuth,
          }),
        ]
      : []
  if (command === 'build' && !sentryUploadReady && !sentryUploadHintLogged) {
    sentryUploadHintLogged = true
    console.warn(
      '[vite] Build sin @sentry/vite-plugin: definen SENTRY_AUTH_TOKEN, SENTRY_ORG|VITE_SENTRY_ORG, SENTRY_PROJECT|VITE_SENTRY_PROJECT para subir sourcemaps.'
    )
  }

  return {
    /** Producción: rutas relativas para empaquetar `dist/` en Capacitor iOS; dev y Vercel en raíz siguen bien. */
    base: command === 'build' ? './' : '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    plugins: [react(), ...sentryPlugins],
    optimizeDeps: {
      include: ['mapbox-gl'],
    },
    build: {
      chunkSizeWarningLimit: 2500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/@supabase')) return 'supabase'
          },
        },
      },
    },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
    },
  }
})
