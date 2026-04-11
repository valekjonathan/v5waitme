/**
 * Efectos de arranque (antes en main.jsx): OAuth nativo, viewport, Sentry, log.
 * Se importa desde App.jsx para no tocar el entry mínimo.
 */
import * as Sentry from '@sentry/react'
import { logFlow } from '../lib/devFlowLog.js'
import { registerNativeOAuthDeepLink } from '../lib/nativeOAuthDeepLink'
import { subscribeWaitmeViewportCssVars } from '../lib/waitmeViewport.js'

/**
 * Orden y try/catch: el viewport debe registrarse siempre; fallos en Sentry/OAuth nativo
 * no deben impedir el montaje de React (Safari / plugins Capacitor en web).
 */
try {
  /** WKWebView (Capacitor iOS): el primer frame a veces no tiene `visualViewport.height`; la suscripción actualiza `--app-height` cuando el viewport estabiliza. */
  subscribeWaitmeViewportCssVars()
} catch (e) {
  console.error('[WaitMe][bootstrap] subscribeWaitmeViewportCssVars', e)
}

try {
  registerNativeOAuthDeepLink()
} catch (e) {
  console.error('[WaitMe][bootstrap] registerNativeOAuthDeepLink', e)
}

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
  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      sendDefaultPii: false,
      ...(release ? { release } : {}),
    })
  } catch (e) {
    console.error('[WaitMe][bootstrap] Sentry.init', e)
  }
} else if (import.meta.env.DEV) {
  console.info(
    '[Sentry] Sin VITE_SENTRY_DSN (o vacío): el SDK no se inicializa; no se envían eventos.'
  )
}

logFlow('APP_START')
