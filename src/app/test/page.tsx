export default function TestPage() {
  // Block access in production
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">🚫 Akses Ditolak</h1>
          <p>Halaman ini hanya tersedia di development mode.</p>
        </div>
      </div>
    );
  }

  return <h1>Test Page</h1>;
}