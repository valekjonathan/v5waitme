// import './lib/sentry.js'
import { PostHogProvider } from '@posthog/react'
import { createRoot } from 'react-dom/client'
import App from './app/App.jsx'
import { posthogHost, posthogKey } from './lib/analytics'
import './styles/global.css'

window.onerror = function (msg, url, line, col, error) {
  console.error('WINDOW ERROR:', msg, url, line, col, error)
}

window.onunhandledrejection = function (event) {
  console.error('UNHANDLED PROMISE:', event.reason)
}

const root = createRoot(document.getElementById('root'))

root.render(
  posthogKey ? (
    <PostHogProvider
      apiKey={posthogKey}
      options={{
        api_host: posthogHost,
        autocapture: true,
        capture_pageview: true,
      }}
    >
      <App />
    </PostHogProvider>
  ) : (
    <App />
  ),
)
