import { useEffect, useRef } from 'react';

/**
 * useSessionRefresh Hook
 *
 * Automatically refreshes the session token at regular intervals
 * to prevent users from being logged out due to token expiration.
 *
 * @param refreshInterval - Interval in milliseconds (default: 10 minutes)
 * @param enabled - Whether the refresh mechanism is enabled (default: true)
 */
export function useSessionRefresh(
  refreshInterval: number = 10 * 60 * 1000, // 10 minutes
  enabled: boolean = true
) {
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Function to refresh the session
    const refreshSession = async () => {
      try {
        console.log('🔄 Auto-refreshing session...');

        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          console.log('✅ Session refreshed successfully');
        } else {
          console.warn('⚠️ Failed to refresh session:', response.status);

          // If unauthorized, the user will be redirected to login by the middleware
          if (response.status === 401) {
            console.log('🔒 Session expired, redirecting to login...');
          }
        }
      } catch (error) {
        console.error('❌ Error refreshing session:', error);
      }
    };

    // Initial refresh check after 1 minute
    const initialRefreshTimer = setTimeout(() => {
      refreshSession();
    }, 60 * 1000); // 1 minute

    // Set up periodic refresh
    refreshTimerRef.current = setInterval(() => {
      refreshSession();
    }, refreshInterval);

    // Cleanup function
    return () => {
      if (initialRefreshTimer) clearTimeout(initialRefreshTimer);
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [refreshInterval, enabled]);

  return null;
}
