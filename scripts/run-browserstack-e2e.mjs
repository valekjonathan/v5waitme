/**
 * E2E en BrowserStack (iPhone + Safari vía grid) con túnel Local hacia el dev server de Playwright.
 * Requiere BROWSERSTACK_USERNAME y BROWSERSTACK_ACCESS_KEY (p. ej. secretos de GitHub).
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

const require = createRequire(import.meta.url)
const browserstack = require('browserstack-local')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const viteFileEnv = loadEnv('development', root, '')
for (const [k, v] of Object.entries(viteFileEnv)) {
  if (!String(process.env[k] ?? '').trim()) process.env[k] = v
}
const key = String(process.env.BROWSERSTACK_ACCESS_KEY || '').trim()
const user = String(process.env.BROWSERSTACK_USERNAME || '').trim()

if (!user || !key) {
  if (!user) console.error('[run-browserstack-e2e] Falta BROWSERSTACK_USERNAME (env o .env.local).')
  if (!key) console.error('[run-browserstack-e2e] Falta BROWSERSTACK_ACCESS_KEY (env o .env.local).')
  process.exit(1)
}

const bs = new browserstack.Local()
await new Promise((resolve, reject) => {
  bs.start({ key }, (err) => (err ? reject(err) : resolve()))
})

const env = {
  ...process.env,
  WAITME_PLAYWRIGHT_BROWSERSTACK: '1',
}

let exitCode = 1
try {
  const r = spawnSync(
    'npx',
    [
      'playwright',
      'test',
      '--project=browserstack-iphone',
      '--grep-invert',
      'parking search|park here',
    ],
    { cwd: root, stdio: 'inherit', env }
  )
  exitCode = r.status ?? 1
} finally {
  await new Promise((resolve) => {
    bs.stop(() => resolve())
  })
}
process.exit(exitCode)
