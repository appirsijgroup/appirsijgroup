'use client';

import dynamicImport from 'next/dynamic';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

// ⚡ LAZY LOADING: DashboardContainer will only load when user visits /dashboard
// This saves ~830 lines of code + all dependencies from initial bundle
// 🔥 OPTIMIZED: Removed loading indicator - dashboard renders immediately with cached data
const DashboardContainer = dynamicImport(() => import('@/containers/DashboardContainer').then(mod => ({ default: mod.default })), {
    ssr: false // Disable SSR for this client component
});

export default function DashboardPage() {
    return <DashboardContainer />;
}
