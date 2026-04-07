#!/usr/bin/env node
/**
 * Flujo automático dev iOS:
 * LAN → `.env.local` (VITE_DEV_LAN_ORIGIN) → WAITME_CAP_DEV_SERVER_URL → cap sync ios → Vite (host LAN) → HTTP 200 → Safari con `?iphone=true`.
 * iPhone: misma URL LAN en `server.url` (live reload/HMR). Producción: `npm run cap:sync:prod` (sin server.url).
 *
 * @see docs/DEV_IOS_LIVE_RELOAD.md
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { resolveWaitmeLanDevOrExit, upsertEnvLocalViteDevLanOrigin } from './get-lan-ip.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function printDevBanners(safariPreviewUrl, iphoneDevUrl) {
  console.log('\nRUNNING ON:')
  console.log(safariPreviewUrl)
  console.log('\nIPHONE USING:')
  console.log(iphoneDevUrl)
  console.log('')
}

async function waitForRootOk(baseUrl, maxMs = 45000) {
  const probe = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(probe, {
        redirect: 'manual',
        headers: { Accept: 'text/html' },
      })
      if (res.ok || res.status === 304) return true
    } catch {
      /* servidor aún no listo */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  return false
}

/** Safari con preview iPhone (`App.jsx` + clase `iphone-preview`). Sin shell: URLs con `?` no se rompen. */
function openSafariIphonePreview(url) {
  if (process.platform !== 'darwin') return
  try {
    spawnSync('open', ['-a', 'Safari', url], { stdio: 'ignore' })
  } catch {
    /* Safari ausente */
  }
}

// ① LAN
const { ip, url } = resolveWaitmeLanDevOrExit()
const baseDevUrl = url.replace(/\/$/, '')
const safariPreviewUrl = `${baseDevUrl}/?iphone=true`

process.env.WAITME_LAN_IP = ip
process.env.WAITME_CAP_DEV_SERVER_URL = baseDevUrl

// ② .env.local
console.info('[waitme] ① LAN IP:', ip)
console.info('[waitme] ② .env.local → VITE_DEV_LAN_ORIGIN=' + baseDevUrl)
upsertEnvLocalViteDevLanOrigin(root, baseDevUrl)

// ③ Variable para Capacitor (server.url) y procesos hijos
console.info('[waitme] ③ WAITME_CAP_DEV_SERVER_URL=' + baseDevUrl + ' (Capacitor + Vite)\n')

printDevBanners(safariPreviewUrl, baseDevUrl)

// ④ cap sync ios
console.info(`[waitme] ④ npx cap sync ios (server.url → ${baseDevUrl})\n`)
const sync = spawnSync('npx', ['cap', 'sync', 'ios'], {
  cwd: root,
  env: { ...process.env, WAITME_CAP_DEV_SERVER_URL: baseDevUrl, WAITME_LAN_IP: ip },
  stdio: 'inherit',
})
if (sync.status !== 0) process.exit(sync.status === null ? 1 : sync.status)

// ⑤ Vite
const childEnv = {
  ...process.env,
  WAITME_LAN_IP: ip,
  WAITME_CAP_DEV_SERVER_URL: baseDevUrl,
  /** Evita log duplicado desde el plugin Vite (banners ya salen aquí). */
  WAITME_SKIP_VITE_LAN_LOG: '1',
}

console.info('[waitme] ⑤ Iniciando Vite (host LAN, puerto 5173)…\n')

const viteJs = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const vite = fs.existsSync(viteJs)
  ? spawn(process.execPath, [viteJs], { cwd: root, env: childEnv, stdio: 'inherit' })
  : spawn('npx', ['vite'], {
      cwd: root,
      env: childEnv,
      stdio: 'inherit',
      shell: true,
    })

let safariOpened = false
// ⑥ HTTP 200 en /  →  ⑦ Safari solo con preview iPhone
waitForRootOk(baseDevUrl).then((ok) => {
  if (ok && !safariOpened) {
    safariOpened = true
    console.info('[waitme] ⑥ Servidor OK (HTTP en /)\n')
    console.info('[waitme] ⑦ Abriendo Safari →', safariPreviewUrl, '\n')
    openSafariIphonePreview(safariPreviewUrl)
  } else if (!ok) {
    console.warn(
      '[waitme] Timeout esperando HTTP en /. Abre Safari manualmente:\n  ',
      safariPreviewUrl
    )
  }
})

async function run() {
  const exitCode = await new Promise((resolve) => {
    vite.on('exit', (code, signal) => {
      resolve(signal ? 1 : (code ?? 0))
    })
    vite.on('error', () => resolve(1))
  })
  process.exit(exitCode)
}

run()
