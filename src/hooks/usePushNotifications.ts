'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Json } from '@/lib/database.types';
import { supabase } from '@/lib/supabaseClient';

const pushConfig = {
	vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY || '',
};

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePushNotificationsResult {
	isSupported: boolean;
	permissionState: PermissionState;
	isLoading: boolean;
	requestPermission: () => Promise<PermissionState>;
	subscribe: (userId: string) => Promise<{ success: boolean; error: string | null }>;
	unsubscribe: () => Promise<{ success: boolean; error: string | null }>;
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

				localStorage.setItem('vapidPublicKey', pushConfig.vapidPublicKey);

				const subscription = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: pushConfig.vapidPublicKey,
				});

				const subscriptionJson = subscription.toJSON() as unknown as Json;

				const { error } = await supabase.from('push_subscriptions').insert({
					user_id: userId,
					subscription: subscriptionJson,
				});

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

	const unsubscribe = useCallback(async (): Promise<{ success: boolean; error: string | null }> => {
		if (!isSupported) {
			return { success: false, error: 'Push notifications not supported' };
		}

		setIsLoading(true);
		try {
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.getSubscription();

			if (subscription) {
				await subscription.unsubscribe();
				const { error } = await supabase
					.from('push_subscriptions')
					.delete()
					.eq('endpoint', subscription.endpoint);
				if (error) {
					console.error('[Push] Error removing subscription:', error);
				}
			}

			return { success: true, error: null };
		} catch (err) {
			console.error('[Push] Error unsubscribing:', err);
			const message = err instanceof Error ? err.message : 'Failed to unsubscribe';
			return { success: false, error: message };
		} finally {
			setIsLoading(false);
		}
	}, [isSupported]);

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

	const validateSubscription = useCallback(async (userId: string): Promise<boolean> => {
		try {
			const registration = await navigator.serviceWorker.ready;
			const pushSubscription = await registration.pushManager.getSubscription();

			if (!pushSubscription) {
				console.log('[Push] No active subscription found, need to re-subscribe');
				return false;
			}

			const { data: dbSub } = await supabase
				.from('push_subscriptions')
				.select('subscription')
				.eq('user_id', userId)
				.maybeSingle();

			if (!dbSub) {
				console.log('[Push] Subscription in DB not found, need to re-subscribe');
				return false;
			}

			const dbEndpoint = (dbSub.subscription as { endpoint?: string })?.endpoint;
			const currentEndpoint = pushSubscription.endpoint;

			if (dbEndpoint !== currentEndpoint) {
				console.log('[Push] Endpoint mismatch, need to re-subscribe', {
					dbEndpoint,
					currentEndpoint,
				});
				return false;
			}

			console.log('[Push] Subscription is valid');
			return true;
		} catch (err) {
			console.error('[Push] Error validating subscription:', err);
			return false;
		}
	}, []);

	const autoReSubscribe = useCallback(
		async (userId: string): Promise<void> => {
			const isValid = await validateSubscription(userId);

			if (!isValid) {
				console.log('[Push] Auto re-subscribing due to invalid subscription');
				await subscribe(userId);
			}
		},
		[subscribe, validateSubscription],
	);

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				const userId = supabase.auth.getUser().then(
					({ data }) => data.user?.id,
					() => undefined,
				);
				userId.then((id) => {
					if (id && permissionState === 'granted') {
						autoReSubscribe(id);
					}
				});
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, [permissionState, autoReSubscribe]);

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
