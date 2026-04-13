#!/usr/bin/env node
/**
 * LOCAL_DEV_MAC — único arranque local canónico:
 * - Libera TCP :5173 (Vite `strictPort` en vite.config.js).
 * - Arranca Vite (host true, puerto 5173).
 * - Cuando `http://localhost:5173/?iphone=true` responde HTTP 2xx, en macOS abre Safari con esa URL.
 *
 * Saltar apertura de Safari: `WAITME_SKIP_SAFARI_OPEN=1` o `CI=true`.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { ensurePort5173Free, VITE_DEV_PORT } from './vite-dev-5173.mjs'
import { waitmeLocalIphonePreviewUrl } from './waitme-local-iphone-preview.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')

const PREVIEW_URL = waitmeLocalIphonePreviewUrl(VITE_DEV_PORT)

const skipSafariOpen =
  process.env.WAITME_SKIP_SAFARI_OPEN === '1' || String(process.env.CI || '').toLowerCase() === 'true'

function openSafariDarwin(url) {
  if (skipSafariOpen || process.platform !== 'darwin') return
  const p = spawn('open', ['-a', 'Safari', url], { stdio: 'ignore', detached: true })
  p.unref()
}

/**
 * @param {string} url
 * @param {{ shouldStop?: () => boolean, maxMs?: number, stepMs?: number }} [opts]
 */
async function waitForHttpOk(url, opts = {}) {
  const maxMs = opts.maxMs ?? 120_000
  const stepMs = opts.stepMs ?? 250
  const shouldStop = opts.shouldStop ?? (() => false)
  const t0 = Date.now()
  while (Date.now() - t0 < maxMs) {
    if (shouldStop()) return false
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if (res.ok) return true
    } catch {
      /* ECONNREFUSED hasta que Vite escuche */
    }
    await new Promise((r) => setTimeout(r, stepMs))
  }
  return false
}

async function main() {
  if (!existsSync(viteBin)) {
    console.error('[waitme] No se encontró node_modules/vite. Ejecuta npm install en la raíz del repo.')
    process.exit(1)
  }

  await ensurePort5173Free()

  const child = spawn(process.execPath, [viteBin], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env },
  })

  let childExited = false
  const exitPromise = new Promise((resolve) => {
    child.once('exit', (code, signal) => {
      childExited = true
      if (signal) resolve(signal === 'SIGINT' ? 130 : 128)
      else resolve(code ?? 0)
    })
    child.once('error', () => {
      childExited = true
      resolve(1)
    })
  })

  const forward = (sig) => {
    try {
      if (child.pid) child.kill(sig)
    } catch {
      /* */
    }
  }
  process.on('SIGINT', () => forward('SIGINT'))
  process.on('SIGTERM', () => forward('SIGTERM'))

  const ok = await waitForHttpOk(PREVIEW_URL, {
    shouldStop: () => childExited,
    maxMs: 120_000,
    stepMs: 250,
  })

  if (!childExited) {
    if (ok) {
      console.log(`\n[waitme] LOCAL_DEV_MAC listo: ${PREVIEW_URL}\n`)
      openSafariDarwin(PREVIEW_URL)
    } else {
      console.error(`[waitme] El servidor no respondió OK a tiempo: ${PREVIEW_URL}`)
    }
  }

  const code = await exitPromise
  process.exit(typeof code === 'number' ? code : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
