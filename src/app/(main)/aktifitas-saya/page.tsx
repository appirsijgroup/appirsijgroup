'use client';

import dynamic from 'next/dynamic';

// ⚡ LAZY LOADING: DashboardContainer will only load when user visits /aktifitas-saya
const DashboardContainer = dynamic(() => import('@/containers/DashboardContainer').then(mod => ({ default: mod.default })), {
    loading: () => (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto mb-4"></div>
                <p className="text-white text-lg">Memuat Aktivitas Saya...</p>
            </div>
        </div>
    ),
    ssr: false // Disable SSR for this client component
});

export default function AktifitasSayaPage() {
    return <DashboardContainer initialTab="aktivitas-pribadi" />;
}
