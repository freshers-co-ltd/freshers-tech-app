import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/features/auth/services/authService';

/**
 * Hook that automatically logs out the user after a period of inactivity.
 * Respects the 'trust_device' localStorage flag - trusted devices bypass logout.
 *
 * @param timeoutMs - Time in milliseconds before auto-logout (default: 30 minutes)
 *
 * @example
 * ```typescript
 * useInactivityLogout(); // 30 min timeout
 * useInactivityLogout(15 * 60 * 1000); // 15 min timeout
 * ```
 */
export function useInactivityLogout(timeoutMs = 30 * 60 * 1000) {
	const navigate = useNavigate();
	const timeoutRef = useRef<number | null>(null);

	const logout = useCallback(async () => {
		navigate('/login?reason=inactivity', { replace: true });
		await authService.signOut();
	}, [navigate]);

	const resetTimer = useCallback(() => {
		if (timeoutRef.current) {
			window.clearTimeout(timeoutRef.current);
		}
		timeoutRef.current = window.setTimeout(logout, timeoutMs);
	}, [timeoutMs, logout]);

	useEffect(() => {
		const isTrusted = localStorage.getItem('trust_device') === 'true';
		if (isTrusted) {
			return;
		}

		const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];

		events.forEach((event) => {
			window.addEventListener(event, resetTimer);
		});

		resetTimer();

		return () => {
			if (timeoutRef.current) {
				window.clearTimeout(timeoutRef.current);
			}
			events.forEach((event) => {
				window.removeEventListener(event, resetTimer);
			});
		};
	}, [resetTimer]);
}
