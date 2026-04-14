#!/usr/bin/env node
import { execSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const LOCAL_URL = 'http://127.0.0.1:5173/'

function ensureCloudflared() {
  try {
    execSync('command -v cloudflared', { stdio: 'ignore' })
    return 'cloudflared'
  } catch {
    try {
      execSync('brew install cloudflared', { stdio: 'inherit' })
      return 'cloudflared'
    } catch {
      console.error('[waitme] cloudflared no está disponible y no se pudo instalar con Homebrew.')
      process.exit(1)
    }
  }
}

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

function main() {
  const cloudflared = ensureCloudflared()

  let vite = null

  let tunnel = null
  let shuttingDown = false

  const shutdown = (code = 0) => {
    if (shuttingDown) return
    shuttingDown = true
    try {
      tunnel?.kill('SIGTERM')
    } catch {
      /* */
    }
    try {
      vite?.kill('SIGTERM')
    } catch {
      /* */
    }
    process.exit(code)
  }

  process.on('SIGINT', () => shutdown(0))
  process.on('SIGTERM', () => shutdown(0))

  void (async () => {
    const up = await waitForHttpOk(LOCAL_URL)
    if (!up) {
      const viteJs = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
      if (!existsSync(viteJs)) {
        console.error('[waitme] Falta vite en node_modules.')
        shutdown(1)
        return
      }

      vite = spawn(process.execPath, [viteJs, '--host', '0.0.0.0', '--port', '5173', '--strictPort'], {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env },
      })

      vite.on('error', (err) => {
        console.error(err)
        shutdown(1)
      })

      vite.on('exit', (code) => {
        if (!shuttingDown) shutdown(code ?? 0)
      })

      const viteUp = await waitForHttpOk(LOCAL_URL)
      if (!viteUp) {
        console.error(`[waitme] Vite no respondió en ${LOCAL_URL}`)
        shutdown(1)
        return
      }
    }

    tunnel = spawn(cloudflared, ['tunnel', '--url', LOCAL_URL], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NO_COLOR: '1' },
    })

    tunnel.on('error', (err) => {
      console.error(err)
      shutdown(1)
    })

    tunnel.on('exit', (code) => {
      if (!shuttingDown && code !== 0 && code != null) shutdown(code)
    })

    const onData = (chunk) => {
      const text = String(chunk)
      process.stdout.write(text)
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i)
      if (match) {
        console.log(`\n[waitme] URL iPhone fuera de casa → ${match[0]}\n`)
      }
    }

    tunnel.stdout?.on('data', onData)
    tunnel.stderr?.on('data', onData)
  })()
}

main()
