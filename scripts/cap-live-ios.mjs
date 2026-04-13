#!/usr/bin/env node
/**
 * Live Reload (iPhone físico): `npx cap sync ios` + inyección de `server.url` en
 * `ios/App/App/capacitor.config.json` (IP LAN desde `get-lan-ip.mjs`).
 *
 * Producción: `npm run cap:live:off` (sync sin server.url).
 *
 * @see docs/DEV_IOS_LIVE_RELOAD.md
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { resolveWaitmeLanDevOrExit, upsertEnvLocalViteDevLanOrigin } from './get-lan-ip.mjs'
import { injectIosCapacitorDevServerUrl } from './inject-ios-cap-dev-server.mjs'
import { stripIosEmbeddedWeb } from './strip-ios-embedded-web.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const { ip, url } = resolveWaitmeLanDevOrExit()

upsertEnvLocalViteDevLanOrigin(root, url)

process.env.WAITME_LAN_IP = ip
const env = { ...process.env, WAITME_CAP_DEV_SERVER_URL: url, WAITME_LAN_IP: ip }

console.info(`USING DEV SERVER: ${url}`)
console.info(`DEV SERVER URL → ${url}`)
console.info(`[waitme] Live URL → ${url} (cap sync ios)`)
console.info('')
console.info('=== Paridad Safari ↔ app iOS (desarrollo) ===')
console.info(`Mismo origen y misma sesión (localStorage / Supabase) que esta URL:`)
console.info(`  ${url}`)
console.info('Abre Safari en el iPhone en esa URL para comparar 1:1 con la app.')
console.info('Safari en Mac con http://localhost:5173 es otro origen; la sesión no coincide con la IP LAN.')
console.info('')
console.info('  → Tras esto suele seguir Vite (`npm run dev:ios` o `npm run dev`).')
console.info('  → iPhone: Xcode → Run una vez; luego HMR vía red Wi‑Fi.')
console.info('  → Solo web / sin iOS: npm run dev')
console.info('  → Producción limpia: npm run cap:live:off\n')

const r = spawnSync('npx', ['cap', 'sync', 'ios'], {
  cwd: root,
  env,
  stdio: 'inherit',
})

if (r.status === 0) {
  injectIosCapacitorDevServerUrl(root, url)
  if (String(process.env.SKIP_RM_IOS_PUBLIC || '').trim() !== '1') {
    stripIosEmbeddedWeb(root)
  }
}

process.exit(r.status === null ? 1 : r.status)
