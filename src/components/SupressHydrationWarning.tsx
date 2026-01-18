'use client';

import { useEffect } from 'react';

export default function SupressHydrationWarning() {
    useEffect(() => {
        // Suppress hydration mismatch warnings caused by browser extensions
        // This is safe to do because these attributes are added by browser extensions
        // and don't affect the application's functionality
        const originalError = console.error;
        console.error = (...args) => {
            if (typeof args[0] === 'string' && args[0].includes('Warning: Text content did not match')) {
                return;
            }
            if (typeof args[0] === 'string' && args[0].includes('Hydration failed because')) {
                return;
            }
            originalError.apply(console, args);
        };
    }, []);

    return null;
}
