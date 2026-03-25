import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/tracing'

const dsn = import.meta.env.VITE_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: import.meta.env.MODE,
  integrations: [new BrowserTracing()],
  tracesSampleRate: 1.0,
})

// Dev-only helper to verify Sentry wiring without changing UI or app logic.
if (import.meta.env.DEV) {
  window.__waitmeSentryTest = () => {
    const err = new Error('[waitme] Sentry dev test error')
    Sentry.captureException(err)
    return err
  }
}

