'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { userService } from '@/features/admin/services/userService';
import type { AdminHostDetail } from '@/features/admin/types';
import { supabase } from '@/lib/supabaseClient';

interface UseHostDetailOptions {
	propertiesSortField?: string;
	propertiesSortDirection?: 'asc' | 'desc';
	cleaningsSortField?: string;
	cleaningsSortDirection?: 'asc' | 'desc';
}

interface UseHostDetailResult {
	host: AdminHostDetail | null;
	loading: boolean;
	refresh: () => Promise<void>;
}

export function useHostDetail(
	hostId: string | undefined,
	options: UseHostDetailOptions = {},
): UseHostDetailResult {
	const {
		propertiesSortField = 'created_at',
		propertiesSortDirection = 'desc',
		cleaningsSortField = 'created_at',
		cleaningsSortDirection = 'desc',
	} = options;

	const [host, setHost] = useState<AdminHostDetail | null>(null);
	const [loading, setLoading] = useState(true);

	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

	const fetchHostDetail = useCallback(
		async (skipLoadingState = false) => {
			if (!hostId) {
				setHost(null);
				if (!skipLoadingState) {
					setLoading(false);
				}
				return;
			}

			if (!skipLoadingState) {
				setLoading(true);
			}
			const result = await userService.getHostDetail(
				hostId,
				propertiesSortField,
				propertiesSortDirection,
				cleaningsSortField,
				cleaningsSortDirection,
			);

			if (result.error) {
				toast.error(result.error);
				setHost(null);
			} else {
				setHost(result.data as AdminHostDetail | null);
			}

			if (!skipLoadingState) {
				setLoading(false);
			}
		},
		[
			hostId,
			propertiesSortField,
			propertiesSortDirection,
			cleaningsSortField,
			cleaningsSortDirection,
		],
	);

	const refresh = useCallback(async () => {
		await fetchHostDetail();
	}, [fetchHostDetail]);

	useEffect(() => {
		fetchHostDetail();
	}, [fetchHostDetail]);

	const cleanupChannel = useCallback(() => {
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
			channelRef.current = null;
		}
	}, []);

	useEffect(() => {
		if (!hostId) {
			cleanupChannel();
			return;
		}

		cleanupChannel();

		const channel = supabase
			.channel(`admin-host-detail-${hostId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'cleanings',
					filter: `host_id=eq.${hostId}`,
				},
				() => {
					fetchHostDetail(true);
				},
			)
			.subscribe((status: string, err?: unknown) => {
				if (err && import.meta.env.PROD) {
					console.error('[Admin] Host detail channel error', { status, error: err });
				}
			});

		channelRef.current = channel;

		return () => {
			cleanupChannel();
		};
	}, [hostId, fetchHostDetail, cleanupChannel]);

	return { host, loading, refresh };
}
