/**
 * Global Loading Component
 * Shown while pages are loading or data is being fetched
 */

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        {/* Loading Spinner */}
        <div className="relative inline-block">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto mb-6"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse rounded-full h-8 w-8 bg-teal-400 opacity-50"></div>
          </div>
        </div>

        {/* Loading Text */}
        <p className="text-white text-lg font-medium mb-2">Memuat aplikasi...</p>
        <p className="text-gray-400 text-sm">Mohon tunggu sebentar</p>

        {/* Loading Progress Bar (Visual Only) */}
        <div className="mt-6 w-64 h-1 bg-gray-700 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-gradient-to-r from-teal-400 to-blue-500 animate-[slide-left_1.5s_infinite]"></div>
        </div>
      </div>
    </div>
  );
}
