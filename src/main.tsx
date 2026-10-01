import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSecurityShield } from './utils/security';

// Inicia proteção de segurança anti-F12 e silenciamento de console
initSecurityShield();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
