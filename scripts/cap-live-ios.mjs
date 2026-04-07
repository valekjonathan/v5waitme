#!/usr/bin/env node
/**
 * Live Reload (iPhone físico): detecta IPv4 LAN usable, fija WAITME_CAP_DEV_SERVER_URL
 * y ejecuta `npx cap sync ios` para escribir server.url solo en el config generado.
 *
 * Producción: `npm run cap:live:off` (sync sin esa variable).
 *
 * Override manual: CAP_LAN_IP=192.168.x.x  |  Omitir ping: SKIP_LAN_PING=1
 */
import { spawnSync } from 'node:child_process'
import { networkInterfaces } from 'node:os'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

/** Interfaces típicas virtuales / túnel (no LAN Wi‑Fi/Ethernet). */
function isVirtualInterface(name) {
  const n = String(name).toLowerCase()
  if (n === 'lo0' || n === 'lo') return true
  return (
    /^utun\d*$/.test(n) ||
    /^awdl\d*$/.test(n) ||
    /^llw\d*$/.test(n) ||
    /^bridge\d*$/.test(n) ||
    n.includes('docker') ||
    n.includes('veth') ||
    n.includes('vmnet') ||
    n.includes('virbr') ||
    n.startsWith('br-') ||
    n.startsWith('tun') ||
    n.startsWith('tap') ||
    n.includes('cni') ||
    n.includes('vbox') ||
    n.includes('vethernet')
  )
}

/** Solo RFC1918 que pedimos: 10/8 y 192.168/16 (nunca 127, 169.254, 172, etc.). */
function isAllowedPrivateLanIPv4(address) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(address)
  if (!m) return false
  const a = Number(m[1])
  const b = Number(m[2])
  if (a === 127 || a === 0) return false
  if (a === 10) return true
  if (a === 192 && b === 168) return true
  return false
}

function primaryLanIPv4() {
  const nets = networkInterfaces()
  const candidates = []
  for (const [name, list] of Object.entries(nets)) {
    if (!list || isVirtualInterface(name)) continue
    for (const n of list) {
      if (n.family !== 'IPv4' || n.internal) continue
      const addr = n.address
      if (!isAllowedPrivateLanIPv4(addr)) continue
      candidates.push({ name, address: addr })
    }
  }
  if (candidates.length === 0) return null
  const en0 = candidates.find((c) => c.name === 'en0')
  if (en0) return en0.address
  return candidates[0].address
}

function assertNotLocalhost(ip) {
  if (ip === '127.0.0.1' || ip === 'localhost' || ip === '::1') {
    console.error('[waitme] IP inválida para iPhone: no uses loopback. Revisa Wi‑Fi o CAP_LAN_IP.')
    process.exit(1)
  }
}

/**
 * Comprueba que la IP responde a ping (ICMP). Si la red bloquea ICMP, usa SKIP_LAN_PING=1.
 */
function pingLanHost(ip) {
  if (String(process.env.SKIP_LAN_PING || '').trim() === '1') {
    console.info('[waitme] SKIP_LAN_PING=1 — omitiendo ping.\n')
    return true
  }
  const win = process.platform === 'win32'
  const args = win ? ['-n', '1', '-w', '2000', ip] : ['-c', '1', ip]
  const r = spawnSync('ping', args, {
    encoding: 'utf8',
    maxBuffer: 512,
    timeout: 8000,
  })
  if (r.status === 0) return true
  const detail = r.stderr || r.stdout || r.error?.message || 'sin salida'
  console.error('[waitme] Ping falló hacia', ip)
  console.error(
    '  → Comprueba Wi‑Fi (Mac e iPhone en la misma red), firewall local, o ICMP bloqueado.'
  )
  console.error('  → Si la IP es correcta pero ICMP está bloqueado: SKIP_LAN_PING=1 npm run dev')
  console.error('  → Detalle:', detail.trim())
  return false
}

const port = String(process.env.VITE_DEV_PORT || '5173').trim() || '5173'
let ip = String(process.env.CAP_LAN_IP || '').trim()
if (ip) {
  if (!isAllowedPrivateLanIPv4(ip)) {
    console.error(
      '[waitme] CAP_LAN_IP debe ser IPv4 privada 10.x.x.x o 192.168.x.x (no localhost ni 172.x).'
    )
    process.exit(1)
  }
} else {
  ip = primaryLanIPv4() || ''
}

if (!ip) {
  console.error(
    '[waitme] Sin IPv4 LAN (10.x / 192.168.x). Conecta Wi‑Fi o exporta CAP_LAN_IP=192.168.x.x'
  )
  process.exit(1)
}

assertNotLocalhost(ip)

if (!pingLanHost(ip)) {
  process.exit(1)
}

const url = `http://${ip}:${port}`
if (/localhost|127\.0\.0\.1/i.test(url)) {
  console.error('[waitme] URL no debe ser localhost:', url)
  process.exit(1)
}

const env = { ...process.env, WAITME_CAP_DEV_SERVER_URL: url }

console.info(`DEV SERVER URL → ${url}`)
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
