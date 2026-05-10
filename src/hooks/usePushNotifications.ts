'use client';

import { useCallback, useState } from 'react';
import { pushConfig } from '@/config/push';
import type { Json } from '@/lib/database.types';
import { supabase } from '@/lib/supabaseClient';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePushNotificationsResult {
	isSupported: boolean;
	permissionState: PermissionState;
	isLoading: boolean;
	requestPermission: () => Promise<PermissionState>;
	subscribe: (userId: string) => Promise<{ success: boolean; error: string | null }>;
	unsubscribe: (userId: string) => Promise<{ success: boolean; error: string | null }>;
	hasSubscription: (userId: string) => Promise<boolean>;
}

export function usePushNotifications(): UsePushNotificationsResult {
	const [isLoading, setIsLoading] = useState(false);

	const isSupported =
		typeof window !== 'undefined' && 'PushManager' in window && 'serviceWorker' in navigator;

	const getPermissionState = useCallback((): PermissionState => {
		if (!isSupported) {
			return 'unsupported';
		}
		return Notification.permission as PermissionState;
	}, [isSupported]);

	const permissionState = getPermissionState();

	const requestPermission = useCallback(async (): Promise<PermissionState> => {
		if (!isSupported) {
			return 'unsupported';
		}

		try {
			const permission = await Notification.requestPermission();
			return permission as PermissionState;
		} catch (err) {
			console.error('[Push] Error requesting permission:', err);
			return 'denied';
		}
	}, [isSupported]);

	const subscribe = useCallback(
		async (userId: string): Promise<{ success: boolean; error: string | null }> => {
			if (!isSupported) {
				return { success: false, error: 'Push notifications not supported' };
			}

			if (!pushConfig.vapidPublicKey) {
				return { success: false, error: 'VAPID public key not configured' };
			}

			setIsLoading(true);
			try {
				const registration = await navigator.serviceWorker.ready;

				const existingSubscription = await registration.pushManager.getSubscription();

				if (existingSubscription) {
					await existingSubscription.unsubscribe();
				}

				localStorage.setItem('vapidPublicKey', pushConfig.vapidPublicKey);

				const subscription = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: pushConfig.vapidPublicKey,
				});

				const subscriptionJson = subscription.toJSON() as unknown as Json;

				const { error } = await supabase.from('push_subscriptions').upsert(
					{
						user_id: userId,
						subscription: subscriptionJson,
					},
					{
						onConflict: 'user_id',
					},
				);

				if (error) {
					console.error('[Push] Error saving subscription:', error);
					return { success: false, error: error.message };
				}

				return { success: true, error: null };
			} catch (err) {
				console.error('[Push] Error subscribing:', err);
				const message = err instanceof Error ? err.message : 'Failed to subscribe';
				return { success: false, error: message };
			} finally {
				setIsLoading(false);
			}
		},
		[isSupported],
	);

	const unsubscribe = useCallback(
		async (userId: string): Promise<{ success: boolean; error: string | null }> => {
			if (!isSupported) {
				return { success: false, error: 'Push notifications not supported' };
			}

			setIsLoading(true);
			try {
				const registration = await navigator.serviceWorker.ready;
				const subscription = await registration.pushManager.getSubscription();

				if (subscription) {
					await subscription.unsubscribe();
				}

				const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', userId);

				if (error) {
					console.error('[Push] Error removing subscription:', error);
					return { success: false, error: error.message };
				}

				return { success: true, error: null };
			} catch (err) {
				console.error('[Push] Error unsubscribing:', err);
				const message = err instanceof Error ? err.message : 'Failed to unsubscribe';
				return { success: false, error: message };
			} finally {
				setIsLoading(false);
			}
		},
		[isSupported],
	);

	const hasSubscription = useCallback(async (userId: string): Promise<boolean> => {
		if (!userId) {
			return false;
		}

		try {
			const { data, error } = await supabase
				.from('push_subscriptions')
				.select('id')
				.eq('user_id', userId)
				.maybeSingle();

			if (error) {
				console.error('[Push] Error checking subscription:', error);
				return false;
			}

			return !!data;
		} catch {
			return false;
		}
	}, []);

	return {
		isSupported,
		permissionState,
		isLoading,
		requestPermission,
		subscribe,
		unsubscribe,
		hasSubscription,
	};
}
