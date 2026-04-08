import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test'
import { loadEnv } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Misma carga que Vite: `.env`, `.env.local`, etc. (gitignored) para E2E y credenciales locales. */
const viteFileEnv = loadEnv('development', __dirname, '')
for (const [k, v] of Object.entries(viteFileEnv)) {
  if (!String(process.env[k] ?? '').trim()) process.env[k] = v
}

function readPlaywrightPackageVersion(): string {
  try {
    const p = join(__dirname, 'node_modules', '@playwright/test', 'package.json')
    return JSON.parse(readFileSync(p, 'utf8')).version
  } catch {
    return '1.51.0'
  }
}

/** Puerto dedicado E2E para no chocar con `npm run dev` en 5173. */
const E2E_PORT = 5174
const E2E_ORIGIN = `http://localhost:${E2E_PORT}`

const bsUser = String(process.env.BROWSERSTACK_USERNAME || '').trim()
const bsKey = String(process.env.BROWSERSTACK_ACCESS_KEY || '').trim()
const browserStackGridOn =
  process.env.WAITME_PLAYWRIGHT_BROWSERSTACK === '1' && Boolean(bsUser && bsKey)

const buildIdentifier =
  process.env.GITHUB_RUN_ID ||
  (process.env.GITHUB_SHA ? process.env.GITHUB_SHA.slice(0, 7) : '') ||
  'local'

const projects: NonNullable<PlaywrightTestConfig['projects']> = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
]

if (browserStackGridOn) {
  const caps: Record<string, string> = {
    'browserstack.username': bsUser,
    'browserstack.accessKey': bsKey,
    'browserstack.local': 'true',
    device: 'iPhone 14',
    os_version: '16',
    name: 'v5waitme-playwright',
    build: `waitme-${buildIdentifier}`,
    'client.playwrightVersion': readPlaywrightPackageVersion(),
  }
  projects.push({
    name: 'browserstack-iphone',
    use: {
      connectOptions: {
        wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify(caps))}`,
      },
    },
  })
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: E2E_ORIGIN,
    trace: 'on-first-retry',
  },
  projects,
  webServer: {
    // `npm run dev` es dev:ios (LAN + cap sync); E2E necesita solo Vite en puerto dedicado.
    command: `env VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite --port ${E2E_PORT} --strictPort`,
    url: E2E_ORIGIN,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
