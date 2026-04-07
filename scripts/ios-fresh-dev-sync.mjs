#!/usr/bin/env node
/**
 * Limpieza total iOS + web + cap sync con dev server LAN.
 *
 * Orden:
 * 1) Borra ios/App/build, output, App/public, capacitor.config.json
 * 2) npm run clean (omitir: SKIP_NPM_CLEAN=1)
 * 3) npm run build (omitir: SKIP_WEB_BUILD=1)
 * 4) cap-live-ios.mjs → WAITME_CAP_DEV_SERVER_URL + cap sync ios
 * 5) Valida server.url (http, IP LAN, sin Vercel)
 *
 * Verificación exacta de URL (p. ej. http://192.168.0.50:5173 en tu red):
 *   WAITME_EXPECT_DEV_SERVER_URL=http://192.168.0.50:5173 npm run ios:fresh:dev
 *
 * @see docs/DEV_IOS_LIVE_RELOAD.md
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const capJson = path.join(root, 'ios', 'App', 'App', 'capacitor.config.json')

const dirsToRemove = [
  path.join(root, 'ios', 'App', 'build'),
  path.join(root, 'ios', 'App', 'output'),
  path.join(root, 'ios', 'App', 'App', 'public'),
]

console.info('[waitme] === Limpieza total iOS (build / output / public / capacitor.config.json) ===\n')

for (const p of dirsToRemove) {
  const rel = path.relative(root, p)
  const had = fs.existsSync(p)
  try {
    fs.rmSync(p, { recursive: true, force: true })
    console.info(had ? `[waitme] Eliminado: ${rel}` : `[waitme] Ya ausente: ${rel}`)
  } catch (e) {
    console.warn('[waitme] No se pudo eliminar', rel, e)
  }
}

try {
  if (fs.existsSync(capJson)) {
    fs.unlinkSync(capJson)
    console.info('[waitme] Eliminado: ios/App/App/capacitor.config.json\n')
  } else {
    console.info('[waitme] Ya ausente: ios/App/App/capacitor.config.json\n')
  }
} catch (e) {
  console.warn('[waitme] No se pudo borrar capacitor.config.json:', e)
}

function npmRun(script) {
  const r = spawnSync('npm', ['run', script], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  })
  return r.status === 0
}

if (process.env.SKIP_NPM_CLEAN === '1') {
  console.info('[waitme] SKIP_NPM_CLEAN=1 — sin npm run clean\n')
} else {
  console.info('[waitme] npm run clean\n')
  if (!npmRun('clean')) process.exit(1)
}

if (process.env.SKIP_WEB_BUILD === '1') {
  console.info('[waitme] SKIP_WEB_BUILD=1 — sin npm run build\n')
} else {
  console.info('[waitme] npm run build\n')
  if (!npmRun('build')) process.exit(1)
}

console.info('[waitme] cap sync ios con WAITME_CAP_DEV_SERVER_URL (cap-live-ios.mjs)\n')
const live = spawnSync(process.execPath, [path.join(root, 'scripts', 'cap-live-ios.mjs')], {
  cwd: root,
  stdio: 'inherit',
})
if (live.status !== 0) process.exit(live.status ?? 1)

if (!fs.existsSync(capJson)) {
  console.error('[waitme] ERROR: no existe ios/App/App/capacitor.config.json tras sync.')
  process.exit(1)
}

let cfg
try {
  cfg = JSON.parse(fs.readFileSync(capJson, 'utf8'))
} catch {
  console.error('[waitme] ERROR: capacitor.config.json no es JSON válido.')
  process.exit(1)
}

const url = cfg?.server?.url
if (!url || typeof url !== 'string') {
  console.error('[waitme] ERROR: falta server.url (bloque "server") en capacitor.config.json.')
  process.exit(1)
}

if (cfg?.server?.cleartext !== true) {
  console.error('[waitme] ERROR: server.cleartext debe ser true para http:// LAN.')
  process.exit(1)
}

if (/vercel\.(app|com)/i.test(url)) {
  console.error('[waitme] ERROR: server.url no debe apuntar a Vercel:', url)
  process.exit(1)
}

let parsed
try {
  parsed = new URL(url)
} catch {
  console.error('[waitme] ERROR: server.url no es una URL válida:', url)
  process.exit(1)
}

if (parsed.protocol !== 'http:') {
  console.error('[waitme] ERROR: server.url debe ser http:// (dev LAN):', url)
  process.exit(1)
}

const host = parsed.hostname
const lanOk =
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) || /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)
if (!lanOk) {
  console.error('[waitme] ERROR: server.url debe usar IP LAN 10.x o 192.168.x:', url)
  process.exit(1)
}

const expectExact = String(process.env.WAITME_EXPECT_DEV_SERVER_URL ?? '').trim()
if (expectExact) {
  if (url !== expectExact) {
    console.error('[waitme] ERROR: server.url no coincide con WAITME_EXPECT_DEV_SERVER_URL.')
    console.error('  esperado:', expectExact)
    console.error('  actual:  ', url)
    process.exit(1)
  }
  console.info('[waitme] Verificación estricta OK (coincide con WAITME_EXPECT_DEV_SERVER_URL).\n')
}

console.info('[waitme] ─────────────────────────────────────────')
console.info('[waitme] VERIFICACIÓN iOS capacitor.config.json')
console.info(`[waitme]   "server": { "url": "${url}", "cleartext": true }`)
console.info('[waitme]   Sin referencia a vercel.app / vercel.com')
console.info('[waitme] ─────────────────────────────────────────')
console.info(
  '[waitme] iPhone: Xcode → Product → Clean Build Folder → Run (instalación limpia).\n'
)
