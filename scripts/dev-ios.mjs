#!/usr/bin/env node
/**
 * Flujo dev local principal: Vite :5173, cap sync iOS, `.env.local` (VITE_DEV_LAN_ORIGIN).
 * Readiness = solo HTTP (/) y /@vite/client; stdout/stderr solo informativos.
 *
 * Arranque mínimo solo Vite (sin cap, sin waits de este script): `npm run dev:vite`
 * (usa `vite.config.js`). Aquí se invoca el binario de Vite con `node` (sin `npm` ni shell)
 * para un solo proceso hijo estable y la misma semántica que `npm run dev:vite`.
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
  openDarwinSafari,
  probeHttp200,
  waitForHttpOk,
  waitForNgrokHttpsUrl,
  spawnNgrokHttp,
  NGROK_DEV_PORT,
} from './ngrok-tunnel-lib.mjs'
import { checkPort5173Available, printLsof5173, VITE_DEV_PORT } from './vite-dev-5173.mjs'
import { waitmeLocalIphonePreviewUrl } from './waitme-local-iphone-preview.mjs'
import { injectIosCapacitorDevServerUrl } from './inject-ios-cap-dev-server.mjs'
import { stripIosEmbeddedWeb } from './strip-ios-embedded-web.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const VITE_PORT = VITE_DEV_PORT
const VITE_HTTP_ROOT = `http://127.0.0.1:${VITE_PORT}/`
const VITE_HTTP_CLIENT = `http://127.0.0.1:${VITE_PORT}/@vite/client`
const SAFARI_DEV_URL = waitmeLocalIphonePreviewUrl(VITE_PORT)
const LOCALHOST_HTTP_ROOT = `http://localhost:${VITE_PORT}/`
const VITE_HTTP_WAIT_MS = 60_000

mergeDevEnvFromFiles(root)

function printUrlBanner(baseDevUrl) {
  const iphonePreviewUrl = waitmeLocalIphonePreviewUrl(VITE_PORT)
  console.log('\n')
  console.log(
    `👉 Safari Mac (preview tipo iPhone, marco interno) → ${iphonePreviewUrl} (se abre sola; origin OAuth sigue siendo http://localhost:${VITE_PORT})`
  )
  console.log(`👉 URL iPhone misma red (Capacitor live reload) → ${baseDevUrl}`)
  console.log('')
  console.log(
    '🏠 Fuera de casa / PC apagado → usa el despliegue Vercel (preview o production), no este dev server.'
  )
  console.log(
    '   OAuth: redirectTo = origen de la pestaña (localhost o IP:5173 en local; Vercel en prod). Añade esas URLs en Supabase → Auth → Redirect URLs.'
  )
  console.log('')
  console.log(
    '[waitme] Ngrok: opcional solo para demo temporal. Para activarlo: WAITME_DEV_NGROK=1 y NGROK_AUTHTOKEN en .env.local (URL HTTPS en consola si arranca).'
  )
  console.log(
    '[waitme] Validación final en dispositivos reales (BrowserStack): npm run test:e2e:browserstack\n'
  )
}

function viteExitPromise(vite) {
  return new Promise((resolve) => {
    vite.once('exit', (code, signal) => resolve({ code: code ?? 0, signal }))
  })
}

let ngrokChild = null
function stopNgrok() {
  try {
    ngrokChild?.kill('SIGTERM')
  } catch {
    /* */
  }
  ngrokChild = null
}

