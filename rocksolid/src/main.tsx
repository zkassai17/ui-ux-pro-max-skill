import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { requestDurableStorage } from './lib/storage'

// Offline support. Registered after load so it never delays first paint, and
// only over https/localhost, where service workers are permitted at all.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(
      new URL('./sw.js', document.baseURI).href, { scope: './' },
    ).catch(() => { /* offline support is a bonus, never a blocker */ })
  })
}

// Ask the browser not to treat months of photo evidence as disposable.
void requestDurableStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
