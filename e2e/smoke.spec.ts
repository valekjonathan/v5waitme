import { test, expect } from '@playwright/test'

test('arranque: documento y #root', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/WaitMe/i)
  await expect(page.locator('body')).toBeVisible()
  await expect(page.locator('#root')).toBeVisible()
  expect(await page.locator('#root > *').count()).toBeGreaterThan(0)
  await expect(page.locator('[data-waitme-screen-shell]')).toBeVisible()
  await expect(
    page.getByText('Continuar con Google').or(page.locator('[data-waitme-auth-boot]'))
  ).toBeVisible({ timeout: 20_000 })
})

test('arranque: boot auth o login visible (sin #root colgado)', async ({ page }) => {
  await page.goto('/')
  const boot = page.locator('[data-waitme-auth-boot]')
  const google = page.getByRole('button', { name: /Continuar con Google/i })
  await expect(boot.or(google)).toBeVisible({ timeout: 20_000 })
})

test('parking search: MAPBOX/RESULTS UI, lista DOM y cadena sin clip (dev auth)', async ({
  page,
}) => {
  /** Prueba runtime: peticiones reales a Mapbox (console con objetos no siempre llega a `msg.text()`). */
  const mapboxForwardUrls: string[] = []

  page.on('request', (req) => {
    const u = req.url()
    if (u.includes('api.mapbox.com/geocoding/v5/mapbox.places') && u.includes('.json')) {
      mapboxForwardUrls.push(u)
    }
  })

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

  for (const q of ['muer', 'muerd', 'muerdago']) {
    const nBefore = mapboxForwardUrls.length
    await input.fill('')
    await input.fill(q)
    await expect.poll(async () => input.inputValue(), { timeout: 5000 }).toBe(q)
    await expect.poll(() => mapboxForwardUrls.length, { timeout: 12_000 }).toBeGreaterThan(nBefore)
    const lastUrl = mapboxForwardUrls[mapboxForwardUrls.length - 1]
    expect(lastUrl).toContain(encodeURIComponent(q))

    const list = page.locator('[data-waitme-street-results]')
    await expect(list).toBeVisible({ timeout: 12_000 })
    await expect(list.locator('li')).not.toHaveCount(0)
    const box = await list.boundingBox()
    expect(box && box.width > 0 && box.height > 0).toBeTruthy()

    const hitOk = await list.evaluate((el) => {
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) return { ok: false, reason: 'small-box' }
      const x = r.left + Math.min(r.width / 2, 80)
      const y = r.top + Math.min(r.height / 2, 40)
      const top = document.elementFromPoint(x, y)
      const coveredByList = top != null && (el === top || el.contains(top))
      const self = window.getComputedStyle(el)
      return {
        ok: coveredByList && self.visibility !== 'hidden' && Number(self.opacity) > 0.05,
        display: self.display,
        visibility: self.visibility,
        opacity: self.opacity,
        zIndex: self.zIndex,
        hitTag: top?.nodeName ?? null,
      }
    })
    expect(hitOk.ok, JSON.stringify(hitOk)).toBeTruthy()
  }

  expect(mapboxForwardUrls.length).toBeGreaterThanOrEqual(3)
})

test('park here: placeholder modo aparcado y shell fullBleed (dev auth)', async ({ page }) => {
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
  await page.getByRole('button', { name: /Estoy aparcado aquí/i }).click()
  await expect(page.getByPlaceholder(/Donde estas aparcado/i)).toBeVisible({ timeout: 20000 })
  await expect(page.locator('[data-waitme-main="fullBleed"]')).toBeVisible()
})
