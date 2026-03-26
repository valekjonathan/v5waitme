/**
 * Safari: cuando producción responde OK (HEAD), localiza la pestaña cuya URL contiene el host,
 * recarga solo esa pestaña; si no existe, abre PROD_URL.
 *
 * Env: PROD_URL, PROD_LIVE_INTERVAL_SEC, VERCEL_DEPLOY_WAIT_SEC (primer margen antes del poll),
 * SKIP_DEPLOY_WAIT (omitir espera a producción lista).
 */
import { spawnSync } from 'node:child_process'
import { platform } from 'node:os'

const PROD_URL_RAW = process.env.PROD_URL || 'https://v5waitme.vercel.app'
let PROD_URL
try {
  PROD_URL = new URL(PROD_URL_RAW).href
} catch {
  console.error('[open-prod-refresh] PROD_URL inválida:', PROD_URL_RAW)
  process.exit(1)
}

const HOST = new URL(PROD_URL).hostname
const INTERVAL_SEC = Math.max(2, Number(process.env.PROD_LIVE_INTERVAL_SEC) || 5)
const POLL_MS = Math.max(2000, Number(process.env.PROD_READY_POLL_MS) || 4000)
const READY_MAX_MS = Math.max(5000, Number(process.env.PROD_READY_MAX_MS) || 180_000)

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

function asStringLiteral(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

async function waitUntilProdRespondsOk(url) {
  const deadline = Date.now() + READY_MAX_MS
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { method: 'HEAD', redirect: 'follow', cache: 'no-store' })
      if (r.ok) return true
    } catch {
      /* redeploy / DNS */
    }
    await new Promise((res) => setTimeout(res, POLL_MS))
  }
  return false
}

function focusReloadOrOpen() {
  const needle = asStringLiteral(HOST)
  const targetUrl = asStringLiteral(PROD_URL)
  osascript([
    'tell application "Safari"',
    '  activate',
    '  set needle to "' + needle + '"',
    '  set targetUrl to "' + targetUrl + '"',
    '  set found to false',
    '  repeat with w in windows',
    '    try',
    '      repeat with t in tabs of w',
    '        try',
    '          set u to URL of t',
    '          if u contains needle then',
    '            set current tab of w to t',
    '            set index of w to 1',
    '            set URL of t to u',
    '            set found to true',
    '            exit repeat',
    '          end if',
    '        end try',
    '      end repeat',
    '      if found then exit repeat',
    '    end try',
    '  end repeat',
    '  if not found then open location targetUrl',
    'end tell',
  ])
}

async function main() {
  if (INITIAL_WAIT_SEC > 0) {
    console.error(`[open-prod-refresh] Esperando ${INITIAL_WAIT_SEC}s (margen deploy)…`)
    sleepSync(INITIAL_WAIT_SEC)
  }

  if (process.env.SKIP_DEPLOY_WAIT !== '1') {
    console.error(
      `[open-prod-refresh] Esperando respuesta HTTP OK en ${PROD_URL} (máx ${READY_MAX_MS / 1000}s)…`
    )
    const ok = await waitUntilProdRespondsOk(PROD_URL)
    if (!ok) {
      console.error('[open-prod-refresh] No hubo 200 a tiempo; se recarga igualmente.')
    }
  }

  console.error(
    `[open-prod-refresh] ${PROD_URL} (${HOST}) · reload cada ${INTERVAL_SEC}s (Ctrl+C para salir)`
  )
  focusReloadOrOpen()

  const id = setInterval(() => {
    try {
      focusReloadOrOpen()
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
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
