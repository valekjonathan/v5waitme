#!/usr/bin/env node
/**
 * Build web + `cap sync ios` **sin** `WAITME_CAP_DEV_SERVER_URL` → nunca escribe `server.url`
 * en `ios/App/App/capacitor.config.json`. Usar antes de TestFlight / App Store.
 *
 * @see docs/FLUJO_JONATHAN.md
 */
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function npmRun(script) {
  return spawnSync('npm', ['run', script], { cwd: root, stdio: 'inherit', shell: true })
}

console.info(
  '[waitme] Producción iOS: npm run build + cap sync ios (sin WAITME_CAP_DEV_SERVER_URL)\n' +
    '[waitme] Asegura VITE_SUPABASE_URL=https://<ref>.supabase.co en build (p. ej. .env.production.local); no localhost.\n'
)

const b = npmRun('build')
if (b.status !== 0) process.exit(b.status ?? 1)

const env = { ...process.env }
delete env.WAITME_CAP_DEV_SERVER_URL
delete env.WAITME_LAN_IP

const r = spawnSync('npx', ['cap', 'sync', 'ios'], { cwd: root, env, stdio: 'inherit' })
process.exit(r.status === null ? 1 : r.status)
