#!/usr/bin/env node
/**
 * Tras `npx cap sync ios`, el `capacitor.config.json` nativo refleja solo `webDir` (sin `server`
 * en la fuente `capacitor.config.ts`). Para Live Reload LAN, este script escribe `server.url`
 * + `cleartext` en `ios/App/App/capacitor.config.json`.
 *
 * @see scripts/cap-live-ios.mjs
 * @see scripts/dev-ios.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

/**
 * @param {string} rootDir
 * @param {string} url  Origen Vite LAN, p. ej. http://192.168.1.10:5173
 */
export function injectIosCapacitorDevServerUrl(rootDir, url) {
  const trimmed = String(url ?? '')
    .trim()
    .replace(/\/$/, '')
  if (!trimmed) {
    throw new Error('[waitme] injectIosCapacitorDevServerUrl: url vacía')
  }
  const p = path.join(rootDir, 'ios', 'App', 'App', 'capacitor.config.json')
  if (!fs.existsSync(p)) {
    throw new Error(`[waitme] Falta ${p} (ejecuta npx cap sync ios primero).`)
  }
  const j = JSON.parse(fs.readFileSync(p, 'utf8'))
  j.server = { url: trimmed, cleartext: true }
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n')
  console.info(`[waitme] Inyectado server.url en ios/App/App/capacitor.config.json → ${trimmed}\n`)
}
