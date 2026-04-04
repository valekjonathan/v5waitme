import { test, expect } from '@playwright/test'

test('shell: header y bottom nav presentes', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-waitme-header]')).toBeVisible()
  await expect(page.locator('[data-waitme-nav]')).toBeVisible()
})
