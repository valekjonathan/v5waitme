#!/usr/bin/env node
/**
 * Flujo dev local principal: Vite :5173, cap sync iOS, `.env.local` (VITE_DEV_LAN_ORIGIN).
 * Readiness = solo HTTP (/) y /@vite/client; stdout/stderr solo informativos.
 *
 * @see docs/DEV_IOS_LIVE_RELOAD.md
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const VITE_PORT = 5173
const VITE_HTTP_ROOT = `http://127.0.0.1:${VITE_PORT}/`
const VITE_HTTP_CLIENT = `http://127.0.0.1:${VITE_PORT}/@vite/client`
const SAFARI_DEV_URL = `http://localhost:${VITE_PORT}`
const VITE_HTTP_WAIT_MS = 60_000

mergeDevEnvFromFiles(root)

function printUrlBanner(baseDevUrl) {
  const iphonePreview = `http://localhost:${VITE_PORT}/?iphone=true`
  console.log('\n')
  console.log(
    `👉 URL Safari (Mac, local) → http://localhost:${VITE_PORT} (se abre sola si el servidor responde 200)`
  )
  console.log(`   Vista previa iPhone en Mac (opcional) → ${iphonePreview}`)
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

function checkPort5173Available() {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.unref()
    s.on('error', (err) => {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'EADDRINUSE') resolve(false)
      else reject(err)
    })
    s.listen(VITE_PORT, '0.0.0.0', () => {
      s.close(() => resolve(true))
    })
  })
}

function printLsof5173() {
  try {
    const r = spawnSync('lsof', ['-iTCP:5173', '-sTCP:LISTEN', '-n', '-P'], { encoding: 'utf8' })
    if (r.stdout) console.error(r.stdout)
  } catch {
    /* lsof no disponible */
  }
}

/** Solo para volcar si falla HTTP o el proceso muere (no se usa como señal de ready). */
function dumpViteOutputSoFar(buf) {
  console.error('--- Vite stdout+stderr captured so far (diagnostic only) ---')
  console.error(buf.length === 0 ? '(empty)' : buf)
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

  console.info(`[waitme] ⑤ Vite --host 0.0.0.0 --port ${VITE_PORT} --strictPort`)
  console.log('Starting Vite...')

  const viteJs = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
  const viteArgs = ['--host', '0.0.0.0', '--port', String(VITE_PORT), '--strictPort']
  const viteSpawnOpts = {
    cwd: root,
    env: childEnv,
    stdio: ['inherit', 'pipe', 'pipe'],
  }
  const vite = fs.existsSync(viteJs)
    ? spawn(process.execPath, [viteJs, ...viteArgs], viteSpawnOpts)
    : spawn('npx', ['vite', ...viteArgs], {
        ...viteSpawnOpts,
        shell: true,
      })

  let viteOutputBuf = ''
  const appendBuf = (chunk) => {
    viteOutputBuf += chunk.toString()
  }

  vite.stdout?.on('data', (chunk) => {
    appendBuf(chunk)
    process.stdout.write(chunk)
  })
  vite.stderr?.on('data', (chunk) => {
    appendBuf(chunk)
    process.stderr.write(chunk)
  })
  vite.on('error', (err) => {
    console.error('[waitme] Vite spawn error:', err.message || err)
    dumpViteOutputSoFar(viteOutputBuf)
    process.exit(1)
  })

  console.log(`Waiting for http://127.0.0.1:${VITE_PORT}...`)

  const httpWait = waitForHttpOk(VITE_HTTP_ROOT, VITE_HTTP_WAIT_MS).then((ok) => ({ kind: 'http', ok }))
  const exitWait = viteExitPromise(vite).then(({ code, signal }) => ({ kind: 'exit', code, signal }))
  const first = await Promise.race([httpWait, exitWait])

  if (first.kind === 'exit') {
    console.error('VITE PROCESS EXITED')
    console.error('exit code:', first.code)
    dumpViteOutputSoFar(viteOutputBuf)
    process.exit(1)
  }

  if (!first.ok) {
    console.error('SERVER NOT RESPONDING')
    dumpViteOutputSoFar(viteOutputBuf)
    try {
      vite.kill('SIGTERM')
    } catch {
      /* */
    }
    stopNgrok()
    process.exit(1)
  }

  console.log('HTTP 200 OK')

  const clientOk = await probeHttp200(VITE_HTTP_CLIENT, '*/*')
  if (!clientOk) {
    console.error('VITE BROKEN (client not served)')
    dumpViteOutputSoFar(viteOutputBuf)
    try {
      vite.kill('SIGTERM')
    } catch {
      /* */
    }
    stopNgrok()
    process.exit(1)
  }

  console.log('Vite client OK')
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
