'use client';

import dynamic from 'next/dynamic';

import BrandedLoader from '@/components/BrandedLoader';

// ⚡ LAZY LOADING: AktivitasSayaContainer will only load when user visits /aktifitas-saya
const AktivitasSayaContainer = dynamic(() => import('@/containers/AktivitasSayaContainer'), {
    loading: () => <BrandedLoader fullScreen={false} message="Memuat Aktivitas..." />,
    ssr: false // Disable SSR for this client component
});

export default function AktifitasSayaPage() {
    return <AktivitasSayaContainer />;
}