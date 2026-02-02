/**
 * 🔧 Cache Clearing Utility
 *
 * Fungsi untuk membersihkan semua cache aplikasi (React Query, Service Worker, Browser)
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Clear React Query Cache
 * Membersihkan semua cache di TanStack Query
 */
export function clearReactQueryCache(queryClient: QueryClient): void {
  try {
    // Clear semua queries
    queryClient.clear();

    // Clear dan reset query client
    queryClient.resetQueries();

    console.log('✅ React Query cache berhasil dibersihkan');
  } catch (error) {
    console.error('❌ Gagal membersihkan React Query cache:', error);
    throw error;
  }
}

/**
 * Clear Service Worker Cache
 * Membersihkan semua cache yang disimpan oleh Service Worker
 */
export async function clearServiceWorkerCache(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('⚠️ Service Worker tidak tersedia');
    return;
  }

  try {
    // Dapatkan semua cache registrations
    const cacheNames = await caches.keys();

    // Delete semua cache
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );

    console.log(`✅ Berhasil membersihkan ${cacheNames.length} cache`);

    // Unregister service worker
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map(registration => registration.unregister())
    );

    console.log(`✅ Service Worker berhasil di-unregister`);
  } catch (error) {
    console.error('❌ Gagal membersihkan Service Worker cache:', error);
    throw error;
  }
}

/**
 * Clear Browser Storage
 * Membersihkan localStorage dan sessionStorage
 */
export function clearBrowserStorage(): void {
  try {
    // Clear localStorage
    localStorage.clear();

    // Clear sessionStorage
    sessionStorage.clear();

    console.log('✅ Browser storage berhasil dibersihkan');
  } catch (error) {
    console.error('❌ Gagal membersihkan browser storage:', error);
    throw error;
  }
}

/**
 * Clear All Cache
 * Membersihkan SEMUA cache (React Query, Service Worker, Browser Storage)
 *
 * @param queryClient - React Query Client instance
 * @param hardReload - Set true untuk reload halaman setelah clear cache
 */
export async function clearAllCache(
  queryClient?: QueryClient,
  hardReload: boolean = true
): Promise<void> {
  console.log('🧹 Memulai pembersihan SEMUA cache...');

  try {
    // 1. Clear React Query Cache (jika queryClient disediakan)
    if (queryClient) {
      clearReactQueryCache(queryClient);
    }

    // 2. Clear Service Worker Cache
    await clearServiceWorkerCache();

    // 3. Clear Browser Storage
    clearBrowserStorage();

    console.log('✅ SEMUA cache berhasil dibersihkan!');

    // 4. Hard reload untuk memastikan cache bersih
    if (hardReload && typeof window !== 'undefined') {
      console.log('🔄 Me-reload halaman...');

      // Tunggu sebentar sebelum reload
      setTimeout(() => {
        // Hard reload dengan bypass cache
        window.location.reload();
      }, 500);
    }
  } catch (error) {
    console.error('❌ Terjadi error saat membersihkan cache:', error);
    throw error;
  }
}

/**
 * Debug Cache Status
 * Menampilkan status cache untuk debugging
 */
export async function debugCacheStatus(queryClient?: QueryClient): Promise<void> {
  console.log('📊 Status Cache Aplikasi:');
  console.log('================================');

  // React Query Cache
  if (queryClient) {
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.getAll();
    console.log(`📦 React Query: ${queries.length} queries cached`);
    queries.forEach((query) => {
      console.log(`  - ${query.queryKey.join('/')}: ${query.state.status}`);
    });
  }

  // Service Worker
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log(`🔧 Service Workers: ${registrations.length} terdaftar`);

    const cacheNames = await caches.keys();
    console.log(`💾 Cache Storage: ${cacheNames.length} cache`);
    cacheNames.forEach(name => {
      console.log(`  - ${name}`);
    });
  }

  // Browser Storage
  const localStorageCount = localStorage.length;
  const sessionStorageCount = sessionStorage.length;
  console.log(`🗂️  localStorage: ${localStorageCount} items`);
  console.log(`🗂️  sessionStorage: ${sessionStorageCount} items`);

  console.log('================================');
}
