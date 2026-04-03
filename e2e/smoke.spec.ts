import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect } from '@playwright/test'

function supabaseConfiguredInDotenvLocal(): boolean {
  try {
    const p = join(process.cwd(), '.env.local')
    if (!existsSync(p)) return false
    const s = readFileSync(p, 'utf8')
    const url =
      s
        .match(/^\s*VITE_SUPABASE_URL=(.+)$/m)?.[1]
        ?.trim()
        .replace(/^["']|["']$/g, '') ?? ''
    const key =
      s
        .match(/^\s*VITE_SUPABASE_ANON_KEY=(.+)$/m)?.[1]
        ?.trim()
        .replace(/^["']|["']$/g, '') ?? ''
    return Boolean(url && key && url !== 'REEMPLAZAR' && key !== 'REEMPLAZAR')
  } catch {
    return false
  }
}

test('arranque: documento y #root', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/WaitMe/i)
  await expect(page.locator('#root')).toBeVisible()
})

test('parking search: dropdown lista presente y visible (dev auth, sin Supabase)', async ({
  page,
}) => {
  test.skip(
    supabaseConfiguredInDotenvLocal(),
    'Con VITE_SUPABASE_* en .env.local el flujo usa OAuth; este test usa waitme.dev.*'
  )

  await page.addInitScript(() => {
    window.localStorage.setItem('waitme.dev.authenticated', '1')
    window.localStorage.setItem(
      'waitme.dev.profileDraft',
      JSON.stringify({
        full_name: 'E2E User',
        phone: '600000000',
        brand: 'Toyota',
        model: 'Yaris',
        plate: '1234ABC',
        allow_phone_calls: false,
        color: 'negro',
        vehicle_type: 'car',
        email: 'e2e@test.com',
        avatar_url: '',
      })
    )
  })

  await page.goto('/')
  await page.getByRole('button', { name: /Dónde quieres aparcar/i }).click()
  const input = page.getByPlaceholder(/Dónde quieres aparcar/i)
  await expect(input).toBeVisible()
  await input.fill('muer')
  await expect.poll(async () => input.inputValue(), { timeout: 5000 }).toBe('muer')
  const list = page.locator('[data-waitme-parking-search-morado]').locator('..').locator('ul')
  await expect(list).toBeVisible({ timeout: 8000 })
  const box = await list.boundingBox()
  expect(box && box.width > 0 && box.height > 0).toBeTruthy()
})
