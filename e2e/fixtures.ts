/**
 * BrowserStack iPhone (Safari real): un solo BrowserContext y una sola pestaña por sesión.
 * - Sin esto, Playwright abre contexto por test → "Only one browser context is allowed".
 * - Con contexto único pero `newPage` por test → "Only one browser tab is allowed".
 * Con WAITME_E2E_SINGLE_BROWSER_CONTEXT=1 se reutilizan contexto y página del worker
 * (solo `run-browserstack-e2e.mjs`); cada test sigue haciendo `goto` como siempre.
 */
import { expect, test as base } from '@playwright/test'
import type { Browser, BrowserContext, Page } from '@playwright/test'

const singleBrowserContext =
  String(process.env.WAITME_E2E_SINGLE_BROWSER_CONTEXT ?? '').trim() === '1'

type WaitmeWorkerFixtures = {
  _waitmeWorkerContext: BrowserContext
  _waitmeWorkerPage: Page
}

export const test = singleBrowserContext
  ? base.extend<object, WaitmeWorkerFixtures>({
      _waitmeWorkerContext: [
        async ({ browser }: { browser: Browser }, use: (r: BrowserContext) => Promise<void>) => {
          const context = await browser.newContext()
          await use(context)
          try {
            await context.close()
          } catch {
            /* BrowserStack puede cerrar page/context antes del teardown del worker */
          }
        },
        { scope: 'worker' },
      ],
      _waitmeWorkerPage: [
        async (
          { _waitmeWorkerContext }: { _waitmeWorkerContext: BrowserContext },
          use: (r: Page) => Promise<void>
        ) => {
          const page = await _waitmeWorkerContext.newPage()
          await use(page)
          await page.close()
        },
        { scope: 'worker' },
      ],
      context: async (
        { _waitmeWorkerContext }: { _waitmeWorkerContext: BrowserContext },
        use: (r: BrowserContext) => Promise<void>
      ) => {
        await use(_waitmeWorkerContext)
      },
      page: async (
        { _waitmeWorkerPage }: { _waitmeWorkerPage: Page },
        use: (r: Page) => Promise<void>
      ) => {
        await use(_waitmeWorkerPage)
      },
    })
  : base

export { expect }
