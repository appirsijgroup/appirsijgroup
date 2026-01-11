/**
 * Loading State for (main) routes
 * Shown while authenticated pages are loading
 */

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        {/* Spinner */}
        <div className="relative inline-block mb-6">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse rounded-full h-8 w-8 bg-teal-400 opacity-50"></div>
          </div>
        </div>

        {/* Loading Text */}
        <p className="text-white text-lg font-medium">Memuat data...</p>
        <p className="text-gray-400 text-sm mt-2">Mohon tunggu sebentar</p>
      </div>
    </div>
  );
}
