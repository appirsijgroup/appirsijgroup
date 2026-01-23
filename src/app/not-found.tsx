import Link from 'next/link';

/**
 * 404 Not Found Page
 * Shown when user navigates to a non-existent route
 */

export default function NotFound() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-2xl p-8 text-center">
        {/* 404 Icon */}
        <div className="mb-6">
          <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-linear-to-r from-teal-400 to-blue-500">
            404
          </h1>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-bold text-white mb-2">Halaman Tidak Ditemukan</h2>
        <p className="text-gray-400 mb-8">
          Maaf, halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>

        {/* Action Button */}
        <Link
          href="/dashboard"
          className="inline-block w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Kembali ke Dashboard
        </Link>

        {/* Additional Links */}
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/login" className="text-gray-400 hover:text-teal-400 text-sm transition-colors">
            Login
          </Link>
          <Link href="/presensi" className="text-gray-400 hover:text-teal-400 text-sm transition-colors">
            Presensi
          </Link>
        </div>
      </div>
    </div>
  );
}
