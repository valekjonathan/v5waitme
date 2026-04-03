import { defineConfig, devices } from '@playwright/test'

/** Puerto dedicado E2E para no chocar con `npm run dev` en 5173. */
const E2E_PORT = 5174
const E2E_ORIGIN = `http://localhost:${E2E_PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: E2E_ORIGIN,
    trace: 'on-first-retry',
  },
  webServer: {
    // Sin Supabase en el proceso del dev server: `waitme.dev.*` + perfil draft activan mapa parking en e2e.
    command: `env VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run dev -- --port ${E2E_PORT} --strictPort`,
    url: E2E_ORIGIN,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
