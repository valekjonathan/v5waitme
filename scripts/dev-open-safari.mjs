#!/usr/bin/env node
import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const VITE_PORT = 5173
const LOCAL_URL = `http://localhost:${VITE_PORT}/`

async function waitForHttpOk(url, maxMs = 90_000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(url, { redirect: 'manual', headers: { Accept: 'text/html' } })
      if (res.status === 200) return true
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

function openSafari(url) {
  if (process.platform !== 'darwin') return
  spawn('open', ['-a', 'Safari', url], {
    cwd: root,
    stdio: 'ignore',
    detached: true,
  }).unref()
}

function main() {
  const vite = spawn('npm', ['run', 'dev:raw'], {
    cwd: root,
    shell: true,
    stdio: 'inherit',
    env: { ...process.env },
  })

  let shuttingDown = false
  const shutdown = (code = 0) => {
    if (shuttingDown) return
    shuttingDown = true
    try {
      vite.kill('SIGTERM')
    } catch {
      /* */
    }
    process.exit(code)
  }

  process.on('SIGINT', () => shutdown(0))
  process.on('SIGTERM', () => shutdown(0))

  vite.on('error', (err) => {
    console.error(err)
    shutdown(1)
  })

  vite.on('exit', (code) => {
    if (!shuttingDown) shutdown(code ?? 0)
  })

  void (async () => {
    const ok = await waitForHttpOk(LOCAL_URL)
    if (!ok) {
      console.error(`[waitme] No se pudo abrir Safari: Vite no respondió en ${LOCAL_URL}`)
      shutdown(1)
      return
    }
    if (String(process.env.WAITME_SKIP_SAFARI_OPEN || '').trim() !== '1') {
      openSafari(LOCAL_URL)
    }
  })()
}

main()
