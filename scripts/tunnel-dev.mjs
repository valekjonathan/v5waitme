#!/usr/bin/env node
/**
 * Vite (5173) + ngrok. Muestra el HTTPS público vía API local :4040.
 * Requiere ngrok authtoken en el fichero de configuración.
 */
import { execSync, spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function ngrokBinPath() {
  const local = path.join(root, 'node_modules', '.bin', 'ngrok')
  if (existsSync(local)) return local
  return null
}

function ensureNgrokCli() {
  if (ngrokBinPath()) return
  try {
    execSync('command -v ngrok', { stdio: 'ignore' })
    return
  } catch {
    /* */
  }
  try {
    execSync('brew install ngrok/ngrok/ngrok', { stdio: 'inherit' })
  } catch {
    console.error(
      '\nERROR: ngrok no está disponible. En la raíz del proyecto: npm install\n' +
        'O instala el CLI: brew install ngrok/ngrok/ngrok\n'
    )
    process.exit(1)
  }
}

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

async function waitForPublicUrl(maxMs = 90000) {
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
  ensureNgrokCli()

  if (!hasValidAuthtoken()) {
    console.error(
      '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        'ERROR: falta authtoken de ngrok.\n' +
        'Sin token no hay túnel público (límite de ngrok).\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
    )
    process.exit(1)
  }

  const vite = spawn('npm', ['run', 'dev'], {
    cwd: root,
    shell: true,
    stdio: 'inherit',
    env: { ...process.env },
  })

  const ngrokCmd = ngrokBinPath() || 'ngrok'
  const ngrok = spawn(ngrokCmd, ['http', '5173'], {
    cwd: root,
    shell: !ngrokBinPath(),
    stdio: 'ignore',
    env: { ...process.env },
  })

  let shuttingDown = false
  const shutdown = (code = 0) => {
    if (shuttingDown) return
    shuttingDown = true
    try {
      ngrok.kill('SIGTERM')
    } catch {
      /* */
    }
    try {
      vite.kill('SIGTERM')
    } catch {
      /* */
    }
    process.exit(code)
  }

  process.on('SIGINT', () => shutdown(0))
  process.on('SIGTERM', () => shutdown(0))

  vite.on('error', (e) => {
    console.error(e)
    shutdown(1)
  })
  ngrok.on('error', (e) => {
    console.error(e)
    shutdown(1)
  })

  vite.on('exit', (c) => {
    if (!shuttingDown) shutdown(c ?? 0)
  })
  ngrok.on('exit', (c) => {
    if (!shuttingDown && c !== 0 && c != null) shutdown(c)
  })

  void (async () => {
    const url = await waitForPublicUrl()
    if (!url) {
      console.error('\nERROR: no se obtuvo URL HTTPS de ngrok (revisa token y puerto 4040).\n')
      shutdown(1)
      return
    }
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(url)
    console.log('estado: activo')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  })()
}

main()
