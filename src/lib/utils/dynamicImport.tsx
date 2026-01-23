/**
 * ⚡ Dynamic Import Utilities
 * Helper functions for code splitting and lazy loading
 */

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

/**
 * Common loading component for dynamic imports
 */
export const LoadingSpinner = ({
  message = 'Memuat...',
}: {
  message?: string;
}) => (
  <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
    <div className="text-center">
      <div className="relative inline-block mb-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mx-auto"></div>
      </div>
      <p className="text-white text-sm">{message}</p>
    </div>
  </div>
);

/**
 * Create a dynamically imported component with loading state
 *
 * @example
 * ```tsx
 * const HeavyComponent = dynamicImport(() => import('./HeavyComponent'), {
 *   loadingMessage: 'Loading heavy component...',
 * });
 * ```
 */
export function dynamicImport<T extends object>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options?: {
    loadingMessage?: string;
    ssr?: boolean;
  }
) {
  return dynamic(importFn, {
    loading: () => <LoadingSpinner message={options?.loadingMessage} />,
    ssr: options?.ssr ?? false, // Default: client-side only
  });
}

/**
 * Pre-configured dynamic imports for heavy components
 * NOTE: These are templates - adjust based on actual export types (default vs named)
 */

// Dashboard Components (Uncomment when needed)
// export const DynamicMyDashboard = dynamicImport(
//   () => import('@/components/MyDashboard').then(m => ({ default: m.MyDashboard })),
//   { loadingMessage: 'Memuat Dashboard...' }
// );

// Add more dynamic imports as needed...

/**
 * ⚡ PERFORMANCE: Preload critical components
 * Call this function to preload components before they're needed
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   preloadComponents([DynamicMyDashboard, DynamicAnalytics]);
 * }, []);
 * ```
 */
export function preloadComponents(
  components: Array<() => Promise<{ default: ComponentType<any> }>>
) {
  components.forEach((loadComponent) => {
    // Start loading the component in the background
    loadComponent();
  });
}

/**
 * ⚡ PERFORMANCE: Create a viewport-based lazy loader
 * Components load only when they enter the viewport
 */
import { useEffect, useRef, useState } from 'react';

export function useViewportLazy(
  loadComponent: () => Promise<{ default: ComponentType<any> }>,
  options?: {
    rootMargin?: string;
    threshold?: number;
  }
) {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: options?.rootMargin || '200px',
        threshold: options?.threshold || 0.1,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, shouldLoad, loadComponent };
}
