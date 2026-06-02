'use client';

import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Notification } from '../types';

interface UseNotificationRealtimeConfig {
	userId: string | undefined;
	onInsert: (notification: Notification) => void;
	onUpdate: (notification: Notification) => void;
	onConnectionChange?: (connected: boolean) => void;
}

export function useNotificationRealtime({
	userId,
	onInsert,
	onUpdate,
	onConnectionChange,
}: UseNotificationRealtimeConfig) {
	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
	const onInsertRef = useRef(onInsert);
	onInsertRef.current = onInsert;
	const onUpdateRef = useRef(onUpdate);
	onUpdateRef.current = onUpdate;
	const onConnectionChangeRef = useRef(onConnectionChange);
	onConnectionChangeRef.current = onConnectionChange;

	const cleanupChannel = useCallback(() => {
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
			channelRef.current = null;
		}
	}, []);

	const setupChannel = useCallback(() => {
		if (!userId || channelRef.current) {
			return;
		}

		const newChannel = supabase
			.channel('notifications-realtime')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'notifications',
					filter: `user_id=eq.${userId}`,
				},
				(payload: { new: Notification }) => {
					onInsertRef.current(payload.new);
				},
			)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'notifications',
					filter: `user_id=eq.${userId}`,
				},
				(payload: { new: Notification }) => {
					onUpdateRef.current(payload.new);
				},
			)
			.subscribe((status: string, err?: unknown) => {
				if (err) {
					console.error('[Notifications] Channel error', { status, error: err });
				}
				onConnectionChangeRef.current?.(status === 'SUBSCRIBED');
			});

		channelRef.current = newChannel;
	}, [userId]);

	const reconnect = useCallback(() => {
		cleanupChannel();
		setupChannel();
	}, [cleanupChannel, setupChannel]);

	useEffect(() => {
		if (!userId) {
			cleanupChannel();
			return;
		}

		setupChannel();

		return () => {
			cleanupChannel();
		};
	}, [userId, setupChannel, cleanupChannel]);

	return { reconnect };
}
