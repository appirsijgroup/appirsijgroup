'use client';

/**
 * Global Error Boundary
 * Catches and displays errors that occur during rendering
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
    // Log error to error reporting service
  }, [error]);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-2xl p-8 text-center">
        {/* Error Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-2xl font-bold text-white mb-2">Terjadi Kesalahan</h1>
        <p className="text-gray-400 mb-6">
          {error.message || 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Coba Lagi
          </button>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Kembali ke Login
          </button>
        </div>

        {/* Tech Details (Development Only) */}
        {process.env.NODE_ENV === 'development' && error.digest && (
          <details className="mt-6 text-left">
            <summary className="text-gray-500 text-sm cursor-pointer hover:text-gray-400">
              Technical Details
            </summary>
            <pre className="mt-2 p-4 bg-gray-900 rounded text-xs text-red-400 overflow-auto">
              {error.digest}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
