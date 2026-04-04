import { test, expect } from '@playwright/test'

test('shell login: main fullBleed cuando no hay sesión', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-waitme-screen-shell="fullBleed"]')).toBeVisible()
  await expect(page.locator('[data-waitme-main="fullBleed"]')).toBeVisible()
})

test('shell login: #root y main tienen área visible (no layout colapsado)', async ({ page }) => {
  await page.goto('/')
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
  await expect(page.locator('#root > *').first()).toBeVisible({ timeout: 15000 })
})
