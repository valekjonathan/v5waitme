#!/usr/bin/env node
/**
 * URL HTTPS pública → http://localhost:5173 (Vite) vía ngrok.
 * Instalación: `ngrok` en devDependencies (`npm install` en el repo).
 * Cuenta gratuita: https://dashboard.ngrok.com/ → authtoken →
 *   `ngrok config add-authtoken …` o variable NGROK_AUTHTOKEN en .env.local
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const viteFileEnv = loadEnv('development', root, '')
for (const [k, v] of Object.entries(viteFileEnv)) {
  if (!String(process.env[k] ?? '').trim()) process.env[k] = v
}

const NGROK_BIN = path.join(root, 'node_modules', '.bin', 'ngrok')
const PORT = 5173

function ngrokConfigPaths() {
  const h = homedir()
  return [
    path.join(h, 'Library', 'Application Support', 'ngrok', 'ngrok.yml'),
    path.join(h, '.config', 'ngrok', 'ngrok.yml'),
    path.join(h, '.ngrok2', 'ngrok.yml'),
  ]
}

function hasValidAuthtoken() {
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

async function waitForHttpOk(url, maxMs = 90_000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(url, { redirect: 'manual', headers: { Accept: 'text/html' } })
      if (res.ok || res.status === 304) return true
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

async function waitForPublicUrl(maxMs = 90_000) {
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

function main() {
  if (!existsSync(NGROK_BIN)) {
    console.error(
      '\nFalta el binario ngrok. En la raíz del proyecto ejecuta: npm install\n'
    )
    process.exit(1)
  }

  if (!hasValidAuthtoken()) {
    console.error(
      '\n╔══════════════════════════════════════════════════════════════════╗\n' +
        '║  NGROK: hace falta un authtoken                                  ║\n' +
        '║  1. https://dashboard.ngrok.com/get-started/your-authtoken       ║\n' +
        '║  2. ngrok config add-authtoken TU_TOKEN                          ║\n' +
        '║     o añade NGROK_AUTHTOKEN=… en .env.local (cargado aquí)       ║\n' +
        '╚══════════════════════════════════════════════════════════════════╝\n'
    )
    process.exit(1)
  }

  let viteChild = null
  let ngrokChild = null
  let shuttingDown = false

  const shutdown = (code = 0) => {
    if (shuttingDown) return
    shuttingDown = true
    try {
      ngrokChild?.kill('SIGTERM')
    } catch {
      /* */
    }
    try {
      viteChild?.kill('SIGTERM')
    } catch {
      /* */
    }
    process.exit(code)
  }

  process.on('SIGINT', () => shutdown(0))
  process.on('SIGTERM', () => shutdown(0))

  void (async () => {
    const local = `http://127.0.0.1:${PORT}/`
    let up = await waitForHttpOk(local, 2000)
    if (!up) {
      console.log(`\n[ngrok-public] No hay servidor en :${PORT}; arrancando Vite…\n`)
      viteChild = spawn(
        process.execPath,
        [
          path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
          '--port',
          String(PORT),
          '--strictPort',
        ],
        {
          cwd: root,
          env: { ...process.env },
          stdio: 'inherit',
        }
      )
      viteChild.on('error', (e) => {
        console.error(e)
        shutdown(1)
      })
      viteChild.on('exit', (c) => {
        if (!shuttingDown && c !== 0 && c != null) shutdown(c ?? 1)
      })
      up = await waitForHttpOk(local, 60_000)
      if (!up) {
        console.error(`\nERROR: Vite no respondió en ${local} a tiempo.\n`)
        shutdown(1)
        return
      }
    }

    ngrokChild = spawn(NGROK_BIN, ['http', String(PORT)], {
      cwd: root,
      env: { ...process.env },
      stdio: 'ignore',
    })
    ngrokChild.on('error', (e) => {
      console.error(e)
      shutdown(1)
    })
    ngrokChild.on('exit', (c) => {
      if (!shuttingDown && c !== 0 && c != null) shutdown(c ?? 1)
    })

    const url = await waitForPublicUrl()
    if (!url) {
      console.error('\nERROR: no se obtuvo la URL HTTPS de ngrok (¿puerto 4040 bloqueado?).\n')
      shutdown(1)
      return
    }

    console.log('\n')
    console.log('╔══════════════════════════════════════════════════════════════════╗')
    console.log('║  WAITME — URL PÚBLICA (ábrela en el iPhone fuera de casa)        ║')
    console.log('╠══════════════════════════════════════════════════════════════════╣')
    console.log(`║  ${url.padEnd(64)}║`)
    console.log('╚══════════════════════════════════════════════════════════════════╝')
    console.log('\nTúnel activo. Ctrl+C para cerrar ngrok' + (viteChild ? ' y Vite' : '') + '.\n')
  })()
}

main()
