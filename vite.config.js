import { networkInterfaces } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Evita el mismo aviso dos veces cuando herramientas cargan esta config más de una vez en el mismo proceso. */
let sentryUploadHintLogged = false

/** Misma idea que `scripts/get-lan-ip.mjs`: solo 10.x / 192.168.x, sin interfaces virtuales. */
function preferredLanIPv4() {
  const skipName = (name) => {
    const n = String(name).toLowerCase()
    if (n === 'lo0' || n === 'lo') return true
    return (
      /^utun\d*$/.test(n) ||
      /^awdl\d*$/.test(n) ||
      /^llw\d*$/.test(n) ||
      /^bridge\d*$/.test(n) ||
      n.includes('docker') ||
      n.includes('veth') ||
      n.includes('vmnet') ||
      n.includes('virbr') ||
      n.startsWith('br-') ||
      n.startsWith('tun') ||
      n.startsWith('tap') ||
      n.includes('cni') ||
      n.includes('vbox') ||
      n.includes('vethernet')
    )
  }
  const ok = (addr) => {
    const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(addr)
    if (!m) return false
    const a = Number(m[1])
    const b = Number(m[2])
    if (a === 127 || a === 0) return false
    if (a === 10) return true
    if (a === 192 && b === 168) return true
    return false
  }
  const candidates = []
  for (const [name, list] of Object.entries(networkInterfaces())) {
    if (!list || skipName(name)) continue
    for (const n of list) {
      if (n.family !== 'IPv4' || n.internal) continue
      if (ok(n.address)) candidates.push({ name, address: n.address })
    }
  }
  if (candidates.length === 0) return null
  const en0 = candidates.find((c) => c.name === 'en0')
  return (en0 ?? candidates[0]).address
}

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

  const devLanOriginEnv = String(fileEnv.VITE_DEV_LAN_ORIGIN || '').trim()
  const lanIpForDev = command === 'serve' ? preferredLanIPv4() : null
  const resolvedDevLanOrigin =
    command === 'serve' && mode === 'development'
      ? devLanOriginEnv || (lanIpForDev ? `http://${lanIpForDev}:5173` : '')
      : ''

  return {
    /** Producción: rutas relativas para empaquetar `dist/` en Capacitor iOS. */
    base: command === 'build' ? './' : '/',
    ...(command === 'serve'
      ? {
          define: {
            'import.meta.env.VITE_DEV_LAN_ORIGIN': JSON.stringify(resolvedDevLanOrigin),
          },
        }
      : {}),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    plugins: [
      react(),
      ...(command === 'serve'
        ? [
            {
              name: 'waitme-dev-server-lan-log',
              configureServer(server) {
                server.httpServer?.once('listening', () => {
                  if (process.env.WAITME_SKIP_VITE_LAN_LOG === '1') return
                  const addr = server.httpServer?.address()
                  const port = typeof addr === 'object' && addr && 'port' in addr ? addr.port : 5173
                  const display =
                    resolvedDevLanOrigin || (lanIpForDev ? `http://${lanIpForDev}:${port}` : '')
                  if (display) {
                    console.log(`\nRUNNING ON LAN: ${display}\n`)
                  } else {
                    console.warn(
                      '\n[waitme] Sin IP LAN (10.x / 192.168.x). Define VITE_DEV_LAN_ORIGIN=http://<IP>:' +
                        port +
                        ' en .env.local\n'
                    )
                  }
                })
              },
            },
          ]
        : []),
      ...sentryPlugins,
    ],
    optimizeDeps: {
      include: ['mapbox-gl'],
    },
    build: {
      chunkSizeWarningLimit: 2500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/@supabase')) return 'supabase'
            if (id.includes('node_modules/mapbox-gl')) return 'mapbox-gl'
          },
        },
      },
    },
    server: {
      /** `true`: escucha en todas las interfaces (LAN + localhost). Mantiene 5173 fijo. */
      host: true,
      port: 5173,
      strictPort: true,
      open: false,
      /** HMR estable; sin overlay agresivo. Safari solo desde `npm run dev:ios`. */
      hmr: {
        overlay: false,
      },
    },
  }
})
