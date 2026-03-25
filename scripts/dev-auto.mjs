/**
 * Vigila src/ → debounce 2s → npm run auto:ship.
 * Una sola instancia de open-prod-refresh (PID en .waitme/); al salir (SIGINT/SIGTERM) la termina.
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { platform } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'src')
const WAITME_DIR = join(root, '.waitme')
const REFRESH_PID_FILE = join(WAITME_DIR, 'open-prod-refresh.pid')
const DEBOUNCE_MS = 2000

function shouldIgnore(relPath) {
  if (!relPath) return true
  const p = relPath.split('\\').join('/')
  return (
    p.includes('node_modules')
    || p.includes('dist/')
    || p.startsWith('dist/')
    || p.includes('.git/')
    || p.startsWith('.git/')
  )
}

function isProcessAlive(pid) {
  if (!pid || !Number.isFinite(pid)) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function stopRefreshChild() {
  try {
    if (!fs.existsSync(REFRESH_PID_FILE)) return
    const pid = parseInt(fs.readFileSync(REFRESH_PID_FILE, 'utf8'), 10)
    if (isProcessAlive(pid)) {
      try {
        process.kill(pid, 'SIGTERM')
      } catch {
        /* */
      }
    }
    fs.unlinkSync(REFRESH_PID_FILE)
  } catch {
    /* */
  }
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
  const r = spawnSync('npm', ['run', 'auto:ship'], {
    stdio: 'inherit',
    cwd: root,
    shell: true,
    env: process.env,
  })
  if (r.status !== 0) {
    console.error('[dev-auto] auto:ship falló (status ' + r.status + '). No se hizo push.')
  }
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
  fs.mkdirSync(WAITME_DIR, { recursive: true })
  if (fs.existsSync(REFRESH_PID_FILE)) {
    const oldPid = parseInt(fs.readFileSync(REFRESH_PID_FILE, 'utf8'), 10)
    if (isProcessAlive(oldPid)) {
      console.error(`[dev-auto] open-prod-refresh ya activo (pid ${oldPid}), no se duplica.`)
      return
    }
    try {
      fs.unlinkSync(REFRESH_PID_FILE)
    } catch {
      /* */
    }
  }
  const script = join(root, 'scripts/open-prod-refresh.mjs')
  const child = spawn('node', [script], {
    detached: true,
    stdio: 'ignore',
    cwd: root,
    env: process.env,
  })
  child.on('exit', () => {
    try {
      if (fs.existsSync(REFRESH_PID_FILE)) fs.unlinkSync(REFRESH_PID_FILE)
    } catch {
      /* */
    }
  })
  try {
    fs.writeFileSync(REFRESH_PID_FILE, String(child.pid))
  } catch {
    /* */
  }
  child.unref()
  console.error('[dev-auto] open-prod-refresh en segundo plano (solo pestaña producción).')
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
  stopRefreshChild()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
