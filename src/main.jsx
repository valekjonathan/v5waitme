import { createRoot } from 'react-dom/client'
import App from './app/App.jsx'
import { logFlow } from './lib/devFlowLog.js'
import './styles/global.css'

const root = createRoot(document.getElementById('root'))
logFlow('APP_START')

root.render(<App />)
