import { Capacitor } from '@capacitor/core'
import { createRoot } from 'react-dom/client'
import App from './app/App.jsx'
import { logFlow } from './lib/devFlowLog.js'
import './styles/global.css'

if (typeof document !== 'undefined' && Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('waitme-native-app')
}

const root = createRoot(document.getElementById('root'))
logFlow('APP_START')

root.render(<App />)
