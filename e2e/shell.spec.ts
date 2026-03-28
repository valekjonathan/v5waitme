import { test, expect } from '@playwright/test'

test('shell login: main fullBleed cuando no hay sesión', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-waitme-screen-shell="fullBleed"]')).toBeVisible()
  await expect(page.locator('[data-waitme-main="fullBleed"]')).toBeVisible()
})
