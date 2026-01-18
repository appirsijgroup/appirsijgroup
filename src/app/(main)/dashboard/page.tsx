'use client';

import dynamic from 'next/dynamic';

// ⚡ LAZY LOADING: DashboardContainer will only load when user visits /dashboard
// This saves ~830 lines of code + all dependencies from initial bundle
// 🔥 OPTIMIZED: Removed loading indicator - dashboard renders immediately with cached data
const DashboardContainer = dynamic(() => import('@/containers/DashboardContainer').then(mod => ({ default: mod.default })), {
    ssr: false // Disable SSR for this client component
});

export default function DashboardPage() {
    return <DashboardContainer />;
}
