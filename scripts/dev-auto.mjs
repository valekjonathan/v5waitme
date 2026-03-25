/**
 * Vigila cambios en src/ (guardar archivo → cambio en disco).
 * Tras debounce 2s ejecuta npm run auto:ship (build + commit + push).
 * Arranca UNA vez en segundo plano open-prod-refresh (Safari producción + reload);
 * no se puede lanzar auto:live entero en cada cambio porque open-prod-refresh no termina.
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { platform } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'src')
const DEBOUNCE_MS = 2000

function shouldIgnore(relPath) {
  if (!relPath) return true
  const p = relPath.split('\\').join('/')
  return (
    p.includes('node_modules') || p.includes('/node_modules') || p.startsWith('node_modules')
    || p.includes('dist/') || p.startsWith('dist/')
    || p.includes('.git/') || p.startsWith('.git/')
  )
}

let debounceTimer = null
let shipBusy = false
let shipPending = false

function runAutoShip() {
  if (shipBusy) {
    shipPending = true
    return
  }
  shipBusy = true
  console.error('[dev-auto] npm run auto:ship')
  spawnSync('npm', ['run', 'auto:ship'], {
    stdio: 'inherit',
    cwd: root,
    shell: true,
    env: process.env,
  })
  shipBusy = false
  if (shipPending) {
    shipPending = false
    runAutoShip()
  }
}

function scheduleShip() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    runAutoShip()
  }, DEBOUNCE_MS)
}

function startSafariLoopOnce() {
  if (platform() !== 'darwin') {
    console.error('[dev-auto] Safari loop omitido (solo macOS).')
    return
  }
  const script = join(root, 'scripts/open-prod-refresh.mjs')
  const child = spawn('node', [script], {
    detached: true,
    stdio: 'ignore',
    cwd: root,
    env: process.env,
  })
  child.unref()
  console.error('[dev-auto] open-prod-refresh en segundo plano (producción, sin localhost).')
}

if (!fs.existsSync(srcDir)) {
  console.error('[dev-auto] ERROR: no existe carpeta src/')
  process.exit(1)
}

startSafariLoopOnce()
console.error('[dev-auto] watching src/ (debounce 2s → auto:ship)')

try {
  fs.watch(srcDir, { recursive: true }, (_event, filename) => {
    if (shouldIgnore(filename)) return
    scheduleShip()
  })
} catch (e) {
  console.error('[dev-auto] fs.watch falló:', e.message)
  process.exit(1)
}

function shutdown() {
  console.error('[dev-auto] stopped')
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
