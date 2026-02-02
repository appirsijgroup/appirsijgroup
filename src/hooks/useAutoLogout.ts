import { useEffect, useRef, useCallback } from 'react';
import { useAppDataStore } from '@/store/store';
import { logger } from '@/lib/logger';

/**
 * Hook to automatically logout user after a period of inactivity.
 * 
 * @param timeoutMs Duration in milliseconds before logout (default: 15 minutes)
 */
export const useAutoLogout = (timeoutMs: number = 15 * 60 * 1000) => {
    const { loggedInEmployee, logoutEmployee, isLoggingOut } = useAppDataStore();
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    const handleLogout = useCallback(() => {
        // Prevent double logout/loops
        if (isLoggingOut) return;

        if (loggedInEmployee) {
            logger.info(`[useAutoLogout] User inactive for ${timeoutMs / 60000} minutes. Logging out.`);
            logoutEmployee();
        }
    }, [loggedInEmployee, logoutEmployee, isLoggingOut, timeoutMs]);

    const resetTimer = useCallback(() => {
        if (!loggedInEmployee || isLoggingOut) return;

        lastActivityRef.current = Date.now();

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(handleLogout, timeoutMs);
    }, [loggedInEmployee, isLoggingOut, handleLogout, timeoutMs]);

    useEffect(() => {
        if (!loggedInEmployee || isLoggingOut) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        logger.info('[useAutoLogout] Inactivity timer started');

        // Initial start
        resetTimer();

        // Events to listen for
        const events = [
            'mousedown',
            'mousemove',
            'keydown',
            'scroll',
            'touchstart',
            'click'
        ];

        // Throttled event handler to avoid performance issues on mousemove
        let throttleTimer: NodeJS.Timeout | null = null;
        const handleActivity = () => {
            if (!throttleTimer) {
                throttleTimer = setTimeout(() => {
                    resetTimer();
                    throttleTimer = null;
                }, 1000); // Only reset timer once per second max
            }
        };

        // Attach listeners to window
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // Cleanup
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (throttleTimer) clearTimeout(throttleTimer);

            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [loggedInEmployee, isLoggingOut, resetTimer]);

    return { resetTimer };
};
