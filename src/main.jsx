import { PostHogProvider } from '@posthog/react'
import { createRoot } from 'react-dom/client'
import App from './app/App.jsx'
import { posthogHost, posthogKey } from './lib/analytics'
import { captureClientError } from './lib/captureClientError.js'
import { normalizeToError } from './lib/normalizeErrorReason.js'
import './styles/global.css'

window.onerror = function (msg, url, line, col, error) {
  console.error('[WaitMe][window.onerror]', msg, { url, line, col, error })
  if (error?.stack) console.error('[WaitMe][window.onerror] stack:', error.stack)
  const err = error instanceof Error ? error : normalizeToError(msg, 'window.onerror')
  captureClientError({
    error: err,
    source: 'window.onerror',
    extra: { url: url ?? '', line: line ?? 0, col: col ?? 0 },
  })
}

window.onunhandledrejection = function (event) {
  const r = event.reason
  console.error('[WaitMe][unhandledrejection]', r)
  if (r && typeof r === 'object' && 'stack' in r && r.stack) {
    console.error('[WaitMe][unhandledrejection] stack:', r.stack)
  }
  const err = normalizeToError(r, 'unhandledrejection')
  captureClientError({ error: err, source: 'unhandledrejection' })
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
  )
)
