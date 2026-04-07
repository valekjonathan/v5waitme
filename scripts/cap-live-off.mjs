#!/usr/bin/env node
/**
 * `cap sync ios` sin `WAITME_CAP_DEV_SERVER_URL` → no queda `server.url` en la config nativa.
 * Uso: antes de archivar / TestFlight o para probar el bundle embebido.
 */
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const env = { ...process.env }
delete env.WAITME_CAP_DEV_SERVER_URL

console.info('[waitme] cap sync ios sin WAITME_CAP_DEV_SERVER_URL (sin server.url)\n')
const r = spawnSync('npx', ['cap', 'sync', 'ios'], {
  cwd: root,
  env,
  stdio: 'inherit',
})
process.exit(r.status === null ? 1 : r.status)
