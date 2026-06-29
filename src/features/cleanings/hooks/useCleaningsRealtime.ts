'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { Profile } from '@/features/auth/types';
import { supabase } from '@/lib/supabaseClient';

interface UseCleaningsRealtimeConfig {
	user: { id: string } | null;
	profile: Profile | null;
	onCleaningChange: () => void;
	enabled?: boolean;
}

export function useCleaningsRealtime({
	user,
	profile,
	onCleaningChange,
	enabled = true,
}: UseCleaningsRealtimeConfig) {
	const cleaningChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

	const cleanupChannel = useCallback(() => {
		if (cleaningChannelRef.current) {
			supabase.removeChannel(cleaningChannelRef.current);
			cleaningChannelRef.current = null;
		}
	}, []);

	const setupChannel = useCallback(() => {
		if (!user || !profile) {
			return;
		}

		if (cleaningChannelRef.current) {
			return;
		}

		if (import.meta.env.DEV) {
			return;
		}

		const isCleaner = profile.role === 'cleaner';
		const isHost = profile.role === 'host';

		if (!isCleaner && !isHost) {
			return;
		}

		const filter = isCleaner ? `cleaner_id=eq.${user.id}` : `host_id=eq.${user.id}`;

		const newChannel = supabase
			.channel('cleanings-realtime')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'cleanings',
					filter,
				},
				() => {
					onCleaningChange();
				},
			)
			.subscribe((status: string, err?: unknown) => {
				if (err && import.meta.env.PROD) {
					console.error('[Cleanings] Channel error', { status, error: err });
				}
			});

		cleaningChannelRef.current = newChannel;
	}, [user, profile, onCleaningChange]);

	const setupChannelRef = useRef(setupChannel);
	setupChannelRef.current = setupChannel;

	const cleanupChannelRef = useRef(cleanupChannel);
	cleanupChannelRef.current = cleanupChannel;

	const reconnect = useCallback(() => {
		cleanupChannelRef.current();
		setupChannelRef.current();
	}, []);

	const isChannelJoined = cleaningChannelRef.current?.state === 'joined';

	useEffect(() => {
		if (!enabled || !user || !profile?.role) {
			cleanupChannelRef.current();
			return;
		}

		setupChannelRef.current();

		return () => {
			cleanupChannelRef.current();
		};
	}, [enabled, user, profile?.role]);

	return {
		cleanupChannel: cleanupChannelRef.current,
		setupChannel: setupChannelRef.current,
		reconnect,
		isChannelJoined,
	};
}
