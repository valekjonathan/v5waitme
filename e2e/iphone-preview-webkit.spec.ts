/**
 * Prueba runtime real automatizada (WebKit ≈ Safari; mismo origen que smoke E2E :5174).
 * No sustituye Safari.app ni dispositivo físico; sí detecta errores JS y shell único en el viewport dev web.
 */
import { expect, test } from '@playwright/test'

test.describe('viewport dev tipo iPhone', () => {
  test('WebKit: carga sin pageerror; shell y CTA visibles; hit-test centro', async ({ page }) => {
    const pageErrors: string[] = []
    const consoleErrors: string[] = []
    page.on('pageerror', (e) => pageErrors.push(String(e)))
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#root')).toBeVisible()
    await expect(page.locator('[data-waitme-screen-shell]')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('[data-home-google-button]')).toBeVisible({ timeout: 25_000 })
    await expect(page.locator('[data-waitme-screen-shell]')).toHaveCount(1)
    await expect(page.locator('header[data-waitme-header]')).toHaveCount(1)
    await expect(page.locator('nav[data-waitme-nav]')).toHaveCount(1)

    const hitCenter = await page.evaluate(() => {
      const x = Math.floor(window.innerWidth / 2)
      const y = Math.floor(window.innerHeight / 2)
      const el = document.elementFromPoint(x, y)
      if (!el) return null
      return {
        tag: el.nodeName,
        id: el.id || null,
        className: typeof el.className === 'string' ? el.className.slice(0, 120) : null,
      }
    })
    expect(hitCenter, 'elementFromPoint centro').not.toBeNull()

    const ctaHit = await page.locator('[data-home-google-button]').evaluate((btn) => {
      const r = btn.getBoundingClientRect()
      const x = Math.floor(r.left + r.width / 2)
      const y = Math.floor(r.top + r.height / 2)
      const top = document.elementFromPoint(x, y)
      return {
        x,
        y,
        tag: top?.nodeName ?? null,
        coversButton: top === btn || (top != null && btn.contains(top)),
      }
    })
    expect(ctaHit?.coversButton, `CTA debe recibir hit-test: ${JSON.stringify(ctaHit)}`).toBeTruthy()

    expect(pageErrors, `pageerror: ${pageErrors.join(' | ')}`).toEqual([])
    expect(consoleErrors, `console error: ${consoleErrors.join(' | ')}`).toEqual([])
  })
})
