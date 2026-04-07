#!/usr/bin/env node
/**
 * Reinstalación limpia orientada a dev: borra artefactos iOS cacheados, hace `npm run build`,
 * ejecuta `cap-live-ios.mjs` (WAITME_CAP_DEV_SERVER_URL + cap sync ios) y valida `server.url`.
 *
 * Omitir build web: SKIP_WEB_BUILD=1
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

for (const p of dirsToRemove) {
  const rel = path.relative(root, p)
  const had = fs.existsSync(p)
  try {
    fs.rmSync(p, { recursive: true, force: true })
    console.info(had ? `[waitme] Limpiado: ${rel}` : `[waitme] Ya ausente: ${rel}`)
  } catch (e) {
    console.warn('[waitme] No se pudo limpiar', rel, e)
  }
}

try {
  if (fs.existsSync(capJson)) {
    fs.unlinkSync(capJson)
    console.info('[waitme] Eliminado capacitor.config.json anterior (evita server.url obsoleto).\n')
  }
} catch (e) {
  console.warn('[waitme] No se pudo borrar capacitor.config.json:', e)
}

if (process.env.SKIP_WEB_BUILD === '1') {
  console.info('[waitme] SKIP_WEB_BUILD=1 — sin npm run build\n')
} else {
  console.info('[waitme] npm run build (assets web → dist)\n')
  const b = spawnSync('npm', ['run', 'build'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  })
  if (b.status !== 0) process.exit(b.status ?? 1)
}

console.info('[waitme] cap sync ios con IP LAN (cap-live-ios.mjs)\n')
const live = spawnSync(process.execPath, [path.join(root, 'scripts', 'cap-live-ios.mjs')], {
  cwd: root,
  stdio: 'inherit',
})
if (live.status !== 0) process.exit(live.status ?? 1)

if (!fs.existsSync(capJson)) {
  console.error('[waitme] No se generó ios/App/App/capacitor.config.json tras sync.')
  process.exit(1)
}

let cfg
try {
  cfg = JSON.parse(fs.readFileSync(capJson, 'utf8'))
} catch {
  console.error('[waitme] capacitor.config.json no es JSON válido.')
  process.exit(1)
}

const url = cfg?.server?.url
if (!url || typeof url !== 'string') {
  console.error('[waitme] Falta server.url en capacitor.config.json (¿cap sync sin WAITME?)')
  process.exit(1)
}

if (/vercel\.(app|com)/i.test(url)) {
  console.error('[waitme] server.url no debe apuntar a Vercel:', url)
  process.exit(1)
}

let parsed
try {
  parsed = new URL(url)
} catch {
  console.error('[waitme] server.url no es una URL válida:', url)
  process.exit(1)
}

if (parsed.protocol !== 'http:') {
  console.error('[waitme] server.url debe ser http:// para dev LAN:', url)
  process.exit(1)
}

const host = parsed.hostname
const lanOk =
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) || /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)
if (!lanOk) {
  console.error('[waitme] server.url debe usar IP LAN 10.x.x.x o 192.168.x.x:', url)
  process.exit(1)
}

console.info('\n[waitme] ─────────────────────────────────────────')
console.info('[waitme] CONFIG iOS (tras sync):')
console.info(`[waitme]   server.url = ${url}`)
console.info('[waitme]   (misma base que Safari en red: Vite en esa IP:puerto)')
console.info('[waitme] ─────────────────────────────────────────')
console.info(
  '[waitme] Siguiente paso: Xcode → Product → Clean Build Folder, luego Run en el iPhone.\n'
)
