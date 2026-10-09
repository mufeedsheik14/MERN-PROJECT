import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Prevent external SDKs (like Razorpay checkout.js) from triggering native browser alert() dialogs
if (typeof window !== 'undefined') {
  const nativeAlert = window.alert;
  window.alert = function (message) {
    if (
      typeof message === 'string' &&
      (message.toLowerCase().includes('something went wrong') ||
       message.toLowerCase().includes('oops') ||
       message.toLowerCase().includes('payment failed'))
    ) {
      console.warn('[Suppressed External Alert Dialog]:', message);
      return;
    }
    return nativeAlert.apply(this, arguments);
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

