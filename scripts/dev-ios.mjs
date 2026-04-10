#!/usr/bin/env node
/**
 * Flujo dev local principal: Vite :5173 en 0.0.0.0, strictPort, cap sync iOS, `.env.local` (VITE_DEV_LAN_ORIGIN).
 * Fuera de casa con el PC apagado → Vercel (preview/production), no depender de este servidor.
 * Ngrok solo como demo temporal: `WAITME_DEV_NGROK=1` + NGROK_AUTHTOKEN (ver bloque async abajo).
 * Validación dispositivos reales en nube: `npm run test:e2e:browserstack` (no se ejecuta aquí).
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
  waitForHttpOk,
  waitForNgrokHttpsUrl,
  spawnNgrokHttp,
  NGROK_DEV_PORT,
} from './ngrok-tunnel-lib.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

mergeDevEnvFromFiles(root)

function printUrlBanner(baseDevUrl) {
  const safariLocal = 'http://localhost:5173/?iphone=true'
  console.log('\n')
  console.log('👉 URL Safari (Mac, local) → http://localhost:5173')
  console.log(`   Vista previa iPhone en Mac → ${safariLocal}`)
  console.log(`👉 URL iPhone misma red (local) → ${baseDevUrl}`)
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

/** Vite escucha en 0.0.0.0:5173; probar loopback evita depender de LAN ni de pestañas previas. */
const VITE_LOCAL_OK = 'http://127.0.0.1:5173/'
/** Misma app que la LAN; Safari Mac usa localhost (OAuth / certificados coherentes en escritorio). */
const SAFARI_MAC_URL = 'http://localhost:5173/?iphone=true'

// ① LAN
const { ip, url } = resolveWaitmeLanDevOrExit()
const baseDevUrl = url.replace(/\/$/, '')

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
waitForHttpOk(VITE_LOCAL_OK, 45_000).then((ok) => {
  if (ok && !safariOpened) {
    safariOpened = true
    console.info('[waitme] ⑥ Vite listo (HTTP 200 en ' + VITE_LOCAL_OK + ')\n')
    console.info('[waitme] ⑦ Abriendo Safari →', SAFARI_MAC_URL, '\n')
    openDarwinSafari(SAFARI_MAC_URL)
  } else if (!ok) {
    console.warn(
      '[waitme] Timeout esperando HTTP 200 en Vite (127.0.0.1:5173). Abre Safari manualmente:\n  ',
      SAFARI_MAC_URL
    )
  }
})

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
    console.log('   Recuerda: para uso estable fuera de casa usa Vercel; añade esta URL a Supabase Redirect URLs si la usas.\n')
  } else {
    console.warn('[waitme] ngrok en marcha; no se leyó URL HTTPS (revisa http://127.0.0.1:4040).\n')
  }
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
