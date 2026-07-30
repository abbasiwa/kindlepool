import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initSentry } from './lib/sentry'

initSentry()

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      console.log('SW registered:', reg.scope)
    } catch (e) {
      console.log('SW registration failed:', e)
    }
  })
}

// Request notification permission for push (must be user-gesture triggered later)
if ('Notification' in window && Notification.permission === 'default') {
  // Don't auto-request — will be triggered by user action in PushNotificationPrompt
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
