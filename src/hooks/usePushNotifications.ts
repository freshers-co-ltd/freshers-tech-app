'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { authService } from '@/features/auth/authService';
import { pushSubscriptionsService } from '@/features/notifications/pushSubscriptionsService';
import type { Json } from '@/lib/database.types';

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
	const [isSupported, setIsSupported] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		const checkSupport = async () => {
			if (
				typeof window !== 'undefined' &&
				'PushManager' in window &&
				'serviceWorker' in navigator
			) {
				try {
					const registration = await navigator.serviceWorker.ready;
					setIsSupported('pushManager' in registration);
				} catch {
					setIsSupported(false);
				}
			} else {
				setIsSupported(false);
			}
		};
		checkSupport();
	}, []);

	const getPermissionState = useCallback((): PermissionState => {
		if (!isSupported) {
			return 'unsupported';
		}
		if (typeof Notification === 'undefined') {
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
		} catch {
			return 'denied';
		}
	}, [isSupported]);

	const subscribe = useCallback(
		async (userId: string): Promise<{ success: boolean; error: string | null }> => {
			if (isSubscribingRef.current) {
				return { success: false, error: null };
			}

			if (!isSupported) {
				return { success: false, error: 'Push notifications not supported' };
			}

			if (!pushConfig.vapidPublicKey) {
				return { success: false, error: 'VAPID public key not configured' };
			}

			isSubscribingRef.current = true;
			setIsLoading(true);
			try {
				const registration = await navigator.serviceWorker.ready;

				localStorage.setItem('vapidPublicKey', pushConfig.vapidPublicKey);

				const existingSub = await registration.pushManager.getSubscription();
				if (existingSub) {
					await existingSub.unsubscribe();
				}

				const subscription = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: pushConfig.vapidPublicKey,
				});

				const subscriptionJson = subscription.toJSON() as unknown as Json;

				await pushSubscriptionsService.deleteByUserId(userId);

				const { error } = await pushSubscriptionsService.insert(userId, subscriptionJson);

				if (error) {
					if (import.meta.env.DEV) {
						console.error('[Push] Error saving subscription:', error);
					}
					return { success: false, error };
				}

				return { success: true, error: null };
			} catch (err) {
				if (import.meta.env.DEV) {
					console.error('[Push] Error subscribing:', err);
				}
				const message = err instanceof Error ? err.message : 'Failed to subscribe';
				return { success: false, error: message };
			} finally {
				isSubscribingRef.current = false;
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
				const { error } = await pushSubscriptionsService.deleteByEndpoint(subscription.endpoint);
				if (error) {
					if (import.meta.env.DEV) {
						console.error('[Push] Error removing subscription:', error);
					}
				}
			}

			return { success: true, error: null };
		} catch (err) {
			if (import.meta.env.DEV) {
				console.error('[Push] Error unsubscribing:', err);
			}
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
			const { data, error } = await pushSubscriptionsService.hasSubscription(userId);

			if (error) {
				if (import.meta.env.DEV) {
					console.error('[Push] Error checking subscription:', error);
				}
				return false;
			}

			return data ?? false;
		} catch {
			if (import.meta.env.DEV) {
				console.error('[Push] Error checking subscription');
			}
			return false;
		}
	}, []);

	const validateSubscription = useCallback(async (userId: string): Promise<boolean> => {
		try {
			const registration = await navigator.serviceWorker.ready;
			const pushSubscription = await registration.pushManager.getSubscription();

			if (!pushSubscription) {
				if (import.meta.env.DEV) {
					console.log('[Push] No active subscription found, need to re-subscribe');
				}
				return false;
			}

			const { data: dbSub } = await pushSubscriptionsService.getByUserId(userId);

			if (!dbSub) {
				if (import.meta.env.DEV) {
					console.log('[Push] Subscription in DB not found, need to re-subscribe');
				}
				return false;
			}

			const dbEndpoint = (dbSub.subscription as { endpoint?: string })?.endpoint;
			const currentEndpoint = pushSubscription.endpoint;

			if (dbEndpoint !== currentEndpoint) {
				if (import.meta.env.DEV) {
					console.log('[Push] Endpoint mismatch, need to re-subscribe', {
						dbEndpoint,
						currentEndpoint,
					});
				}
				return false;
			}

			return true;
		} catch (err) {
			if (import.meta.env.DEV) {
				console.error('[Push] Error validating subscription:', err);
			}
			return false;
		}
	}, []);

	const lastReSubscribeRef = useRef(0);
	const isSubscribingRef = useRef(false);

	const autoReSubscribe = useCallback(
		async (userId: string): Promise<void> => {
			if (isSubscribingRef.current) {
				return;
			}

			const now = Date.now();
			if (now - lastReSubscribeRef.current < 30_000) {
				return;
			}

			const isValid = await validateSubscription(userId);

			if (!isValid) {
				lastReSubscribeRef.current = now;
				if (import.meta.env.DEV) {
					console.log('[Push] Auto re-subscribing due to invalid subscription');
				}
				await subscribe(userId);
			}
		},
		[subscribe, validateSubscription],
	);

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				const userId = authService.getCurrentUser().then(
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
