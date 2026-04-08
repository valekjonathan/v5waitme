/**
 * BrowserStack iPhone (Safari real) solo permite un BrowserContext por instancia.
 * Playwright crea un contexto nuevo por test por defecto → falla el segundo test del worker.
 * Con WAITME_E2E_SINGLE_BROWSER_CONTEXT=1 se reutiliza un contexto por worker y solo se
 * abre/cierra páginas por test (vía `run-browserstack-e2e.mjs`).
 */
import { expect, test as base } from '@playwright/test'
import type { Browser, BrowserContext, Page } from '@playwright/test'

const singleBrowserContext =
  String(process.env.WAITME_E2E_SINGLE_BROWSER_CONTEXT ?? '').trim() === '1'

type WaitmeWorkerFixtures = {
  _waitmeWorkerContext: BrowserContext
}

export const test = singleBrowserContext
  ? base.extend<object, WaitmeWorkerFixtures>({
      _waitmeWorkerContext: [
        async ({ browser }: { browser: Browser }, use: (r: BrowserContext) => Promise<void>) => {
          const context = await browser.newContext()
          await use(context)
          await context.close()
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
        { _waitmeWorkerContext }: { _waitmeWorkerContext: BrowserContext },
        use: (r: Page) => Promise<void>
      ) => {
        const page = await _waitmeWorkerContext.newPage()
        await use(page)
        await page.close()
      },
    })
  : base

export { expect }
