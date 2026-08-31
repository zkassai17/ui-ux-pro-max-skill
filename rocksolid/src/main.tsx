import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Offline support. Registered after load so it never delays first paint, and
// only over https/localhost, where service workers are permitted at all.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(
      new URL('./sw.js', document.baseURI).href, { scope: './' },
    ).catch(() => { /* offline support is a bonus, never a blocker */ })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
