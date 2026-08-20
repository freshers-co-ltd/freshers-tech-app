'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import { useAuth } from '@/features/auth/AuthContext';
import { icalService } from '@/features/ical/icalService';
import type { CreateFeedPayload, DeleteFeedPayload, IcalFeed } from '@/features/ical/types';

const SYNC_POLL_INTERVAL_MS = 2000;
const MAX_SYNC_POLLS = 5;

export function useIcalFeeds(propertyId: string) {
	const { user } = useAuth();
	const [feeds, setFeeds] = useState<IcalFeed[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSyncingId, setIsSyncingId] = useState<string | null>(null);
	const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
	const fetchAbortRef = useRef<AbortController | null>(null);
	const pollAbortRef = useRef<AbortController | null>(null);

	const fetchFeeds = useCallback(
		async (signal?: AbortSignal): Promise<IcalFeed[]> => {
			if (!user) {
				setFeeds([]);
				setIsLoading(false);
				return [];
			}
			setIsLoading(true);
			const { data, error } = await icalService.getFeeds(signal);
			if (signal?.aborted) {
				return [];
			}
			if (error) {
				toast.error(error);
			} else if (data) {
				const filtered = data.filter((feed) => feed.property_id === propertyId);
				setFeeds(filtered);
				setIsLoading(false);
				return filtered;
			}
			setIsLoading(false);
			return [];
		},
		[user, propertyId],
	);

	useEffect(() => {
		fetchAbortRef.current?.abort();
		const controller = new AbortController();
		fetchAbortRef.current = controller;
		fetchFeeds(controller.signal);
		return () => {
			controller.abort();
		};
	}, [fetchFeeds]);

	useEffect(() => {
		return () => {
			pollAbortRef.current?.abort();
		};
	}, []);

	const waitForSync = useCallback(
		async (feedId: string, signal?: AbortSignal): Promise<void> => {
			for (let attempt = 0; attempt < MAX_SYNC_POLLS; attempt += 1) {
				await new Promise((resolve) => setTimeout(resolve, SYNC_POLL_INTERVAL_MS));
				if (signal?.aborted) {
					return;
				}
				const currentFeeds = await fetchFeeds(signal);
				const target = currentFeeds.find((feed) => feed.id === feedId);
				if (!target || target.last_synced_at) {
					return;
				}
			}
		},
		[fetchFeeds],
	);

	const beginSyncTracking = useCallback(
		(feedId: string) => {
			pollAbortRef.current?.abort();
			const controller = new AbortController();
			pollAbortRef.current = controller;
			setIsSyncingId(feedId);
			void waitForSync(feedId, controller.signal).finally(() => {
				setIsSyncingId((current) => (current === feedId ? null : current));
			});
		},
		[waitForSync],
	);

	const createFeed = useCallback(
		async (payload: CreateFeedPayload): Promise<{ success: boolean; data?: IcalFeed }> => {
			const { data, error } = await icalService.createFeed(payload);
			if (error) {
				toast.error(error);
				return { success: false };
			}
			if (data) {
				setFeeds((prev) => [data, ...prev]);
				toast.success(DICT.ICAL.CREATE.TOAST_SUCCESS);
				beginSyncTracking(data.id);
				return { success: true, data };
			}
			return { success: false };
		},
		[beginSyncTracking],
	);

	const deleteFeed = useCallback(
		async (payload: DeleteFeedPayload): Promise<{ success: boolean }> => {
			setIsDeletingId(payload.feedId);
			try {
				const { error } = await icalService.deleteFeed(payload);
				if (error) {
					toast.error(error);
					return { success: false };
				}
				setFeeds((prev) => prev.filter((feed) => feed.id !== payload.feedId));
				toast.success(DICT.ICAL.DELETE.TOAST_SUCCESS);
				return { success: true };
			} finally {
				setIsDeletingId(null);
			}
		},
		[],
	);

	const syncFeed = useCallback(
		async (feedId: string): Promise<{ success: boolean }> => {
			const { error } = await icalService.syncFeed(feedId);
			if (error) {
				toast.error(error);
				return { success: false };
			}
			toast.success(DICT.ICAL.TOAST_SYNC_STARTED);
			beginSyncTracking(feedId);
			return { success: true };
		},
		[beginSyncTracking],
	);

	return {
		feeds,
		isLoading,
		isSyncingId,
		isDeletingId,
		createFeed,
		deleteFeed,
		syncFeed,
	};
}
