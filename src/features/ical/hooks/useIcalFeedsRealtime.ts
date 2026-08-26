import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

const EVENT_COALESCE_MS = 500;

interface UseIcalFeedsRealtimeConfig {
	propertyId: string;
	onFeedChange: () => void;
}

export function useIcalFeedsRealtime({ propertyId, onFeedChange }: UseIcalFeedsRealtimeConfig) {
	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
	const coalesceTimeoutRef = useRef<number | null>(null);
	const onFeedChangeRef = useRef(onFeedChange);
	onFeedChangeRef.current = onFeedChange;

	const flushChange = useCallback(() => {
		coalesceTimeoutRef.current = null;
		onFeedChangeRef.current();
	}, []);

	const scheduleChange = useCallback(() => {
		if (coalesceTimeoutRef.current !== null) {
			window.clearTimeout(coalesceTimeoutRef.current);
		}
		coalesceTimeoutRef.current = window.setTimeout(flushChange, EVENT_COALESCE_MS);
	}, [flushChange]);

	const cleanupChannel = useCallback(() => {
		if (coalesceTimeoutRef.current !== null) {
			window.clearTimeout(coalesceTimeoutRef.current);
			coalesceTimeoutRef.current = null;
		}
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
			channelRef.current = null;
		}
	}, []);

	useEffect(() => {
		if (!propertyId) {
			cleanupChannel();
			return;
		}

		if (channelRef.current) {
			return;
		}

		const channel = supabase
			.channel(`ical-feeds-realtime-${propertyId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'ical_feeds',
					filter: `property_id=eq.${propertyId}`,
				},
				() => {
					scheduleChange();
				},
			)
			.subscribe((status: string, err?: unknown) => {
				if (err && import.meta.env.PROD) {
					console.error('[IcalFeeds] Channel error', { status, error: err });
				}
			});

		channelRef.current = channel;

		return () => {
			cleanupChannel();
		};
	}, [propertyId, scheduleChange, cleanupChannel]);
}
