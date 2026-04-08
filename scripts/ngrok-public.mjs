#!/usr/bin/env node
/**
 * Solo túnel público → :5173 (Vite debe estar ya en marcha salvo que arranque aquí).
 * Token: NGROK_AUTHTOKEN en .env.local (mergeDevEnvFromFiles).
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  mergeDevEnvFromFiles,
  ngrokBinPath,
  hasNgrokAuthtoken,
  waitForHttpOk,
  waitForNgrokHttpsUrl,
  spawnNgrokHttp,
  NGROK_DEV_PORT,
} from './ngrok-tunnel-lib.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

mergeDevEnvFromFiles(root)

const PORT = NGROK_DEV_PORT
const NGROK_BIN = ngrokBinPath(root)

function main() {
  if (!NGROK_BIN) {
    console.error('\nFalta el binario ngrok. Ejecuta: npm install\n')
    process.exit(1)
  }

  if (!hasNgrokAuthtoken()) {
    console.error(
      '\n╔══════════════════════════════════════════════════════════════════╗\n' +
        '║  NGROK: hace falta un authtoken                                  ║\n' +
        '║  https://dashboard.ngrok.com/get-started/your-authtoken          ║\n' +
        '║  NGROK_AUTHTOKEN=… en .env.local                                 ║\n' +
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
      console.log(`\n[ngrok-public] Arrancando Vite en :${PORT}…\n`)
      const viteJs = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
      if (!existsSync(viteJs)) {
        console.error('Falta vite en node_modules.\n')
        shutdown(1)
        return
      }
      viteChild = spawn(
        process.execPath,
        [viteJs, '--host', '0.0.0.0', '--port', String(PORT), '--strictPort'],
        { cwd: root, env: { ...process.env }, stdio: 'inherit' }
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
        console.error(`\nERROR: Vite no respondió en ${local}\n`)
        shutdown(1)
        return
      }
    }

    ngrokChild = spawnNgrokHttp(root, PORT)
    if (!ngrokChild) {
      shutdown(1)
      return
    }
    ngrokChild.on('error', (e) => {
      console.error(e)
      shutdown(1)
    })
    ngrokChild.on('exit', (c) => {
      if (!shuttingDown && c !== 0 && c != null) shutdown(c ?? 1)
    })

    const url = await waitForNgrokHttpsUrl()
    if (!url) {
      console.error('\nERROR: no se obtuvo URL HTTPS de ngrok.\n')
      shutdown(1)
      return
    }

    console.log('\n👉 URL iPhone fuera de casa →', url)
    console.log('\nTúnel activo. Ctrl+C cierra ngrok' + (viteChild ? ' y Vite' : '') + '.\n')
  })()
}

main()
