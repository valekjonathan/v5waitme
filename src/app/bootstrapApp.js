/**
 * Efectos de arranque (antes en main.jsx): OAuth nativo, viewport, Sentry, log.
 * Se importa desde App.jsx para no tocar el entry mínimo.
 */
import * as Sentry from '@sentry/react'
import { logFlow } from '../lib/devFlowLog.js'
import { registerNativeOAuthDeepLink } from '../lib/nativeOAuthDeepLink'
import { syncWaitmeViewportCssVars } from '../lib/waitmeViewport.js'

registerNativeOAuthDeepLink()
syncWaitmeViewportCssVars()

if (import.meta.env.DEV) {
  const lan = String(import.meta.env.VITE_DEV_LAN_ORIGIN || '').trim()
  if (lan) {
    console.info(`RUNNING ON LAN: ${lan}`)
  }
}

const rawSentryDsn = import.meta.env.VITE_SENTRY_DSN
const sentryDsn = typeof rawSentryDsn === 'string' ? rawSentryDsn.trim() : ''
if (sentryDsn) {
  const rawRelease = import.meta.env.VITE_SENTRY_RELEASE
  const release =
    typeof rawRelease === 'string' && rawRelease.trim() ? rawRelease.trim() : undefined
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    ...(release ? { release } : {}),
  })
} else if (import.meta.env.DEV) {
  console.info(
    '[Sentry] Sin VITE_SENTRY_DSN (o vacío): el SDK no se inicializa; no se envían eventos.'
  )
}

logFlow('APP_START')
