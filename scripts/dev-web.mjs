#!/usr/bin/env node
/**
 * Desarrollo web por defecto (`npm run dev`): libera :5173 si hace falta, Vite, HTTP 200, abre Safari.
 * Sin Capacitor. Misma semántica de arranque que dev-ios respecto a Vite (node + vite/bin/vite.js).
 *
 * @see scripts/dev-ios.mjs (flujo completo iOS + cap sync + LAN)
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { ensurePort5173Free, printLsof5173, VITE_DEV_PORT } from './vite-dev-5173.mjs'
import { waitmeLocalIphonePreviewUrl } from './waitme-local-iphone-preview.mjs'
import {
  mergeDevEnvFromFiles,
  openDarwinSafari,
  probeHttp200,
  waitForHttpOk,
} from './ngrok-tunnel-lib.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const VITE_HTTP_ROOT = `http://127.0.0.1:${VITE_DEV_PORT}/`
const VITE_HTTP_CLIENT = `http://127.0.0.1:${VITE_DEV_PORT}/@vite/client`
/** Marco tipo iPhone (`IphoneFrame`) vía query; origin OAuth = http://localhost:5173 */
const SAFARI_DEV_URL = waitmeLocalIphonePreviewUrl(VITE_DEV_PORT)
const LOCALHOST_HTTP_ROOT = `http://localhost:${VITE_DEV_PORT}/`
const VITE_HTTP_WAIT_MS = 60_000

mergeDevEnvFromFiles(root)

function viteExitPromise(vite) {
  return new Promise((resolve) => {
    vite.once('exit', (code, signal) => resolve({ code: code ?? 0, signal }))
  })
}

async function main() {
  try {
    await ensurePort5173Free()
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    printLsof5173()
    process.exit(1)
  }

  const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
  if (!fs.existsSync(viteBin)) {
    console.error('[waitme] Falta node_modules/vite (ejecuta npm install).')
    process.exit(1)
  }

  console.info(`[waitme] Vite web (node + vite/bin/vite.js) → :${VITE_DEV_PORT}`)
  const vite = spawn(process.execPath, [viteBin], {
    cwd: root,
    env: { ...process.env, WAITME_SKIP_VITE_LAN_LOG: '1' },
    stdio: 'inherit',
  })

  vite.on('error', (err) => {
    console.error('[waitme] Vite spawn error:', err.message || err)
    process.exit(1)
  })

  console.log(`[waitme] Esperando ${VITE_HTTP_ROOT}…`)
  const httpWait = waitForHttpOk(VITE_HTTP_ROOT, VITE_HTTP_WAIT_MS).then((ok) => ({ kind: 'http', ok }))
  const exitWait = viteExitPromise(vite).then(({ code, signal }) => ({ kind: 'exit', code, signal }))
  const first = await Promise.race([httpWait, exitWait])

  if (first.kind === 'exit') {
    console.error('[waitme] Vite terminó antes de responder HTTP.')
    process.exit(1)
  }
  if (!first.ok) {
    console.error('[waitme] Servidor no respondió HTTP 200 a tiempo.')
    process.exit(1)
  }

  const clientOk = await probeHttp200(VITE_HTTP_CLIENT, '*/*')
  if (!clientOk) {
    console.error('[waitme] Vite no sirve /@vite/client.')
    process.exit(1)
  }

  const localhostOk = await waitForHttpOk(LOCALHOST_HTTP_ROOT, 30_000)
  if (!localhostOk) {
    console.error('[waitme] http://localhost:5173 no respondió (necesario para OAuth).')
    process.exit(1)
  }

  console.log('[waitme] HTTP OK → abriendo Safari (preview tipo iPhone ?iphone=true)')
  openDarwinSafari(SAFARI_DEV_URL)
  console.log('[waitme] Listo. iOS+LAN+cap: npm run dev:ios · opcional BrowserSync :5175: npm run dev:safari')

  const exitCode = await new Promise((resolve) => {
    vite.on('exit', (code, signal) => {
      resolve(signal ? 1 : (code ?? 0))
    })
  })
  process.exit(exitCode)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
