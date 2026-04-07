import React from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './app/App.jsx'
import { logFlow } from './lib/devFlowLog.js'
import { registerNativeOAuthDeepLink } from './lib/nativeOAuthDeepLink'
import IphoneFrame from './ui/IphoneFrame.jsx'
import { syncWaitmeViewportCssVars } from './lib/waitmeViewport.js'
import './styles/global.css'

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
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
  })
} else if (import.meta.env.DEV) {
  console.info(
    '[Sentry] Sin VITE_SENTRY_DSN (o vacío): el SDK no se inicializa; no se envían eventos.'
  )
}

const root = createRoot(document.getElementById('root'))
logFlow('APP_START')

root.render(
  <React.StrictMode>
    <IphoneFrame>
      <App />
    </IphoneFrame>
  </React.StrictMode>
)
