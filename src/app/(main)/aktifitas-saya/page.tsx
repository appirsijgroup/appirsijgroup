'use client';

import dynamic from 'next/dynamic';

import MinimalistLoader from '@/components/MinimalistLoader';

// ⚡ LAZY LOADING: AktivitasSayaContainer will only load when user visits /aktifitas-saya
const AktivitasSayaContainer = dynamic(() => import('@/containers/AktivitasSayaContainer'), {
    loading: () => <MinimalistLoader message="Memuat Aktivitas..." />,
    ssr: false // Disable SSR for this client component
});

export default function AktifitasSayaPage() {
    return <AktivitasSayaContainer />;
}