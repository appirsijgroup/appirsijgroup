'use client';

import MainLayoutShell from '@/components/MainLayoutShell';
import DataLoader from '@/components/DataLoader';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <DataLoader>
            <MainLayoutShell>{children}</MainLayoutShell>
        </DataLoader>
    );
}
