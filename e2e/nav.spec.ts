import { expect, test } from './fixtures'

test('shell: header, nav y #root visibles (login)', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
  expect(await page.locator('#root > *').count()).toBeGreaterThan(0)
  await expect(page.locator('[data-waitme-screen-shell]')).toBeVisible()
  await expect(page.locator('[data-home-google-button]')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('#root')).toBeVisible()
  await expect(page.locator('[data-waitme-header]')).toBeVisible()
  await expect(page.locator('[data-waitme-nav]')).toBeVisible()
})
