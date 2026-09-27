import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA caching, offline mode, and installation prompt
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Nueva versión de NotAI disponible.');
  },
  onOfflineReady() {
    console.log('NotAI está listo para operar sin conexión.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
