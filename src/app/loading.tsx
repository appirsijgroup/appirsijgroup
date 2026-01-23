/**
 * Global Loading Component
 * Silent skeleton loader - no text, just visual feedback
 */

export default function Loading() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        {/* Loading Spinner */}
        <div className="relative inline-block">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse rounded-full h-8 w-8 bg-teal-400 opacity-50"></div>
          </div>
        </div>

        {/* Silent Progress Bar (Visual Only) */}
        <div className="mt-8 w-64 h-1 bg-gray-700 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-linear-to-r from-teal-400 to-blue-500 animate-[slide-left_1.5s_infinite]"></div>
        </div>
      </div>
    </div>
  );
}
