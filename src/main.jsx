// import './lib/sentry.js'
import { PostHogProvider } from '@posthog/react'
import { createRoot } from 'react-dom/client'
import App from './app/App.jsx'
import { posthogHost, posthogKey } from './lib/analytics'
import './styles/global.css'

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
