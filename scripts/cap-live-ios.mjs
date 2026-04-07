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
  const nets = networkInterfaces()
  const candidates = []
  for (const [name, list] of Object.entries(nets)) {
    if (!list) continue
    for (const n of list) {
      if (n.family !== 'IPv4' || n.internal) continue
      candidates.push({ name, address: n.address })
    }
  }
  if (candidates.length === 0) return null
  const en0 = candidates.find((c) => c.name === 'en0')
  if (en0) return en0.address
  return candidates[0].address
}

const port = String(process.env.VITE_DEV_PORT || '5173').trim() || '5173'
const ip = String(process.env.CAP_LAN_IP || primaryLanIPv4() || '').trim()

if (!ip) {
  console.error('[waitme] Sin IPv4 LAN. Conecta Wi‑Fi o exporta CAP_LAN_IP=192.168.x.x')
  process.exit(1)
}

const url = `http://${ip}:${port}`
const env = { ...process.env, WAITME_CAP_DEV_SERVER_URL: url }

console.info(`[waitme] Live URL → ${url} (cap sync ios)`)
console.info('  → Vite arranca a continuación (Safari + HMR).')
console.info('  → iPhone: Xcode → Run una vez; luego HMR vía red Wi‑Fi.')
console.info('  → Solo web / sin iOS: npm run dev:vite')
console.info('  → Producción limpia: npm run cap:live:off\n')

const r = spawnSync('npx', ['cap', 'sync', 'ios'], {
  cwd: root,
  env,
  stdio: 'inherit',
})

process.exit(r.status === null ? 1 : r.status)
