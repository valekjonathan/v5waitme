import { networkInterfaces } from 'node:os'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test'
import { loadEnv } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Misma carga que Vite: `.env`, `.env.local`, etc. (gitignored) para E2E y credenciales locales. */
const viteFileEnv = loadEnv('development', __dirname, '')
for (const [k, v] of Object.entries(viteFileEnv)) {
  if (!String(process.env[k] ?? '').trim()) process.env[k] = v
}

/** Alineado con `vite.config.js` / `preferredLanIPv4`: solo 10.x / 192.168.x, sin virtuales. */
function preferredLanIPv4(): string | null {
  const skipName = (name: string) => {
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
  const ok = (addr: string) => {
    const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(addr)
    if (!m) return false
    const a = Number(m[1])
    const b = Number(m[2])
    if (a === 127 || a === 0) return false
    if (a === 10) return true
    if (a === 192 && b === 168) return true
    return false
  }
  const candidates: { name: string; address: string }[] = []
  for (const [name, list] of Object.entries(networkInterfaces())) {
    if (!list || skipName(name)) continue
    for (const n of list) {
      if (n.family !== 'IPv4' || n.internal) continue
      if (ok(n.address)) candidates.push({ name, address: n.address })
    }
  }
  if (candidates.length === 0) return null
  const en0 = candidates.find((c) => c.name === 'en0')
  return (en0 ?? candidates[0]).address
}

/** Puerto dedicado E2E para no chocar con `npm run dev` en 5173. */
const E2E_PORT = 5174

const useLanBase = String(process.env.WAITME_E2E_LAN_BASE ?? '').trim() === '1'
const lanIp = preferredLanIPv4()
const E2E_ORIGIN =
  useLanBase && lanIp ? `http://${lanIp}:${E2E_PORT}` : `http://localhost:${E2E_PORT}`

if (useLanBase) {
  if (lanIp) {
    console.log(`[playwright] WAITME_E2E_LAN_BASE=1 → baseURL y webServer.url = ${E2E_ORIGIN}`)
  } else {
    console.warn(
      '[playwright] WAITME_E2E_LAN_BASE=1 pero no hay IPv4 LAN (10.x/192.168.x); se usa localhost'
    )
  }
}

const projects: NonNullable<PlaywrightTestConfig['projects']> = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
]

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: E2E_ORIGIN,
    trace: 'on-first-retry',
  },
  projects,
  webServer: {
    command: `env VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite --host 0.0.0.0 --port ${E2E_PORT} --strictPort`,
    url: E2E_ORIGIN,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
