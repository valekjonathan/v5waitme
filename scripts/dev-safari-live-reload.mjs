#!/usr/bin/env node
/**
 * Safari auto-refresh (sin AppleScript):
 * - Arranca Vite en 5173
 * - Arranca BrowserSync como proxy con LiveReload en 5175
 * - Abre Safari en el proxy (injecta el snippet de reload)
 *
 * Evita `osascript` y por tanto el error macOS `-1743`.
 */
import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const VITE_PORT = 5173
const BS_PORT = 5175
const safariUrl = `http://localhost:${BS_PORT}/?iphone=true`

function openSafari(url) {
  if (process.platform !== 'darwin') return
  try {
    spawnSync('open', ['-a', 'Safari', url], { stdio: 'ignore' })
  } catch {
    // ignore
  }
}

const viteJs = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const vite = spawn(process.execPath, [viteJs, '--port', String(VITE_PORT), '--strictPort'], {
  cwd: root,
  env: { ...process.env },
  stdio: 'inherit',
})

const bs = require('browser-sync').create()
bs.init(
  {
    proxy: `http://localhost:${VITE_PORT}`,
    port: BS_PORT,
    ui: false,
    notify: false,
    open: false,
    ghostMode: false,
    // LiveReload vía snippet (Safari refresca sin intervención manual)
    snippetOptions: {
      rule: {
        match: /<\/body>/i,
        fn: (snippet, match) => `${snippet}${match}`,
      },
    },
  },
  () => {
    console.log(`\n[waitme] Safari live-reload proxy: ${safariUrl}\n`)
    openSafari(safariUrl)
  }
)

function shutdown(code) {
  try {
    bs.exit()
  } catch {
    // ignore
  }
  try {
    vite.kill('SIGTERM')
  } catch {
    // ignore
  }
  process.exit(code)
}

process.on('SIGINT', () => shutdown(130))
process.on('SIGTERM', () => shutdown(143))
vite.on('exit', (code) => shutdown(code ?? 0))

