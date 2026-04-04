import { test, expect } from '@playwright/test'

test('shell: header, nav y #root visibles (login)', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#root')).toBeVisible()
  await expect(page.locator('[data-waitme-header]')).toBeVisible()
  await expect(page.locator('[data-waitme-nav]')).toBeVisible()
})
