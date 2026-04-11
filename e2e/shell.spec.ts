import { expect, test } from './fixtures'

test('shell login: main fullBleed cuando no hay sesión', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
  const bodyKids = await page.evaluate(() => document.body.childElementCount)
  expect(bodyKids).toBeGreaterThan(0)
  expect(await page.locator('#root > *').count()).toBeGreaterThan(0)
  await expect(page.locator('[data-waitme-screen-shell]')).toBeVisible()
  await expect(page.locator('[data-home-google-button]')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('[data-waitme-screen-shell="fullBleed"]')).toBeVisible()
  await expect(page.locator('[data-waitme-main="fullBleed"]')).toBeVisible()
})

test('shell login: #root y main tienen área visible (no layout colapsado)', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
  expect(await page.locator('#root > *').count()).toBeGreaterThan(0)
  const root = page.locator('#root')
  await expect(root).toBeVisible()
  const rootBox = await root.boundingBox()
  expect(rootBox && rootBox.height).toBeGreaterThan(80)

  const main = page.locator('[data-waitme-main="fullBleed"]')
  const mainBox = await main.boundingBox()
  expect(mainBox && mainBox.height).toBeGreaterThan(48)
})

test('shell login: #root monta React (no árbol vacío / pantalla en blanco)', async ({ page }) => {
  await page.goto('/')
  const bodyKids = await page.evaluate(() => document.body.childElementCount)
  expect(bodyKids).toBeGreaterThan(0)
  await expect(page.locator('#root > *').first()).toBeVisible({ timeout: 15000 })
  const rootHasKids = await page.evaluate(
    () => document.querySelector('#root')?.childElementCount ?? 0
  )
  expect(rootHasKids).toBeGreaterThan(0)
})
