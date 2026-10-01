import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSecurityShield } from './utils/security';

// Inicia proteção de segurança anti-F12 e silenciamento de console
initSecurityShield();

// Suprime erros de WebSocket desconectado em ambientes com HMR desativado / cold-starts
window.addEventListener(
  'unhandledrejection',
  (event) => {
    const reason = String(event.reason?.message || event.reason?.stack || event.reason || '').toLowerCase();
    if (
      reason.includes('websocket') ||
      reason.includes('closed without opened') ||
      reason.includes('failed to fetch') ||
      reason.includes('networkerror') ||
      reason.includes('aborted') ||
      reason.includes('realtime')
    ) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      return false;
    }
  },
  { capture: false, passive: true }
);

window.addEventListener(
  'error',
  (event) => {
    const msg = String(event.message || event.error?.message || event.error?.stack || '').toLowerCase();
    if (
      msg.includes('websocket') ||
      msg.includes('closed without opened') ||
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('aborted')
    ) {
      event.preventDefault();
      return false;
    }
  },
  { capture: false, passive: true }
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
