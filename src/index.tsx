
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Buffer } from 'buffer';
// Polyfill Buffer for the browser
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { UIProvider } from './contexts/UIContext';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';

const CHUNK_RECOVERY_FLAG = 'artisflow-chunk-recovery-attempted';

const isDynamicImportError = (value: unknown) => {
  const message = String((value as any)?.message || value || '');
  return message.includes('Failed to fetch dynamically imported module') || message.includes('Importing a module script failed');
};

const recoverFromChunkLoadError = async () => {
  if (typeof window === 'undefined') return;
  if (sessionStorage.getItem(CHUNK_RECOVERY_FLAG) === '1') return;

  sessionStorage.setItem(CHUNK_RECOVERY_FLAG, '1');

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(reg => reg.unregister()));
    }

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
  } finally {
    window.location.reload();
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (isDynamicImportError(event.error || event.message)) {
      recoverFromChunkLoadError();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (isDynamicImportError(event.reason)) {
      recoverFromChunkLoadError();
    }
  });
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => {
        // SW registered successfully
      })
      .catch(registrationError => {
        console.error('SW registration failed: ', registrationError);
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <UIProvider>
        <DataProvider>
          <GlobalErrorBoundary>
            <App />
          </GlobalErrorBoundary>
        </DataProvider>
      </UIProvider>
    </AuthProvider>
  </React.StrictMode>
);
