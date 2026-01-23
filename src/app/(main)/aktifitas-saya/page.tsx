'use client';

import dynamic from 'next/dynamic';

// ⚡ LAZY LOADING: AktivitasSayaContainer will only load when user visits /aktifitas-saya
const AktivitasSayaContainer = dynamic(() => import('@/containers/AktivitasSayaContainer'), {
    loading: () => (
        <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto"></div>
            </div>
        </div>
    ),
    ssr: false // Disable SSR for this client component
});

export default function AktifitasSayaPage() {
    return <AktivitasSayaContainer />;
}