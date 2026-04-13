#!/usr/bin/env node
/**
 * Safari + BrowserSync proxy (live-reload vía snippet en :5175).
 * 1) Comprueba que :5173 esté libre (mismo criterio que dev-ios / dev-web)
 * 2) Vite en :5173
 * 3) Espera HTTP 200 en 127.0.0.1:5173
 * 4) Arranca proxy; espera HTTP 200 en el proxy
 * 5) Abre Safari con `open -a Safari` (sin AppleScript)
 */
import { spawn } from 'node:child_process'
import process from 'node:process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkPort5173Available, printLsof5173, VITE_DEV_PORT } from './vite-dev-5173.mjs'
import { openDarwinSafari, waitForHttpOk } from './ngrok-tunnel-lib.mjs'
import {
  waitmeLocalIphonePreviewUrl,
  WAITME_BROWSER_SYNC_PREVIEW_PORT,
} from './waitme-local-iphone-preview.mjs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const VITE_PORT = VITE_DEV_PORT
const BS_PORT = WAITME_BROWSER_SYNC_PREVIEW_PORT
const safariUrl = waitmeLocalIphonePreviewUrl(BS_PORT)

const viteJs = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')

async function main() {
  if (!(await checkPort5173Available())) {
    console.error('[waitme] PORT 5173 ALREADY IN USE (necesario para Vite antes del proxy).')
    printLsof5173()
    process.exit(1)
  }

  const vite = spawn(process.execPath, [viteJs, '--port', String(VITE_PORT), '--strictPort'], {
    cwd: root,
    env: { ...process.env },
    stdio: 'inherit',
  })

  let bs = null

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
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
