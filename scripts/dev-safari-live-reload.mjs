#!/usr/bin/env node
/**
 * Safari + BrowserSync proxy (live-reload vía snippet en :5175).
 * 1) Vite en :5173
 * 2) Espera HTTP 200 en 127.0.0.1:5173
 * 3) Arranca proxy; espera HTTP 200 en el proxy
 * 4) Abre Safari con `open -a Safari` (sin AppleScript)
 */
import { spawn } from 'node:child_process'
import process from 'node:process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { openDarwinSafari, waitForHttpOk } from './ngrok-tunnel-lib.mjs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const VITE_PORT = 5173
const BS_PORT = 5175
const safariUrl = `http://localhost:${BS_PORT}/?iphone=true`

const viteJs = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const vite = spawn(process.execPath, [viteJs, '--port', String(VITE_PORT), '--strictPort'], {
  cwd: root,
  env: { ...process.env },
  stdio: 'inherit',
})

let bs = null

void (async () => {
  const viteUp = await waitForHttpOk(`http://127.0.0.1:${VITE_PORT}/`, 90_000)
  if (!viteUp) {
    console.error('[waitme] Vite no respondió HTTP 200 en :5173.')
    try {
      vite.kill('SIGTERM')
    } catch {
      /* */
    }
    process.exit(1)
  }

  bs = require('browser-sync').create()
  bs.init(
    {
      proxy: `http://127.0.0.1:${VITE_PORT}`,
      port: BS_PORT,
      ui: false,
      notify: false,
      open: false,
      ghostMode: false,
      snippetOptions: {
        rule: {
          match: /<\/body>/i,
          fn: (snippet, match) => `${snippet}${match}`,
        },
      },
    },
    async () => {
      const proxyUp = await waitForHttpOk(`http://127.0.0.1:${BS_PORT}/`, 30_000)
      if (!proxyUp) {
        console.warn('[waitme] Proxy :5175 no respondió 200 a tiempo; abriendo Safari de todos modos.')
      }
      console.log(`\n[waitme] Safari live-reload proxy: ${safariUrl}\n`)
      openDarwinSafari(safariUrl)
    }
  )
})()

function shutdown(code) {
  try {
    bs?.exit()
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

process.on('SIGINT', () => shutdown(130))
process.on('SIGTERM', () => shutdown(143))
vite.on('exit', (code) => shutdown(code ?? 0))
