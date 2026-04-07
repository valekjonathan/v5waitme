#!/usr/bin/env node
/**
 * Live Reload (iPhone físico): detecta IPv4 LAN, fija WAITME_CAP_DEV_SERVER_URL
 * y ejecuta `npx cap sync ios` para escribir server.url solo en el config generado.
 *
 * Producción: `npm run cap:live:off` (sync sin esa variable).
 */
import { spawnSync } from 'node:child_process'
import { networkInterfaces } from 'node:os'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function primaryLanIPv4() {
  for (const list of Object.values(networkInterfaces())) {
    if (!list) continue
    for (const n of list) {
      if (n.family !== 'IPv4' || n.internal) continue
      return n.address
    }
  }
  return null
}

const port = String(process.env.VITE_DEV_PORT || '5173').trim() || '5173'
const ip = String(process.env.CAP_LAN_IP || primaryLanIPv4() || '').trim()

if (!ip) {
  console.error('[waitme] Sin IPv4 LAN. Conecta Wi‑Fi o exporta CAP_LAN_IP=192.168.x.x')
  process.exit(1)
}

const url = `http://${ip}:${port}`
const env = { ...process.env, WAITME_CAP_DEV_SERVER_URL: url }

console.info(`[waitme] cap:live:on → ${url}`)
console.info('  → otra terminal: npm run dev')
console.info('  → Xcode: Run en iPhone (misma Wi‑Fi)')
console.info('  → fin dev: npm run cap:live:off\n')

const r = spawnSync('npx', ['cap', 'sync', 'ios'], {
  cwd: root,
  env,
  stdio: 'inherit',
})

process.exit(r.status === null ? 1 : r.status)
