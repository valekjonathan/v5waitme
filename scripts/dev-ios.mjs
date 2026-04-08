#!/usr/bin/env node
/**
 * Flujo dev completo (sin BrowserStack; validación nube → `npm run test:e2e:browserstack`):
 * LAN → `.env.local` (VITE_DEV_LAN_ORIGIN) → cap sync ios → Vite :5173 (0.0.0.0) → URLs claras → ngrok opcional.
 * Safari tiempo real: preview `?iphone=true`. iPhone misma red: URL LAN. Fuera: ngrok si hay NGROK_AUTHTOKEN.
 *
 * @see docs/DEV_IOS_LIVE_RELOAD.md
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { resolveWaitmeLanDevOrExit, upsertEnvLocalViteDevLanOrigin } from './get-lan-ip.mjs'
import {
  mergeDevEnvFromFiles,
  ngrokBinPath,
  hasNgrokAuthtoken,
  waitForHttpOk,
  waitForNgrokHttpsUrl,
  spawnNgrokHttp,
  NGROK_DEV_PORT,
} from './ngrok-tunnel-lib.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

mergeDevEnvFromFiles(root)

function printUrlBanner(baseDevUrl) {
  console.log('\n')
  console.log('👉 URL Safari → http://localhost:5173')
  console.log(`👉 URL iPhone local → ${baseDevUrl}`)
  console.log(
    '👉 URL iPhone fuera → (tras Vite + NGROK_AUTHTOKEN en .env.local, ver línea HTTPS abajo; si no hay token, configura ngrok)\n'
  )
  console.log(
    '[waitme] Validación BrowserStack (no se ejecuta en dev): npm run test:e2e:browserstack\n'
  )
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

/** Safari con preview iPhone (`App.jsx` + clase `iphone-preview`). */
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

// ③ Capacitor + Vite
console.info('[waitme] ③ WAITME_CAP_DEV_SERVER_URL=' + baseDevUrl + ' (Capacitor + Vite)\n')

printUrlBanner(baseDevUrl)

// ④ cap sync ios
console.info(`[waitme] ④ npx cap sync ios (server.url → ${baseDevUrl})\n`)
const sync = spawnSync('npx', ['cap', 'sync', 'ios'], {
  cwd: root,
  env: { ...process.env, WAITME_CAP_DEV_SERVER_URL: baseDevUrl, WAITME_LAN_IP: ip },
  stdio: 'inherit',
})
if (sync.status !== 0) process.exit(sync.status === null ? 1 : sync.status)

// ⑤ Vite (CLI alineado con vite.config: host 0.0.0.0, 5173, strictPort)
const childEnv = {
  ...process.env,
  WAITME_LAN_IP: ip,
  WAITME_CAP_DEV_SERVER_URL: baseDevUrl,
  WAITME_SKIP_VITE_LAN_LOG: '1',
}

console.info('[waitme] ⑤ Vite --host 0.0.0.0 --port 5173 --strictPort\n')

const viteJs = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const viteArgs = ['--host', '0.0.0.0', '--port', '5173', '--strictPort']
const vite = fs.existsSync(viteJs)
  ? spawn(process.execPath, [viteJs, ...viteArgs], { cwd: root, env: childEnv, stdio: 'inherit' })
  : spawn('npx', ['vite', ...viteArgs], {
      cwd: root,
      env: childEnv,
      stdio: 'inherit',
      shell: true,
    })

let ngrokChild = null
function stopNgrok() {
  try {
    ngrokChild?.kill('SIGTERM')
  } catch {
    /* */
  }
  ngrokChild = null
}

let safariOpened = false
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

void (async () => {
  if (process.env.WAITME_DEV_NO_NGROK === '1') {
    console.log('👉 URL iPhone fuera → (omitido: WAITME_DEV_NO_NGROK=1)\n')
    return
  }
  if (!ngrokBinPath(root)) {
    console.log('👉 URL iPhone fuera → (npm install; paquete ngrok en devDependencies)\n')
    return
  }
  if (!hasNgrokAuthtoken()) {
    console.log('👉 URL iPhone fuera → (NGROK_AUTHTOKEN en .env.local)\n')
    return
  }
  const up = await waitForHttpOk(`http://127.0.0.1:${NGROK_DEV_PORT}/`, 90_000)
  if (!up) {
    console.warn('[waitme] ngrok omitido: localhost:5173 no respondió a tiempo.\n')
    return
  }
  ngrokChild = spawnNgrokHttp(root, NGROK_DEV_PORT)
  if (!ngrokChild) return
  ngrokChild.on('error', (e) => console.warn('[waitme] ngrok:', e.message))
  const pub = await waitForNgrokHttpsUrl()
  if (pub) console.log(`👉 URL iPhone fuera → ${pub}\n`)
  else console.warn('[waitme] ngrok en marcha; no se leyó URL HTTPS (revisa http://127.0.0.1:4040).\n')
})()

async function run() {
  const exitCode = await new Promise((resolve) => {
    vite.on('exit', (code, signal) => {
      stopNgrok()
      resolve(signal ? 1 : (code ?? 0))
    })
    vite.on('error', () => {
      stopNgrok()
      resolve(1)
    })
  })
  process.exit(exitCode)
}

run()
