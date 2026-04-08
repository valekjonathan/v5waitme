import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test'
import { loadEnv } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Misma carga que Vite: `.env`, `.env.local`, etc. (gitignored) para E2E y credenciales locales. */
const viteFileEnv = loadEnv('development', __dirname, '')
for (const [k, v] of Object.entries(viteFileEnv)) {
  if (!String(process.env[k] ?? '').trim()) process.env[k] = v
}

/** Puerto dedicado E2E para no chocar con `npm run dev` en 5173. */
const E2E_PORT = 5174
const E2E_ORIGIN = `http://localhost:${E2E_PORT}`

const projects: NonNullable<PlaywrightTestConfig['projects']> = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
]

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
    command: `env VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite --port ${E2E_PORT} --strictPort`,
    url: E2E_ORIGIN,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
