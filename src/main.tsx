// Ensure window.fetch has a setter if running in an environment where it only has a getter
(function ensureFetchSetter() {
  try {
    if (typeof window !== 'undefined' && window.fetch) {
      let currentFetch = window.fetch.bind(window);
      const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
      if (!desc || !desc.set || !desc.writable) {
        Object.defineProperty(window, 'fetch', {
          get() {
            return currentFetch;
          },
          set(fn) {
            currentFetch = fn;
          },
          configurable: true,
          enumerable: true,
        });
      }
    }
  } catch (e) {
    // Non-critical fallback
  }
})();

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
