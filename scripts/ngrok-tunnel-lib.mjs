/**
 * Ngrok desde node_modules + token (.env.local / ngrok.yml).
 * Usado por `dev-ios.mjs` y `ngrok-public.mjs`. No invoca BrowserStack.
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { loadEnv } from 'vite'

export const NGROK_DEV_PORT = 5173

export function mergeDevEnvFromFiles(root) {
  const viteFileEnv = loadEnv('development', root, '')
  for (const [k, v] of Object.entries(viteFileEnv)) {
    if (!String(process.env[k] ?? '').trim()) process.env[k] = v
  }
}

export function ngrokBinPath(root) {
  const p = path.join(root, 'node_modules', '.bin', 'ngrok')
  return existsSync(p) ? p : null
}

function ngrokConfigPaths() {
  const h = homedir()
  return [
    path.join(h, 'Library', 'Application Support', 'ngrok', 'ngrok.yml'),
    path.join(h, '.config', 'ngrok', 'ngrok.yml'),
    path.join(h, '.ngrok2', 'ngrok.yml'),
  ]
}

export function hasNgrokAuthtoken() {
  const env = process.env.NGROK_AUTHTOKEN
  if (typeof env === 'string' && env.trim().length > 10) return true
  for (const p of ngrokConfigPaths()) {
    if (!existsSync(p)) continue
    try {
      const s = readFileSync(p, 'utf8')
      const m = s.match(/^\s*authtoken:\s*(\S+)/m)
      if (m && m[1].length > 10) return true
    } catch {
      /* */
    }
  }
  return false
}

/**
 * Espera respuestas HTTP reales (fetch), no solo puerto abierto.
 * Solo éxito si `status === 200` (no 304 ni otros 2xx).
 *
 * @param {string} url
 * @param {number} [maxMs=90_000]
 */
export async function waitForHttpOk(url, maxMs = 90_000) {
  const start = Date.now()
  const intervalMs = 500
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(url, { redirect: 'manual', headers: { Accept: 'text/html' } })
      if (res.status === 200) return true
    } catch {
      /* red aún no lista o conexión rechazada */
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return false
}

/**
 * Una sola petición: true solo si el servidor responde 200.
 *
 * @param {string} url
 */
export async function probeHttp200(url) {
  try {
    const res = await fetch(url, { redirect: 'manual', headers: { Accept: 'text/html' } })
    return res.status === 200
  } catch {
    return false
  }
}

/**
 * macOS: abre o enfoca Safari en la URL usando solo `open` (sin AppleScript).
 * Repetir el mismo comando con la misma URL es el modo fiable de recargar / traer foco.
 *
 * @param {string} url
 */
export function openDarwinSafari(url) {
  if (process.platform !== 'darwin') return
  try {
    spawnSync('open', ['-a', 'Safari', url], { stdio: 'ignore' })
  } catch {
    /* Safari ausente o `open` falló */
  }
}

export async function waitForNgrokHttpsUrl(maxMs = 90_000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch('http://127.0.0.1:4040/api/tunnels')
      if (!res.ok) throw new Error('api')
      const data = await res.json()
      const tunnels = data.tunnels || []
      const https = tunnels.find((t) => t.proto === 'https')
      if (https?.public_url) return https.public_url
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  return null
}

/**
 * @param {string} root
 * @param {number} port
 * @param {Record<string, string | undefined>} [extraEnv]
 * @returns {import('node:child_process').ChildProcess | null}
 */
export function spawnNgrokHttp(root, port, extraEnv = {}) {
  const bin = ngrokBinPath(root)
  if (!bin) return null
  return spawn(bin, ['http', String(port)], {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: 'ignore',
  })
}