async function main() {
  const { ip, url } = resolveWaitmeLanDevOrExit()
  const baseDevUrl = url.replace(/\/$/, '')

  process.env.WAITME_LAN_IP = ip
  process.env.WAITME_CAP_DEV_SERVER_URL = baseDevUrl

  console.info('[waitme] ① LAN IP:', ip)
  console.info('[waitme] ② .env.local → VITE_DEV_LAN_ORIGIN=' + baseDevUrl)
  upsertEnvLocalViteDevLanOrigin(root, baseDevUrl)

  console.info('[waitme] ③ WAITME_CAP_DEV_SERVER_URL=' + baseDevUrl + ' (Capacitor + Vite)\n')

  printUrlBanner(baseDevUrl)

  console.info(`[waitme] ④ npx cap sync ios (server.url → ${baseDevUrl})\n`)
  const sync = spawnSync('npx', ['cap', 'sync', 'ios'], {
    cwd: root,
    env: { ...process.env, WAITME_CAP_DEV_SERVER_URL: baseDevUrl, WAITME_LAN_IP: ip },
    stdio: 'inherit',
  })
  if (sync.status !== 0) process.exit(sync.status === null ? 1 : sync.status)

  injectIosCapacitorDevServerUrl(root, baseDevUrl)

  if (String(process.env.SKIP_RM_IOS_PUBLIC || '').trim() !== '1') {
    stripIosEmbeddedWeb(root)
  }

  if (!(await checkPort5173Available())) {
    console.error('PORT 5173 ALREADY IN USE')
    printLsof5173()
    console.error('Cierra el proceso que usa el puerto y vuelve a ejecutar npm run dev.')
    process.exit(1)
  }

  const childEnv = {
    ...process.env,
    WAITME_LAN_IP: ip,
    WAITME_CAP_DEV_SERVER_URL: baseDevUrl,
    WAITME_SKIP_VITE_LAN_LOG: '1',
  }

  console.info(`[waitme] ⑤ Vite (node + vite/bin/vite.js; vite.config.js → host/port ${VITE_PORT})`)
  console.log('Starting Vite (persistent)...')

  const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
  if (!fs.existsSync(viteBin)) {
    console.error('[waitme] Falta node_modules/vite (ejecuta npm install).')
    process.exit(1)
  }

  const vite = spawn(process.execPath, [viteBin], {
    cwd: root,
    env: childEnv,
    stdio: 'inherit',
  })

  vite.on('exit', (code, signal) => {
    console.error('VITE PROCESS EXITED')
    console.error('exit code:', code, 'signal:', signal)
  })

  vite.on('close', (code, signal) => {
    console.error('VITE PROCESS CLOSED')
    console.error('close code:', code, 'signal:', signal)
  })

  vite.on('error', (err) => {
    console.error('[waitme] Vite spawn error:', err.message || err)
    process.exit(1)
  })

  console.log(`Waiting for http://127.0.0.1:${VITE_PORT}...`)

  const httpWait = waitForHttpOk(VITE_HTTP_ROOT, VITE_HTTP_WAIT_MS).then((ok) => ({ kind: 'http', ok }))
  const exitWait = viteExitPromise(vite).then(({ code, signal }) => ({ kind: 'exit', code, signal }))
  const first = await Promise.race([httpWait, exitWait])

  if (first.kind === 'exit') {
    console.error('VITE PROCESS EXITED')
    console.error('exit code:', first.code)
    process.exit(1)
  }

  if (!first.ok) {
    console.error('SERVER NOT RESPONDING')
    console.error(
      '[waitme] Vite no se detiene desde este script; si sigue en marcha, revisa el proceso (p. ej. Activity Monitor).'
    )
    stopNgrok()
    process.exit(1)
  }

  console.log('HTTP 200 OK')

  const clientOk = await probeHttp200(VITE_HTTP_CLIENT, '*/*')
  if (!clientOk) {
    console.error('VITE BROKEN (client not served)')
    console.error(
      '[waitme] Vite no se detiene desde este script; revisa el proceso manualmente si hace falta.'
    )
    stopNgrok()
    process.exit(1)
  }

  console.log('Vite client OK')

  console.log(`Waiting for ${LOCALHOST_HTTP_ROOT} (origen OAuth / Supabase redirect)...`)
  const localhostOk = await waitForHttpOk(LOCALHOST_HTTP_ROOT, 30_000)
  if (!localhostOk) {
    console.error('LOCALHOST NOT RESPONDING')
    console.error(
      '[waitme] Se requiere http://localhost:5173 para OAuth; revisa que Vite escuche en todas las interfaces (vite.config server.host).'
    )
    stopNgrok()
    process.exit(1)
  }
  console.log('localhost OK')

  console.log('Opening Safari...')
  openDarwinSafari(SAFARI_DEV_URL)

  console.log('DEV SERVER READY')

  void (async () => {
    if (process.env.WAITME_DEV_NGROK !== '1') {
      return
    }
    if (process.env.WAITME_DEV_NO_NGROK === '1') {
      console.log('[waitme] ngrok desactivado (WAITME_DEV_NO_NGROK=1).\n')
      return
    }
    if (!ngrokBinPath(root)) {
      console.warn('[waitme] ngrok (demo): falta binario; npm install (paquete ngrok en devDependencies).\n')
      return
    }
    if (!hasNgrokAuthtoken()) {
      console.warn('[waitme] ngrok (demo): falta NGROK_AUTHTOKEN en .env.local.\n')
      return
    }
    const up = await waitForHttpOk(`http://127.0.0.1:${NGROK_DEV_PORT}/`, 90_000)
    if (!up) {
      console.warn('[waitme] ngrok (demo) omitido: localhost:5173 no respondió a tiempo.\n')
      return
    }
    ngrokChild = spawnNgrokHttp(root, NGROK_DEV_PORT)
    if (!ngrokChild) return
    ngrokChild.on('error', (e) => console.warn('[waitme] ngrok:', e.message))
    const pub = await waitForNgrokHttpsUrl()
    if (pub) {
      console.log(`[waitme] Túnel ngrok (demo temporal) → ${pub}`)
      console.log(
        '   Recuerda: para uso estable fuera de casa usa Vercel; añade esta URL a Supabase Redirect URLs si la usas.\n'
      )
    } else {
      console.warn('[waitme] ngrok en marcha; no se leyó URL HTTPS (revisa http://127.0.0.1:4040).\n')
    }
  })()

  const exitCode = await new Promise((resolve) => {
    vite.on('exit', (code, signal) => {
      stopNgrok()
      resolve(signal ? 1 : (code ?? 0))
    })
  })
  process.exit(exitCode)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
