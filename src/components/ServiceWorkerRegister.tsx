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
                }
              });
            }
          });
        })
        .catch((error) => {
        });

      // Listen for controlling changes - only reload once
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hasReloaded.current) {
          hasReloaded.current = true;
          window.location.reload();
        }
      });
    }
  }, []);

  return null;
}
