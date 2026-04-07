#!/usr/bin/env node
/**
 * IPv4 LAN usable (10.x / 192.168.x) para Capacitor + Vite dev.
 * Exporta API para otros scripts; en CLI imprime la IP o líneas `--export-env`.
 *
 * Override: CAP_LAN_IP=…  |  SKIP_LAN_PING=1
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { networkInterfaces } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

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

export function isAllowedPrivateLanIPv4(address) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(address)
  if (!m) return false
  const a = Number(m[1])
  const b = Number(m[2])
  if (a === 127 || a === 0) return false
  if (a === 10) return true
  if (a === 192 && b === 168) return true
  return false
}

export function primaryLanIPv4() {
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

export function assertNotLocalhost(ip) {
  if (ip === '127.0.0.1' || ip === 'localhost' || ip === '::1') {
    console.error('[waitme] IP inválida para iPhone: no uses loopback. Revisa Wi‑Fi o CAP_LAN_IP.')
    process.exit(1)
  }
}

export function pingLanHost(ip) {
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
  console.error(
    '  → Si la IP es correcta pero ICMP está bloqueado: SKIP_LAN_PING=1 npm run dev:ios'
  )
  console.error('  → Detalle:', detail.trim())
  return false
}

export function devPort() {
  return String(process.env.VITE_DEV_PORT || '5173').trim() || '5173'
}

/** Actualiza o crea `.env.local` con `VITE_DEV_LAN_ORIGIN` (origen único OAuth + Vite define). */
export function upsertEnvLocalViteDevLanOrigin(rootDir, originUrl) {
  const envPath = path.join(rootDir, '.env.local')
  const key = 'VITE_DEV_LAN_ORIGIN'
  const line = `${key}=${originUrl}`
  let body = ''
  try {
    body = fs.readFileSync(envPath, 'utf8')
  } catch {
    /* crear */
  }
  const lines = body.split(/\r?\n/)
  let replaced = false
  const next = lines.map((l) => {
    const t = l.trim()
    if (t.startsWith(`${key}=`) || new RegExp(`^${key}\\s*=`).test(t)) {
      replaced = true
      return line
    }
    return l
  })
  if (!replaced) {
    if (next.length && next[next.length - 1] !== '') next.push('')
    next.push(line)
  }
  fs.writeFileSync(envPath, next.join('\n').replace(/\n+$/, '\n'))
}

/**
 * Resuelve IP + URL http://IP:port; hace ping salvo SKIP_LAN_PING=1.
 * @returns {{ ip: string, url: string }}
 */
export function resolveWaitmeLanDevOrExit() {
  const port = devPort()
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
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(url)) {
    console.error('[waitme] URL no debe ser localhost ni 0.0.0.0:', url)
    process.exit(1)
  }

  return { ip, url }
}

const __filename = fileURLToPath(import.meta.url)
const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename

if (isCli) {
  const args = process.argv.slice(2)
  if (args.includes('--export-env')) {
    const { ip, url } = resolveWaitmeLanDevOrExit()
    console.log(`WAITME_LAN_IP=${ip}`)
    console.log(`WAITME_CAP_DEV_SERVER_URL=${url}`)
    process.exit(0)
  }
  const { ip } = resolveWaitmeLanDevOrExit()
  console.log(ip)
  process.exit(0)
}
