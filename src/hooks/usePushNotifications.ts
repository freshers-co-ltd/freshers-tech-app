'use client';

import { useCallback, useEffect, useState } from 'react';
import { pushConfig } from '@/config/push';
import { debugLog } from '@/debug/debugLog';
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
		debugLog.addLog({
			type: 'subscription',
			message: 'Requesting notification permission',
			data: { online: navigator.onLine, currentPermission: Notification.permission },
		});

		if (!isSupported) {
			return 'unsupported';
		}

		try {
			const permission = await Notification.requestPermission();
			debugLog.addLog({
				type: 'subscription',
				message: 'Permission request completed',
				data: { permission },
			});
			return permission as PermissionState;
		} catch (err) {
			console.error('[Push] Error requesting permission:', err);
			debugLog.addLog({
				type: 'error',
				message: 'Permission request failed',
				data: { error: String(err) },
			});
			return 'denied';
		}
	}, [isSupported]);

	const subscribe = useCallback(
		async (userId: string): Promise<{ success: boolean; error: string | null }> => {
			debugLog.addLog({
				type: 'subscription',
				message: 'Subscribing to push',
				data: { userId, online: navigator.onLine },
			});

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

				debugLog.addLog({
					type: 'subscription',
					message: 'Push subscription created',
					data: { endpoint: subscription.endpoint },
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
					debugLog.addLog({
						type: 'error',
						message: 'Failed to save subscription to database',
						data: { error: error.message },
					});
					return { success: false, error: error.message };
				}

				debugLog.addLog({
					type: 'subscription',
					message: 'Subscription saved to database',
					data: { userId },
				});

				return { success: true, error: null };
			} catch (err) {
				console.error('[Push] Error subscribing:', err);
				const message = err instanceof Error ? err.message : 'Failed to subscribe';
				debugLog.addLog({
					type: 'error',
					message: 'Subscribe failed',
					data: { error: message },
				});
				return { success: false, error: message };
			} finally {
				setIsLoading(false);
			}
		},
		[isSupported],
	);

	const unsubscribe = useCallback(
		async (userId: string): Promise<{ success: boolean; error: string | null }> => {
			debugLog.addLog({
				type: 'subscription',
				message: 'Unsubscribing from push',
				data: { userId },
			});

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
					debugLog.addLog({
						type: 'error',
						message: 'Failed to remove subscription from database',
						data: { error: error.message },
					});
					return { success: false, error: error.message };
				}

				debugLog.addLog({
					type: 'subscription',
					message: 'Unsubscribed successfully',
					data: { userId },
				});

				return { success: true, error: null };
			} catch (err) {
				console.error('[Push] Error unsubscribing:', err);
				const message = err instanceof Error ? err.message : 'Failed to unsubscribe';
				debugLog.addLog({
					type: 'error',
					message: 'Unsubscribe failed',
					data: { error: message },
				});
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

	const validateSubscription = useCallback(async (userId: string): Promise<boolean> => {
		debugLog.addLog({
			type: 'subscription',
			message: 'Validating subscription',
			data: { userId },
		});

		try {
			const registration = await navigator.serviceWorker.ready;
			const pushSubscription = await registration.pushManager.getSubscription();

			if (!pushSubscription) {
				console.log('[Push] No active subscription found, need to re-subscribe');
				debugLog.addLog({
					type: 'subscription',
					message: 'No active subscription found',
					data: { userId },
				});
				return false;
			}

			const { data: dbSub } = await supabase
				.from('push_subscriptions')
				.select('subscription')
				.eq('user_id', userId)
				.maybeSingle();

			if (!dbSub) {
				console.log('[Push] Subscription in DB not found, need to re-subscribe');
				debugLog.addLog({
					type: 'subscription',
					message: 'Subscription not found in database',
					data: { userId },
				});
				return false;
			}

			const dbEndpoint = (dbSub.subscription as { endpoint?: string })?.endpoint;
			const currentEndpoint = pushSubscription.endpoint;

			if (dbEndpoint !== currentEndpoint) {
				console.log('[Push] Endpoint mismatch, need to re-subscribe', {
					dbEndpoint,
					currentEndpoint,
				});
				debugLog.addLog({
					type: 'subscription',
					message: 'Endpoint mismatch',
					data: { userId, dbEndpoint, currentEndpoint },
				});
				return false;
			}

			console.log('[Push] Subscription is valid');
			debugLog.addLog({
				type: 'subscription',
				message: 'Subscription is valid',
				data: { userId },
			});
			return true;
		} catch (err) {
			console.error('[Push] Error validating subscription:', err);
			debugLog.addLog({
				type: 'error',
				message: 'Validate subscription failed',
				data: { error: String(err) },
			});
			return false;
		}
	}, []);

	const autoReSubscribe = useCallback(
		async (userId: string): Promise<void> => {
			const isValid = await validateSubscription(userId);
			debugLog.addLog({
				type: 'subscription',
				message: isValid ? 'Auto re-subscribe: not needed' : 'Auto re-subscribe: triggered',
				data: { userId, isValid },
			});

			if (!isValid) {
				console.log('[Push] Auto re-subscribing due to invalid subscription');
				await subscribe(userId);
			}
		},
		[subscribe, validateSubscription],
	);

	useEffect(() => {
		const handleVisibilityChange = () => {
			debugLog.addLog({
				type: 'visibility',
				message: `Visibility changed to: ${document.visibilityState}`,
				data: { visibilityState: document.visibilityState },
			});

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
