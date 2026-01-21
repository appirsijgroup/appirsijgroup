'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  clearAllCache,
  clearReactQueryCache,
  clearServiceWorkerCache,
  clearBrowserStorage,
  debugCacheStatus,
} from '@/lib/clearCache';

/**
 * 🔧 Cache Debug Tools Component
 *
 * Komponen untuk debugging dan membersihkan cache
 * Hanya tampil di development mode
 */
export default function CacheDebugTools() {
  const queryClient = useQueryClient();
  const [isClearing, setIsClearing] = useState(false);
  const [status, setStatus] = useState<string>('');

  const handleClearAll = async () => {
    if (!confirm('⚠️ Yakin ingin menghapus SEMUA cache? Halaman akan di-refresh.')) {
      return;
    }

    setIsClearing(true);
    setStatus('🧹 Membersihkan semua cache...');

    try {
      await clearAllCache(queryClient, true);
      setStatus('✅ Cache berhasil dibersihkan!');
    } catch (error) {
      console.error('Error clearing cache:', error);
      setStatus('❌ Gagal membersihkan cache. Cek console untuk detail.');
      setIsClearing(false);
    }
  };

  const handleDebug = async () => {
    await debugCacheStatus(queryClient);
  };

  const handleClearReactQuery = () => {
    clearReactQueryCache(queryClient);
    setStatus('✅ React Query cache dibersihkan');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleClearServiceWorker = async () => {
    await clearServiceWorkerCache();
    setStatus('✅ Service Worker cache dibersihkan');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleClearBrowserStorage = () => {
    clearBrowserStorage();
    setStatus('✅ Browser storage dibersihkan');
    setTimeout(() => setStatus(''), 2000);
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#1f2937',
      color: '#fff',
      padding: '16px',
      borderRadius: '8px',
      zIndex: 9999,
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
      fontSize: '12px',
      maxWidth: '300px',
    }}>
      <div style={{
        fontWeight: 'bold',
        marginBottom: '12px',
        borderBottom: '1px solid #374151',
        paddingBottom: '8px'
      }}>
        🔧 Cache Debug Tools
      </div>

      {status && (
        <div style={{
          background: '#065f46',
          padding: '8px',
          borderRadius: '4px',
          marginBottom: '12px',
          fontSize: '11px'
        }}>
          {status}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={handleDebug}
          disabled={isClearing}
          style={{
            padding: '8px 12px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isClearing ? 'not-allowed' : 'pointer',
            opacity: isClearing ? 0.5 : 1
          }}
        >
          📊 Debug Cache
        </button>

        <button
          onClick={handleClearReactQuery}
          disabled={isClearing}
          style={{
            padding: '8px 12px',
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isClearing ? 'not-allowed' : 'pointer',
            opacity: isClearing ? 0.5 : 1
          }}
        >
          🔄 Clear React Query
        </button>

        <button
          onClick={handleClearServiceWorker}
          disabled={isClearing}
          style={{
            padding: '8px 12px',
            background: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isClearing ? 'not-allowed' : 'pointer',
            opacity: isClearing ? 0.5 : 1
          }}
        >
          🔧 Clear SW Cache
        </button>

        <button
          onClick={handleClearBrowserStorage}
          disabled={isClearing}
          style={{
            padding: '8px 12px',
            background: '#ec4899',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isClearing ? 'not-allowed' : 'pointer',
            opacity: isClearing ? 0.5 : 1
          }}
        >
          🗑️ Clear Storage
        </button>

        <button
          onClick={handleClearAll}
          disabled={isClearing}
          style={{
            padding: '12px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isClearing ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            opacity: isClearing ? 0.5 : 1
          }}
        >
          {isClearing ? '⏳ Cleaning...' : '🧹 CLEAR ALL'}
        </button>
      </div>

      <div style={{
        marginTop: '12px',
        fontSize: '10px',
        color: '#9ca3af',
        textAlign: 'center'
      }}>
        Dev Mode Only
      </div>
    </div>
  );
}
