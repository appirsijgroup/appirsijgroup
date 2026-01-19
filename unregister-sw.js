// Script untuk unregister service worker dan clear cache
// Jalankan di browser console atau tambahkan ke layout

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
      console.log('✅ Service Worker unregistered:', registration);
    }

    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            console.log('🗑️ Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(function() {
        console.log('✅ All caches cleared');
        console.log('🔄 Please reload the page');
      });
    }
  });
}
