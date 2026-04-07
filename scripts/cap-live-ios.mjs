#!/usr/bin/env node
/**
 * Live Reload (iPhone físico): `WAITME_CAP_DEV_SERVER_URL` + `npx cap sync ios`.
 * La detección LAN vive en `get-lan-ip.mjs`.
 *
 * Producción: `npm run cap:live:off` (sync sin esa variable).
 *
 * @see docs/DEV_IOS_LIVE_RELOAD.md
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { resolveWaitmeLanDevOrExit, upsertEnvLocalViteDevLanOrigin } from './get-lan-ip.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const { ip, url } = resolveWaitmeLanDevOrExit()

upsertEnvLocalViteDevLanOrigin(root, url)

process.env.WAITME_LAN_IP = ip
const env = { ...process.env, WAITME_CAP_DEV_SERVER_URL: url, WAITME_LAN_IP: ip }

console.info(`USING DEV SERVER: ${url}`)
console.info(`DEV SERVER URL → ${url}`)
console.info(`[waitme] Live URL → ${url} (cap sync ios)`)
console.info('  → Tras esto suele seguir Vite (`npm run dev:ios` o `npm run dev:vite`).')
console.info('  → iPhone: Xcode → Run una vez; luego HMR vía red Wi‑Fi.')
console.info('  → Solo web / sin iOS: npm run dev:vite')
console.info('  → Producción limpia: npm run cap:live:off\n')

const r = spawnSync('npx', ['cap', 'sync', 'ios'], {
  cwd: root,
  env,
  stdio: 'inherit',
})

process.exit(r.status === null ? 1 : r.status)
