/**
 * Puerto de desarrollo Vite fijo (:5173). Compartido por dev-ios, dev-web y dev-safari-live-reload.
 */
import { spawnSync } from 'node:child_process'
import net from 'node:net'

export const VITE_DEV_PORT = 5173

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
