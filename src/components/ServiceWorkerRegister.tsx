'use client';

import { useEffect, useRef } from 'react';

export default function ServiceWorkerRegister() {
  const hasReloaded = useRef(false);

  useEffect(() => {
    // 🔥 CRITICAL: Skip Service Worker in development to avoid refresh loops and caching issues
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Use a static version or no version to avoid loops
      // updateViaCache: 'none' already ensures the browser checks the server for changes
      const swUrl = '/sw.js';

      navigator.serviceWorker
        .register(swUrl, {
          // 🔥 CRITICAL: Don't cache the sw.js file itself in the browser
          updateViaCache: 'none'
        })
        .then((registration) => {
          // Check for updates immediately on registration
          registration.update();

          // Skip waiting for new worker but don't reload immediately
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available - force activation
                  if (registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                  }
                }
              });
            }
          });

          // 🔥 PERIODIC CHECK: Check for updates every 30 minutes
          const intervalId = setInterval(() => {
            registration.update();
          }, 1000 * 60 * 30);

          return () => clearInterval(intervalId);
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
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
