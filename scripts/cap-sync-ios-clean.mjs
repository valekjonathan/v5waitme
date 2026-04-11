#!/usr/bin/env node
/**
 * Sync iOS sin residuos: borra `ios/App/App/public`, build web y `cap sync ios`.
 * Evita mezclas index.html ↔ hashes de assets (pantalla negra / bundle roto en WKWebView).
 * No escribe `server.url` (sin WAITME_CAP_DEV_SERVER_URL), alineado con `cap-sync-production.mjs`.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const publicDir = path.join(root, 'ios', 'App', 'App', 'public')

console.info('[waitme] cap-sync-ios-clean: eliminando ios/App/App/public\n')

try {
  fs.rmSync(publicDir, { recursive: true, force: true })
  console.info('[waitme] public/ eliminado (o no existía)\n')
} catch (e) {
  console.warn('[waitme] No se pudo eliminar public:', e)
  process.exit(1)
}

function npmRun(script, env) {
  return spawnSync('npm', ['run', script], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env },
  })
}

const b = npmRun('build', {})
if (b.status !== 0) process.exit(b.status ?? 1)

const syncEnv = { ...process.env }
delete syncEnv.WAITME_CAP_DEV_SERVER_URL
delete syncEnv.WAITME_LAN_IP

const r = spawnSync('npx', ['cap', 'sync', 'ios'], { cwd: root, env: syncEnv, stdio: 'inherit' })
process.exit(r.status === null ? 1 : r.status)
