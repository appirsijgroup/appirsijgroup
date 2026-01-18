'use client';

import { useEffect } from 'react';

/**
 * Performance Monitor Component
 *
 * Melacak Web Vitals untuk monitoring performa aplikasi:
 * - FCP (First Contentful Paint) - Waktu konten pertama muncul
 * - LCP (Largest Contentful Paint) - Waktu konten terbesar muncul
 * - FID (First Input Delay) - Delay input pertama user
 * - CLS (Cumulative Layout Shift) - Perubahan layout yang tidak terduga
 * - TTFB (Time to First Byte) - Waktu respon server
 *
 * Data dikirim ke analytics service (Google Analytics, custom endpoint, dll)
 */
export function PerformanceMonitor() {
  useEffect(() => {
    // Hanya jalankan di production
    if (process.env.NODE_ENV !== 'production') return;

    let isMounted = true;

    const reportWebVitals = async (metric: any) => {
      if (!isMounted) return;

      const { name, value, rating, delta, id } = metric;

      // Log ke console untuk development
      console.log(`[Web Vitals] ${name}:`, {
        value: Math.round(value),
        rating,
        delta: Math.round(delta),
      });

      // 🔥 SEND TO ANALYTICS
      // Uncomment dan sesuaikan dengan analytics service Anda
      try {
        // Option 1: Google Analytics 4
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', name, {
            event_category: 'Web Vitals',
            event_label: id,
            value: Math.round(name === 'CLS' ? delta * 1000 : delta),
            non_interaction: true,
          });
        }

        // Option 2: Custom analytics endpoint
        // await fetch('/api/analytics/web-vitals', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   credentials: 'include',
        //   body: JSON.stringify({
        //     name,
        //     value: Math.round(value),
        //     rating,
        //     delta: Math.round(delta),
        //     id,
        //     url: window.location.href,
        //     userAgent: navigator.userAgent,
        //     timestamp: Date.now(),
        //   }),
        // });

        // Option 3: Vercel Analytics
        if (typeof window !== 'undefined' && (window as any).va) {
          (window as any).va('event', {
            name,
            value: Math.round(value),
          });
        }
      } catch (error) {
        console.error('Failed to report web vitals:', error);
      }
    };

    // Load web-vitals library
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(reportWebVitals);
      getFID(reportWebVitals);
      getFCP(reportWebVitals);
      getLCP(reportWebVitals);
      getTTFB(reportWebVitals);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return null;
}

/**
 * Hook untuk melacak performa custom operations
 *
 * @example
 * const { measure, mark } = usePerformance();
 *
 * mark('data-fetch-start');
 * await fetchData();
 * mark('data-fetch-end');
 * measure('data-fetch', 'data-fetch-start', 'data-fetch-end');
 */
export function usePerformance() {
  useEffect(() => {
    // Check if Performance API is supported
    if (typeof window === 'undefined' || !window.performance) {
      console.warn('Performance API not supported');
      return;
    }

    // Setup performance observer
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log('[Performance]', entry.name, {
          duration: Math.round(entry.duration),
          startTime: Math.round(entry.startTime),
        });
      }
    });

    observer.observe({ entryTypes: ['measure', 'mark', 'navigation'] });

    return () => observer.disconnect();
  }, []);

  const mark = (name: string) => {
    if (window.performance) {
      window.performance.mark(name);
    }
  };

  const measure = (name: string, startMark: string, endMark: string) => {
    if (window.performance) {
      try {
        window.performance.measure(name, startMark, endMark);
        const measure = window.performance.getEntriesByName(name)[0];
        console.log(`[Performance] ${name}: ${Math.round(measure.duration)}ms`);
      } catch (error) {
        console.error('Performance measure error:', error);
      }
    }
  };

  return { mark, measure };
}

/**
 * Component untuk melacak performa query operations
 */
export function QueryPerformanceMonitor() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    // Track React Query performance
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;

      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;

        // Log slow queries (> 1 second)
        if (duration > 1000) {
          console.warn(`[Slow Query] ${url} took ${Math.round(duration)}ms`);
        }

        return response;
      } catch (error) {
        const duration = performance.now() - start;
        console.error(`[Query Error] ${url} failed after ${Math.round(duration)}ms`, error);
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}

/**
 * Performance Score Calculator
 *
 * Menghitung overall performance score berdasarkan Web Vitals
 */
export function calculatePerformanceScore(metrics: {
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
}): {
  score: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  recommendations: string[];
} {
  const scores = {
    fcp: metrics.fcp ? (metrics.fcp < 1800 ? 100 : metrics.fcp < 3000 ? 50 : 0) : null,
    lcp: metrics.lcp ? (metrics.lcp < 2500 ? 100 : metrics.lcp < 4000 ? 50 : 0) : null,
    fid: metrics.fid ? (metrics.fid < 100 ? 100 : metrics.fid < 300 ? 50 : 0) : null,
    cls: metrics.cls ? (metrics.cls < 0.1 ? 100 : metrics.cls < 0.25 ? 50 : 0) : null,
    ttfb: metrics.ttfb ? (metrics.ttfb < 800 ? 100 : metrics.ttfb < 1800 ? 50 : 0) : null,
  };

  const validScores = Object.values(scores).filter((s) => s !== null) as number[];
  const averageScore = validScores.length > 0
    ? validScores.reduce((a, b) => a + b, 0) / validScores.length
    : 0;

  const rating = averageScore >= 80 ? 'good' : averageScore >= 50 ? 'needs-improvement' : 'poor';

  const recommendations: string[] = [];
  if (scores.fcp === 0) recommendations.push('Optimize initial page load and reduce render-blocking resources');
  if (scores.lcp === 0) recommendations.push('Optimize largest content element (images, videos)');
  if (scores.fid === 0) recommendations.push('Reduce JavaScript execution time and main thread work');
  if (scores.cls === 0) recommendations.push('Ensure stable layout by reserving space for dynamic content');
  if (scores.ttfb === 0) recommendations.push('Optimize server response time and use CDN');

  return {
    score: Math.round(averageScore),
    rating,
    recommendations,
  };
}

/**
 * Export utilities untuk manual tracking
 */
export const perf = {
  mark: (name: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(name);
    }
  },
  measure: (name: string, start: string, end: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      try {
        window.performance.measure(name, start, end);
      } catch (error) {
        console.error('Performance measure error:', error);
      }
    }
  },
  now: () => {
    if (typeof window !== 'undefined' && window.performance) {
      return window.performance.now();
    }
    return Date.now();
  },
};
