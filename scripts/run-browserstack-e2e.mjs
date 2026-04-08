/**
 * E2E en BrowserStack (iPhone real) vía BrowserStack Node SDK + `browserstack.yml`.
 * Requiere BROWSERSTACK_USERNAME y BROWSERSTACK_ACCESS_KEY (env o .env.local).
 *
 * No usa CDP manual (wss://cdp.browserstack.com/playwright?caps=...).
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
try {
  mkdirSync(join(root, 'log', '.obs_test_details-default'), { recursive: true })
} catch {
  /* ignore */
}
const viteFileEnv = loadEnv('development', root, '')
for (const [k, v] of Object.entries(viteFileEnv)) {
  if (!String(process.env[k] ?? '').trim()) process.env[k] = v
}

const user = String(process.env.BROWSERSTACK_USERNAME || '').trim()
const key = String(process.env.BROWSERSTACK_ACCESS_KEY || '').trim()

if (!user || !key) {
  if (!user) console.error('[run-browserstack-e2e] Falta BROWSERSTACK_USERNAME (env o .env.local).')
  if (!key) console.error('[run-browserstack-e2e] Falta BROWSERSTACK_ACCESS_KEY (env o .env.local).')
  process.exit(1)
}

/** Prueba acceso vía IP LAN (192.168.x / 10.x) en lugar de localhost para BrowserStack Local. */
const r = spawnSync(
  'npx',
  [
    'browserstack-node-sdk',
    'playwright',
    'test',
    '--config=playwright.config.ts',
    '--grep-invert',
    'parking search|park here',
  ],
  {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      WAITME_E2E_LAN_BASE: '1',
      WAITME_E2E_SINGLE_BROWSER_CONTEXT: '1',
    },
  }
)

process.exit(r.status === null ? 1 : r.status)
