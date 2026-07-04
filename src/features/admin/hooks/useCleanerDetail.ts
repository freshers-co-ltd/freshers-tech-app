'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { userService } from '@/features/admin/services/userService';
import type { AdminCleanerDetail } from '@/features/admin/types';
import { supabase } from '@/lib/supabaseClient';

interface UseCleanerDetailResult {
	cleaner: AdminCleanerDetail | null;
	loading: boolean;
	refresh: () => Promise<void>;
}

interface UseCleanerDetailOptions {
	cleaningsSortField?: string;
	cleaningsSortDirection?: 'asc' | 'desc';
}

export function useCleanerDetail(
	cleanerId: string | undefined,
	options: UseCleanerDetailOptions = {},
): UseCleanerDetailResult {
	const { cleaningsSortField = 'scheduled_start', cleaningsSortDirection = 'desc' } = options;

	const [cleaner, setCleaner] = useState<AdminCleanerDetail | null>(null);
	const [loading, setLoading] = useState(true);

	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

	const fetchCleanerDetail = useCallback(async () => {
		if (!cleanerId) {
			setCleaner(null);
			setLoading(false);
			return;
		}

		setLoading(true);
		const result = await userService.getCleanerDetail(
			cleanerId,
			cleaningsSortField,
			cleaningsSortDirection,
		);

		if (result.error) {
			toast.error(result.error);
			setCleaner(null);
		} else {
			setCleaner(result.data as AdminCleanerDetail | null);
		}

		setLoading(false);
	}, [cleanerId, cleaningsSortField, cleaningsSortDirection]);

	const refresh = useCallback(async () => {
		await fetchCleanerDetail();
	}, [fetchCleanerDetail]);

	useEffect(() => {
		fetchCleanerDetail();
	}, [fetchCleanerDetail]);

	const cleanupChannel = useCallback(() => {
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
			channelRef.current = null;
		}
	}, []);

	useEffect(() => {
		if (import.meta.env.DEV) {
			return;
		}

		if (!cleanerId) {
			cleanupChannel();
			return;
		}

		cleanupChannel();

		const channel = supabase
			.channel(`admin-cleaner-detail-${cleanerId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'cleanings',
				},
				() => {
					fetchCleanerDetail();
				},
			)
			.subscribe();

		channelRef.current = channel;

		return () => {
			cleanupChannel();
		};
	}, [cleanerId, fetchCleanerDetail, cleanupChannel]);

	return { cleaner, loading, refresh };
}
