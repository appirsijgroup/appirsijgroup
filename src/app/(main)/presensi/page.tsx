'use client';

import dynamic from 'next/dynamic';
import MinimalistLoader from '@/components/MinimalistLoader';

// ⚡ OPTIMIZATION: Dynamic import untuk Presensi component - hanya load ketika dibutuhkan
const PresensiSimple = dynamic(() => import('@/components/PresensiSimple').then(mod => ({ default: mod.default })), {
    loading: () => <MinimalistLoader message="Memuat Presensi..." />,

    ssr: false
});

export default function PresensiPage() {
    return <PresensiSimple />;
}
