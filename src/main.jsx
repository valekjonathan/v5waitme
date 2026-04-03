import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './app/App.jsx'
import { logFlow } from './lib/devFlowLog.js'
import './styles/global.css'

const sentryDsn =
  typeof import.meta.env.VITE_SENTRY_DSN === 'string' ? import.meta.env.VITE_SENTRY_DSN.trim() : ''
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
  })
}

const root = createRoot(document.getElementById('root'))
logFlow('APP_START')

root.render(<App />)
