'use client';

import dynamic from 'next/dynamic';

// ⚡ OPTIMIZATION: Dynamic import untuk Presensi component - hanya load ketika dibutuhkan
const PresensiSimple = dynamic(() => import('@/components/PresensiSimple').then(mod => ({ default: mod.default })), {
    loading: () => (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto mb-4"></div>
                <p className="text-white text-lg">Memuat Presensi...</p>
            </div>
        </div>
    ),
    ssr: false
});

export default function PresensiPage() {
    return <PresensiSimple />;
}
