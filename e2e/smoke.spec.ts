import { test, expect } from '@playwright/test'

test('arranque: documento y #root', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/WaitMe/i)
  await expect(page.locator('#root')).toBeVisible()
})
