'use client';

import { useEffect } from 'react';
import { debugLog } from './debugLog';

export function useDebugLogSW() {
	useEffect(() => {
		if (typeof window === 'undefined' || !navigator.serviceWorker) {
			return;
		}

		const handleMessage = (event: MessageEvent) => {
			if (event.data?.type === 'DEBUG_LOG') {
				debugLog.addLog(event.data.payload);
			}
		};

		navigator.serviceWorker.addEventListener('message', handleMessage);

		return () => {
			navigator.serviceWorker.removeEventListener('message', handleMessage);
		};
	}, []);
}
