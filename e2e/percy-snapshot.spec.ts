import percySnapshot from '@percy/playwright'
import { expect, test } from './fixtures'

test('percy: baseline login shell (sin Percy = no-op)', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-waitme-screen-shell]')).toBeVisible({ timeout: 20_000 })
  await percySnapshot(page, 'WaitMe login shell')
})
