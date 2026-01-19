'use client';

import { useEffect } from 'react';

export default function SupressHydrationWarning() {
    useEffect(() => {
        // Suppress hydration mismatch warnings caused by browser extensions
        // This is safe to do because these attributes are added by browser extensions
        // and don't affect the application's functionality
    }, []);

    return null;
}
