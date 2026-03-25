/**
 * Producción real (Vercel): espera un margen tras push, abre Safari solo en PROD_URL y recarga la pestaña activa.
 * Sin localhost. Vercel despliega en cada push a main (dashboard); aquí solo damos tiempo heurístico al build remoto.
 *
 * Env:
 *   PROD_URL (default https://v5waitme.vercel.app)
 *   PROD_LIVE_INTERVAL_SEC (default 5)
 *   VERCEL_DEPLOY_WAIT_SEC (override fijo; si no, espera aleatoria 5–10s)
 *   SKIP_DEPLOY_WAIT=1 — sin espera inicial (solo refresco periódico)
 */
import { spawnSync } from 'node:child_process'
import { platform } from 'node:os'

const PROD_URL = process.env.PROD_URL || 'https://v5waitme.vercel.app'
const INTERVAL_SEC = Math.max(2, Number(process.env.PROD_LIVE_INTERVAL_SEC) || 5)

function deployWaitSec() {
  if (process.env.SKIP_DEPLOY_WAIT === '1') return 0
  const fixed = Number(process.env.VERCEL_DEPLOY_WAIT_SEC)
  if (Number.isFinite(fixed) && fixed >= 0) return fixed
  return 5 + Math.floor(Math.random() * 6)
}

const INITIAL_WAIT_SEC = deployWaitSec()

if (platform() !== 'darwin') {
  console.error('[open-prod-refresh] Requiere macOS (Safari + osascript).')
  process.exit(1)
}

function sleepSync(seconds) {
  if (seconds <= 0) return
  spawnSync('sleep', [String(seconds)], { stdio: 'ignore' })
}

function osascript(lines) {
  const args = lines.flatMap((line) => ['-e', line])
  const r = spawnSync('osascript', args, { encoding: 'utf8' })
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || 'osascript failed')
    process.exit(r.status ?? 1)
  }
}

function openProd() {
  osascript([
    'tell application "Safari"',
    '  activate',
    `  open location "${PROD_URL.replace(/"/g, '\\"')}"`,
    'end tell',
  ])
}

function reloadFrontTab() {
  osascript([
    'tell application "Safari"',
    '  if (count of windows) > 0 then',
    '    tell front window',
    '      set u to URL of current tab',
    '      set URL of current tab to u',
    '    end tell',
    '  end if',
    'end tell',
  ])
}

if (INITIAL_WAIT_SEC > 0) {
  console.error(`[open-prod-refresh] Esperando ${INITIAL_WAIT_SEC}s (margen deploy Vercel)…`)
  sleepSync(INITIAL_WAIT_SEC)
}

console.error(`[open-prod-refresh] ${PROD_URL} · reload cada ${INTERVAL_SEC}s (Ctrl+C para salir)`)
openProd()

const id = setInterval(() => {
  try {
    reloadFrontTab()
  } catch (e) {
    console.error(e)
  }
}, INTERVAL_SEC * 1000)

function stop() {
  clearInterval(id)
  process.exit(0)
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
