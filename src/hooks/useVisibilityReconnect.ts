'use client';

import { useCallback, useEffect, useRef } from 'react';

interface UseVisibilityReconnectOptions {
	onVisible: () => void | Promise<void>;
	enabled?: boolean;
}

export function useVisibilityReconnect({
	onVisible,
	enabled = true,
}: UseVisibilityReconnectOptions) {
	const isVisibleRef = useRef(true);
	const isHandlingRef = useRef(false);

	const handleVisibilityChange = useCallback(async () => {
		if (!enabled || isHandlingRef.current) {
			return;
		}

		if (document.visibilityState === 'visible' && !isVisibleRef.current) {
			isVisibleRef.current = true;
			isHandlingRef.current = true;

			try {
				await onVisible();
			} catch (err) {
				console.error('[Visibility] Error in onVisible callback:', err);
			} finally {
				isHandlingRef.current = false;
			}
		} else if (document.visibilityState === 'hidden') {
			isVisibleRef.current = false;
		}
	}, [enabled, onVisible]);

	useEffect(() => {
		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, [handleVisibilityChange]);
}
