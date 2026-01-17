'use client';

import { useEffect, useRef } from 'react';

export default function ServiceWorkerRegister() {
  const hasReloaded = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const swUrl = '/sw.js';

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('✅ Service Worker registered successfully');

          // Skip waiting for new worker but don't reload immediately
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }

          // Listen for updates but notify only - don't auto reload
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available - notify user instead of auto reload
                  console.log('📦 New version available. Refresh to update.');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });

      // Listen for controlling changes - only reload once
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hasReloaded.current) {
          hasReloaded.current = true;
          console.log('🔄 Service Worker updated, reloading page...');
          window.location.reload();
        }
      });
    }
  }, []);

  return null;
}
