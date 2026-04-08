import { expect, test } from './fixtures'

test('sentry: envía un error real (requiere VITE_SENTRY_DSN)', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name.includes('browserstack-mobile'),
    'Safari iOS real (BrowserStack): no se observa el POST al envelope de ingest en waitForRequest (plazo 75s); la app sí dispara el error (véase consola). Validar envío en desktop con npm run test:sentry.'
  )

  test.setTimeout(90_000)

  const dsn = String(process.env.VITE_SENTRY_DSN || '').trim()
  expect(dsn, 'Bloqueado: falta VITE_SENTRY_DSN para validar envío real a Sentry.').toBeTruthy()

  // Confirmamos que el SDK intenta enviar un envelope real (móvil/red lenta: espera larga).
  const envelope = page.waitForRequest(
    (req) => {
      if (req.method() !== 'POST') return false
      const url = req.url()
      // Cualquier host; ruta tipo .../api/<id>/envelope... con query opcional
      return /\/api\/[^/]+\/envelope/i.test(url)
    },
    { timeout: 75_000 }
  )

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

