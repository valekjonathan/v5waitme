import percySnapshot from '@percy/playwright'
import { test, expect } from '@playwright/test'

test('percy: baseline login shell (sin Percy = no-op)', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-waitme-screen-shell]')).toBeVisible({ timeout: 20_000 })
  await percySnapshot(page, 'WaitMe login shell')
})
