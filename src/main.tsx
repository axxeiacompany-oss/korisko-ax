import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSecurityShield } from './utils/security';

// Inicia proteção de segurança anti-F12 e silenciamento de console
initSecurityShield();

// Suprime erros de WebSocket desconectado em ambientes com HMR desativado / cold-starts
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message || String(event.reason || '');
  if (
    reason.includes('WebSocket') ||
    reason.includes('closed without opened') ||
    reason.includes('failed to fetch') ||
    reason.includes('NetworkError') ||
    reason.includes('aborted')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
