/**
 * ⚡ Performance Monitoring Utilities
 * Track and measure application performance metrics
 */

/**
 * Log Web Vitals (CLS, FID, LCP, etc.)
 */
export function logWebVitals(metric: any) {
  const { name, value, id } = metric;

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
  }

  // Send to analytics service (uncomment when ready)
  // if (process.env.NODE_ENV === 'production') {
  //   sendToAnalytics({ name, value, id });
  // }
}

/**
 * Measure component render time
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useEffect(() => {
 *     const startTime = performance.now();
 *     return () => {
 *       const endTime = performance.now();
 *       logRenderTime('MyComponent', endTime - startTime);
 *     };
 *   }, []);
 * }
 * ```
 */
export function logRenderTime(componentName: string, duration: number) {
  if (process.env.NODE_ENV === 'development') {
  }
}

/**
 * Track API response time
 */
export function logApiResponse(endpoint: string, duration: number, status: number) {
  if (process.env.NODE_ENV === 'development') {
  }
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Batch state updates to reduce re-renders
 */
export function batchUpdates(updates: Array<() => void>) {
  updates.forEach((update) => update());
}

/**
 * ⚡ PERFORMANCE: Detect low-end devices
 * Returns true if device has limited resources
 */
export function isLowEndDevice(): boolean {
  // Check for slow CPU
  const hardwareConcurrency = navigator.hardwareConcurrency || 2;
  if (hardwareConcurrency <= 2) return true;

  // Check for limited memory (if available)
  const deviceMemory = (navigator as any).deviceMemory;
  if (deviceMemory && deviceMemory <= 2) return true;

  // Check for slow network (if available)
  const connection = (navigator as any).connection;
  if (connection && connection.effectiveType && (
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g'
  )) {
    return true;
  }

  return false;
}

/**
 * ⚡ PERFORMANCE: Reduce animations on low-end devices
 */
export function shouldReduceMotion(): boolean {
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    isLowEndDevice()
  );
}

/**
 * ⚡ PERFORMANCE: Get optimal image quality based on device
 */
export function getOptimalImageQuality(): number {
  if (isLowEndDevice()) {
    return 60; // Lower quality for low-end devices
  }
  return 75; // Default quality
}

/**
 * ⚡ PERFORMANCE: Preload critical resources
 */
export function preloadCriticalResources() {
  // Preload critical fonts
  const fonts = [
    '/fonts/inter-400.woff2',
    '/fonts/inter-500.woff2',
    '/fonts/inter-600.woff2',
  ];

  fonts.forEach((font) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.href = font;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

/**
 * ⚡ PERFORMANCE: Measure First Contentful Paint (FCP)
 */
export function measureFCP() {
  if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          logWebVitals({
            name: 'FCP',
            value: entry.startTime,
            id: 'fcp',
          });
          observer.disconnect();
        }
      }
    });

    observer.observe({ entryTypes: ['paint'] });
  }
}

/**
 * ⚡ PERFORMANCE: Measure Largest Contentful Paint (LCP)
 */
export function measureLCP() {
  if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      logWebVitals({
        name: 'LCP',
        value: lastEntry.startTime,
        id: 'lcp',
      });
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  }
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring() {
  if (process.env.NODE_ENV === 'development') {
    measureFCP();
    measureLCP();
  }
}
