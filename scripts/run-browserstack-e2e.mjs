/**
 * E2E en BrowserStack (iPhone + Safari vía grid) con túnel Local hacia el dev server de Playwright.
 * Requiere BROWSERSTACK_USERNAME y BROWSERSTACK_ACCESS_KEY (p. ej. secretos de GitHub).
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const browserstack = require('browserstack-local')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const key = String(process.env.BROWSERSTACK_ACCESS_KEY || '').trim()
const user = String(process.env.BROWSERSTACK_USERNAME || '').trim()

if (!user || !key) {
  console.error('[run-browserstack-e2e] Definen BROWSERSTACK_USERNAME y BROWSERSTACK_ACCESS_KEY.')
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
