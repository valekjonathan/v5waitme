#!/usr/bin/env node
/**
 * Live reload en iPhone físico: aplica `server.url` solo durante `cap sync ios`
 * si WAITME_CAP_DEV_SERVER_URL está definida (vía este script con subcomando `on`).
 *
 * `off` sincroniza sin esa variable → WKWebView vuelve a cargar `dist/` embebido (producción).
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

const sub = process.argv[2] || 'on'
const port = String(process.env.VITE_DEV_PORT || '5173').trim() || '5173'

/** Entorno limpio para cap sync: sin server.url heredado de la shell. */
const baseEnv = { ...process.env }
delete baseEnv.WAITME_CAP_DEV_SERVER_URL

if (sub === 'off') {
  console.info('[waitme] cap:live:off → sync iOS sin server.url (bundle local dist/).\n')
} else if (sub === 'on') {
  const ip = String(process.env.CAP_LAN_IP || primaryLanIPv4() || '').trim()
  if (!ip) {
    console.error(
      '[waitme] No hay IPv4 LAN. Exporta CAP_LAN_IP=192.168.x.x o conecta la interfaz Wi‑Fi.'
    )
    process.exit(1)
  }
  const url = `http://${ip}:${port}`
  baseEnv.WAITME_CAP_DEV_SERVER_URL = url
  console.info(`[waitme] cap:live:on → server.url = ${url}`)
  console.info('  • Terminal A: npm run dev')
  console.info('  • Misma Wi‑Fi: Mac + iPhone')
  console.info('  • Xcode: Run en el dispositivo')
  console.info('  • Al acabar: npm run cap:live:off\n')
} else {
  console.error('Uso: node scripts/cap-live-ios.mjs [on|off]')
  process.exit(1)
}

const r = spawnSync('npx', ['cap', 'sync', 'ios'], {
  cwd: root,
  env: baseEnv,
  stdio: 'inherit',
})

process.exit(r.status === null ? 1 : r.status)
