/**
 * Vigila src/ → debounce → pipeline en serie (sin paralelismo):
 *   auto-clean → quality-gate → auto:ship --no-quality (commit + push → Vercel si aplica).
 * Híbrido: fs.watch + sondeo cada 3s por firma mtime (recupera eventos perdidos).
 * Cola: pipelineBusy / pipelinePending (un solo clean+quality+ship a la vez; cambios durante
 * ejecución se re-encolan una vez al terminar).
 * open-prod-refresh en .waitme/
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { platform } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'src')
const autoCleanScript = join(root, 'scripts/auto-clean.mjs')
const qualityGateScript = join(root, 'scripts/quality-gate.mjs')
const WAITME_DIR = join(root, '.waitme')
const REFRESH_PID_FILE = join(WAITME_DIR, 'open-prod-refresh.pid')
/** Debounce compartido por watch y poll (no duplica pipelines). */
const DEBOUNCE_MS = 2500
/** Respaldo si fs.watch pierde eventos. */
const POLL_MS = 3000

function shouldIgnore(relPath) {
  if (!relPath) return true
  const p = relPath.split('\\').join('/')
  return (
    p.includes('node_modules') ||
    p.includes('dist/') ||
    p.startsWith('dist/') ||
    p.includes('.git/') ||
    p.startsWith('.git/')
  )
}

/** Firma estable: rutas relativas ordenadas + mtimeMs (barato; sin leer contenido). */
function computeSrcMtimeSignature() {
  const parts = []
  function walk(dir) {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of entries) {
      const p = join(dir, ent.name)
      const rel = relative(srcDir, p).split('\\').join('/')
      if (shouldIgnore(rel)) continue
      if (ent.isDirectory()) {
        walk(p)
      } else {
        try {
          const st = fs.statSync(p)
          parts.push(`${rel}\t${st.mtimeMs}`)
        } catch {
          /* */
        }
      }
    }
  }
  walk(srcDir)
  parts.sort()
  return parts.join('\n')
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
let pipelineBusy = false
let pipelinePending = false
/** Última firma conocida; se sincroniza tras pipeline y al iniciar poll. */
let lastSrcSignature = ''

function syncSignatureFromDisk() {
  try {
    lastSrcSignature = computeSrcMtimeSignature()
  } catch {
    /* */
  }
}

function runCleanAndShip() {
  if (pipelineBusy) {
    pipelinePending = true
    return
  }
  pipelineBusy = true

  console.error('')
  console.error('[AUTO] Detectado cambio en src/')
  console.error('[AUTO] Ejecutando limpieza...')

  const clean = spawnSync(process.execPath, [autoCleanScript], {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
  })

  if (clean.status !== 0) {
    console.error(
      '[dev-auto] auto-clean falló (status ' +
        clean.status +
        '). No se ejecuta quality-gate ni auto:ship.'
    )
    syncSignatureFromDisk()
    pipelineBusy = false
    if (pipelinePending) {
      pipelinePending = false
      runCleanAndShip()
    }
    return
  }

  console.error(
    '[dev-auto] quality-gate (única ejecución en este pipeline; auto:ship irá con --no-quality)'
  )
  const qg = spawnSync(process.execPath, [qualityGateScript], {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
  })
  if (qg.status !== 0) {
    console.error(
      '[dev-auto] quality-gate falló (status ' + qg.status + '). No se ejecuta auto:ship.'
    )
    syncSignatureFromDisk()
    pipelineBusy = false
    if (pipelinePending) {
      pipelinePending = false
      runCleanAndShip()
    }
    return
  }

  console.error('[dev-auto] npm run auto:ship -- --no-quality')
  const r = spawnSync('npm', ['run', 'auto:ship', '--', '--no-quality'], {
    stdio: 'inherit',
    cwd: root,
    shell: true,
    env: process.env,
  })
  if (r.status !== 0) {
    console.error('[dev-auto] auto:ship falló (status ' + r.status + '). No se hizo push.')
  }

  syncSignatureFromDisk()
  pipelineBusy = false
  if (pipelinePending) {
    pipelinePending = false
    runCleanAndShip()
  }
}

function scheduleCleanAndShip() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    runCleanAndShip()
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

syncSignatureFromDisk()

startSafariLoopOnce()
console.error(
  `[dev-auto] watching src/ (fs.watch + poll ${POLL_MS}ms, debounce ${DEBOUNCE_MS}ms → clean → quality-gate → ship)`
)

try {
  fs.watch(srcDir, { recursive: true }, (_event, filename) => {
    if (shouldIgnore(filename)) return
    scheduleCleanAndShip()
  })
} catch (e) {
  console.error('[dev-auto] fs.watch falló:', e.message)
  process.exit(1)
}

let pollTimer = null
pollTimer = setInterval(() => {
  let next
  try {
    next = computeSrcMtimeSignature()
  } catch {
    return
  }
  if (next === lastSrcSignature) return
  lastSrcSignature = next
  scheduleCleanAndShip()
}, POLL_MS)

function shutdown() {
  console.error('[dev-auto] stopped')
  if (debounceTimer) clearTimeout(debounceTimer)
  if (pollTimer) clearInterval(pollTimer)
  stopRefreshChild()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
