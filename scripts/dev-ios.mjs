#!/usr/bin/env node
/**
 * Dev iOS + Safari: LAN IP → .env.local (VITE_DEV_LAN_ORIGIN) → cap sync ios → Vite → poll / → Safari.
 *
 * @see docs/DEV_IOS_LIVE_RELOAD.md
 */
import { execSync, spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { resolveWaitmeLanDevOrExit, upsertEnvLocalViteDevLanOrigin } from './get-lan-ip.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function printDevBanners(url) {
  console.log(`\nRUNNING ON LAN: ${url}`)
  console.log(`OPEN IN SAFARI: ${url}`)
  console.log(`OPEN IN IPHONE: ${url}\n`)
}

async function waitForRootOk(baseUrl, maxMs = 45000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(baseUrl, {
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

function openSafariLan(url) {
  if (process.platform !== 'darwin') return
  const u = url.endsWith('/') ? url : `${url}/`
  try {
    execSync(`open -a Safari ${u}`, { stdio: 'ignore' })
  } catch {
    /* Safari ausente */
  }
}

const { ip, url } = resolveWaitmeLanDevOrExit()

process.env.WAITME_LAN_IP = ip
process.env.WAITME_CAP_DEV_SERVER_URL = url

upsertEnvLocalViteDevLanOrigin(root, url)

printDevBanners(url)

console.info(`[waitme] cap sync ios → server.url = ${url}\n`)
const sync = spawnSync('npx', ['cap', 'sync', 'ios'], {
  cwd: root,
  env: { ...process.env, WAITME_CAP_DEV_SERVER_URL: url, WAITME_LAN_IP: ip },
  stdio: 'inherit',
})
if (sync.status !== 0) process.exit(sync.status === null ? 1 : sync.status)

const childEnv = {
  ...process.env,
  WAITME_LAN_IP: ip,
  WAITME_CAP_DEV_SERVER_URL: url,
  /** Evita log duplicado y apertura de navegador desde Vite (solo Safari vía este script). */
  WAITME_SKIP_VITE_LAN_LOG: '1',
}

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
waitForRootOk(url).then((ok) => {
  if (ok && !safariOpened) {
    safariOpened = true
    openSafariLan(url)
  } else if (!ok) {
    console.warn('[waitme] Timeout esperando respuesta HTTP en /. Abre Safari manualmente:', url)
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
