/**
 * E2E en BrowserStack (iPhone real) vía BrowserStack Node SDK + `browserstack.yml`.
 * Requiere BROWSERSTACK_USERNAME y BROWSERSTACK_ACCESS_KEY (env o .env.local).
 *
 * No usa CDP manual (wss://cdp.browserstack.com/playwright?caps=...).
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
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
  { cwd: root, stdio: 'inherit', env: { ...process.env } }
)

process.exit(r.status === null ? 1 : r.status)
