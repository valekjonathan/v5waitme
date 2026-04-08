import { test, expect } from '@playwright/test'

test('sentry: envía un error real (requiere VITE_SENTRY_DSN)', async ({ page }) => {
  const dsn = String(process.env.VITE_SENTRY_DSN || '').trim()
  expect(dsn, 'Bloqueado: falta VITE_SENTRY_DSN para validar envío real a Sentry.').toBeTruthy()

  // Confirmamos que el SDK intenta enviar un envelope real.
  const envelope = page.waitForRequest((req) => {
    const url = req.url()
    if (!/\/api\/\d+\/envelope\/?$/.test(url)) return false
    const m = /^https?:\/\/([^/]+)/.exec(url)
    // sentry.io o self-hosted: no asumimos el dominio, solo la ruta de envelope
    return Boolean(m)
  })

  await page.goto('/')
  await expect(page.locator('[data-waitme-screen-shell]')).toBeVisible({ timeout: 20_000 })

  // Provoca un error no capturado en el navegador (Sentry lo recoge vía handlers globales).
  await page.evaluate(() => {
    setTimeout(() => {
      // @ts-expect-error - intencional para provocar un error real
      window.__WAITME_SENTRY_SMOKE__.boom()
    }, 0)
  })

  const req = await envelope
  expect(req.method()).toBe('POST')
})

