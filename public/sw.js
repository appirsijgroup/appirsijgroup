const CACHE_NAME = 'appi-rsi-group-v3';

// Only cache static assets and public pages
// NEVER cache authenticated pages or pages with redirects
const urlsToCache = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/favicon-48x48.png',
  '/apple-touch-icon.png',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
      })
  );
  // Immediately activate the new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all([
        // Delete old caches
        ...cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        }),
        // Take control of all clients immediately
        self.clients.claim()
      ]);
    })
  );
});

// Handle skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event - smart caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // IMPORTANT: Skip chrome-extension and other extension schemes
  if (url.protocol === 'chrome-extension:' ||
    url.protocol === 'extension:' ||
    url.protocol === 'moz-extension:') {
    return;
  }

  // 🔥 CRITICAL FIX: Skip ALL navigation requests to allow Next.js client-side navigation
  // This prevents PWA from reloading the entire app on menu changes
  const isNavigation = event.request.mode === 'navigate';
  if (isNavigation) {
    // Let Next.js handle navigation - don't intercept
    return;
  }

  // IMPORTANT: Do NOT cache API routes (especially POST/PUT/DELETE)
  const isApiRoute = url.pathname.startsWith('/api');

  if (isApiRoute) {
    // For API routes, always fetch from network, never cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch((error) => {
          console.error('API fetch failed:', error);
          return new Response('API Error - Gagal mengambil data dari server', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        })
    );
    return;
  }

  // For static assets, use cache first strategy
  // BUT: Only cache GET requests, never cache POST/PUT/DELETE/PATCH
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch((error) => {
          console.error('Fetch failed:', error);
          return new Response('Offline - Tidak ada koneksi internet', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mutabaah') {
    event.waitUntil(syncMutabaahData());
  }
});

async function syncMutabaahData() {
  // Implement sync logic here
  console.log('Syncing mutabaah data...');
}
