'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useHeartbeat(userId: string | undefined) {
	useEffect(() => {
		if (!userId) {
			return;
		}

		const recordActivity = async () => {
			if (document.visibilityState !== 'visible') {
				return;
			}

			try {
				await supabase.rpc('update_user_presence');
			} catch {
				// Non-critical heartbeat; silently ignore failures
			}
		};

		recordActivity();

		const interval = setInterval(recordActivity, 1000 * 60 * 5);

		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				recordActivity();
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			clearInterval(interval);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, [userId]);
}
