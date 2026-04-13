/**
 * Puerto de desarrollo Vite fijo (:5173). Compartido por dev-ios, dev-web y dev-safari-live-reload.
 */
import { execSync, spawnSync } from 'node:child_process'
import net from 'node:net'
import { platform } from 'node:process'

export const VITE_DEV_PORT = 5173

/**
 * Mata procesos que escuchan en TCP :5173 (p. ej. Vite colgado) y espera a que el puerto quede libre.
 * macOS/Linux: `lsof`. En Windows no-op: el arranque fallará con EADDRINUSE si sigue ocupado.
 */
export async function ensurePort5173Free() {
  if (platform === 'win32') return

  const killListeners = (signal) => {
    try {
      const out = execSync(`lsof -tiTCP:${VITE_DEV_PORT} -sTCP:LISTEN`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      const pids = out
        .trim()
        .split(/[\s\n]+/)
        .filter(Boolean)
      for (const pid of pids) {
        const n = Number(pid)
        if (Number.isFinite(n) && n > 0) {
          try {
            process.kill(n, signal)
          } catch {
            /* */
          }
        }
      }
    } catch {
      /* sin listeners */
    }
  }

  killListeners('SIGTERM')
  for (let i = 0; i < 40; i++) {
    if (await checkPort5173Available()) return
    await new Promise((r) => setTimeout(r, 50))
  }
  killListeners('SIGKILL')
  await new Promise((r) => setTimeout(r, 200))
  if (!(await checkPort5173Available())) {
    throw new Error(
      `[waitme] Puerto ${VITE_DEV_PORT} sigue ocupado. Ejecuta: lsof -iTCP:${VITE_DEV_PORT} -sTCP:LISTEN`
    )
  }
}

export function checkPort5173Available() {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.unref()
    s.on('error', (err) => {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'EADDRINUSE') resolve(false)
      else reject(err)
    })
    s.listen(VITE_DEV_PORT, '0.0.0.0', () => {
      s.close(() => resolve(true))
    })
  })
}

export function printLsof5173() {
  try {
    const r = spawnSync('lsof', ['-iTCP:5173', '-sTCP:LISTEN', '-n', '-P'], { encoding: 'utf8' })
    if (r.stdout) console.error(r.stdout)
  } catch {
    /* lsof no disponible */
  }
}
