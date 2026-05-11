'use client';

import { useCallback, useEffect, useRef } from 'react';
import { debugLog } from '@/debug/debugLog';

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

			debugLog.addLog({
				type: 'visibility',
				message: 'App became visible',
				data: { visibilityState: document.visibilityState },
			});

			try {
				await onVisible();
			} catch (err) {
				console.error('[Visibility] Error in onVisible callback:', err);
				debugLog.addLog({
					type: 'error',
					message: 'Visibility reconnect onVisible callback failed',
					data: { error: String(err) },
				});
			} finally {
				isHandlingRef.current = false;
			}
		} else if (document.visibilityState === 'hidden') {
			isVisibleRef.current = false;

			debugLog.addLog({
				type: 'visibility',
				message: 'App became hidden',
				data: { visibilityState: document.visibilityState },
			});
		}
	}, [enabled, onVisible]);

	useEffect(() => {
		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, [handleVisibilityChange]);
}
