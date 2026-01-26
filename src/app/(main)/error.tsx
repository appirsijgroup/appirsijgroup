'use client';

/**
 * Error Boundary for (main) authenticated routes
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
  }, [error]);

  return (
    <div className="flex items-center justify-center py-20 px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-2xl p-8 text-center">
        {/* Error Icon */}
        <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-12 h-12 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-white mb-2">Terjadi Kesalahan</h1>
        <p className="text-gray-400 mb-6">
          {error.message || 'Gagal memuat halaman. Silakan coba lagi.'}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Coba Lagi
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Kembali ke Dashboard
          </button>
        </div>

        {/* Debug Info (Dev Only) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="text-gray-500 text-sm cursor-pointer hover:text-gray-400">
              Debug Info
            </summary>
            <pre className="mt-2 p-4 bg-gray-900 rounded text-xs text-red-400 overflow-auto">
              {error.stack || error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
