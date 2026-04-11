import { expect, test } from './fixtures'

test('arranque: documento y #root', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/WaitMe/i)
  await expect(page.locator('body')).toBeVisible()
  await expect(page.locator('#root')).toBeVisible()
  expect(await page.locator('#root > *').count()).toBeGreaterThan(0)
  await expect(page.locator('[data-waitme-screen-shell]')).toBeVisible()
  await expect(page.locator('[data-home-google-button]')).toBeVisible({ timeout: 20_000 })
})

test('arranque: boot auth o login visible (sin #root colgado)', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-home-google-button]')).toBeVisible({ timeout: 20_000 })
})

test('parking search: MAPBOX/RESULTS UI, lista DOM y cadena sin clip (dev auth)', async ({
  page,
}) => {
  const mapboxToken = String(process.env.VITE_MAPBOX_ACCESS_TOKEN ?? '').trim()
  test.skip(
    !mapboxToken,
    'Sin VITE_MAPBOX_ACCESS_TOKEN no hay búsqueda Mapbox en runtime; en CI usar secret omite este caso.'
  )

  /** Prueba runtime: peticiones reales a Mapbox (console con objetos no siempre llega a `msg.text()`). */
  const mapboxSuggestUrls: string[] = []

  page.on('request', (req) => {
    const u = req.url()
    if (u.includes('api.mapbox.com/search/searchbox/v1/suggest')) {
      mapboxSuggestUrls.push(u)
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
  await expect(page.locator('[data-waitme-screen-shell]')).toBeVisible({ timeout: 20_000 })
  const searchCta = page.locator('[data-waitme-home-search-parking]')
  await searchCta.evaluate((el) => (el as HTMLButtonElement).click())
  const input = page.locator('[data-waitme-street-search-input]')
  await expect(input).toBeVisible()

  for (const q of ['muer', 'muerd', 'muerdago']) {
    const nBefore = mapboxSuggestUrls.length
    await input.fill('')
    await input.fill(q)
    await expect.poll(async () => input.inputValue(), { timeout: 5000 }).toBe(q)
    await expect.poll(() => mapboxSuggestUrls.length, { timeout: 12_000 }).toBeGreaterThan(nBefore)
    const lastUrl = mapboxSuggestUrls[mapboxSuggestUrls.length - 1]
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

  expect(mapboxSuggestUrls.length).toBeGreaterThanOrEqual(3)
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
  await expect(page.locator('[data-waitme-screen-shell]')).toBeVisible({ timeout: 20_000 })
  await page
    .locator('[data-waitme-home-park-here]')
    .evaluate((el) => (el as HTMLButtonElement).click())
  await expect(page.locator('[data-waitme-street-search-input]')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('[data-waitme-main="fullBleed"]')).toBeVisible()
})
