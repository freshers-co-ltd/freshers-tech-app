'use client';

import { createContext, type ReactNode, useCallback, useEffect, useState } from 'react';
import { debugLog } from '@/debug/debugLog';
import { useAuth } from '@/features/auth/AuthContext';
import { useVisibilityReconnect } from '@/hooks/useVisibilityReconnect';
import { supabase } from '@/lib/supabaseClient';
import { notificationsService } from './notificationsService';
import type { Notification, NotificationPreferences } from './types';

export interface NotificationContextType {
	notifications: Notification[];
	unreadCount: number;
	isLoading: boolean;
	isConnected: boolean;
	preferences: NotificationPreferences | null;
	pushEnabled: boolean | null;
	fetchNotifications: () => Promise<void>;
	fetchUnreadCount: () => Promise<void>;
	fetchPreferences: () => Promise<void>;
	updatePreferences: (
		preferences: Partial<Pick<NotificationPreferences, 'enabled' | 'push_enabled'>>,
	) => Promise<void>;
	markAsRead: (id: string) => Promise<void>;
	markAllAsRead: () => Promise<void>;
	subscribe: () => void;
	unsubscribe: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [isConnected, setIsConnected] = useState(false);
	const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
	const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);

	const fetchNotifications = useCallback(async () => {
		if (!user) {
			setNotifications([]);
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		const { data, error } = await notificationsService.getNotifications(user.id, { limit: 20 });

		if (error) {
			setNotifications([]);
		} else if (data) {
			setNotifications(data);
		}

		setIsLoading(false);
	}, [user]);

	const fetchUnreadCount = useCallback(async () => {
		if (!user) {
			setUnreadCount(0);
			return;
		}

		const { count, error } = await notificationsService.getUnreadCount(user.id);

		if (!error) {
			setUnreadCount(count);
		}
	}, [user]);

	const fetchPreferences = useCallback(async () => {
		if (!user) {
			setPreferences(null);
			return;
		}

		const { data, error } = await notificationsService.getOrCreatePreferences(user.id);

		if (!error && data) {
			setPreferences(data as NotificationPreferences);
		}
	}, [user]);

	const updatePreferences = useCallback(
		async (prefs: Partial<Pick<NotificationPreferences, 'enabled' | 'push_enabled'>>) => {
			if (!user) {
				return;
			}

			const { success } = await notificationsService.updatePreferences(user.id, prefs);
			if (success) {
				setPreferences((prev) => (prev ? { ...prev, ...prefs } : null));
			}
		},
		[user],
	);

	const pushEnabled = preferences?.push_enabled ?? null;

	const updateBadge = useCallback((count: number) => {
		if ('setAppBadge' in navigator) {
			if (count > 0) {
				navigator
					.setAppBadge(count)
					.then(() => {
						debugLog.addLog({ type: 'notification', message: 'App badge set', data: { count } });
					})
					.catch((err) => {
						console.error('[Badge] Error setting badge:', err);
						debugLog.addLog({
							type: 'error',
							message: 'Badge set failed',
							data: { error: String(err), count },
						});
					});
			} else {
				navigator
					.clearAppBadge()
					.then(() => {
						debugLog.addLog({ type: 'notification', message: 'App badge cleared', data: {} });
					})
					.catch((err) => {
						console.error('[Badge] Error clearing badge:', err);
						debugLog.addLog({
							type: 'error',
							message: 'Badge clear failed',
							data: { error: String(err) },
						});
					});
			}
		}
	}, []);

	const markAsRead = useCallback(async (id: string) => {
		const { success } = await notificationsService.markAsRead(id);
		if (success) {
			setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
			setUnreadCount((prev) => Math.max(0, prev - 1));
		}
	}, []);

	const markAllAsRead = useCallback(async () => {
		if (!user) {
			return;
		}

		const { success } = await notificationsService.markAllAsRead(user.id);
		if (success) {
			setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
			setUnreadCount(0);
		}
	}, [user]);

	const subscribe = useCallback(() => {
		if (!user || channel) {
			return;
		}

		const newChannel = supabase
			.channel('notifications')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'notifications',
					filter: `user_id=eq.${user.id}`,
				},
				(payload: { new: Notification }) => {
					const newNotification = payload.new;
					debugLog.addLog({
						type: 'realtime',
						message: 'Notification INSERT received',
						data: { id: newNotification.id, type: newNotification.type },
					});
					setNotifications((prev) => [newNotification, ...prev]);
					setUnreadCount((prev) => prev + 1);
				},
			)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'notifications',
					filter: `user_id=eq.${user.id}`,
				},
				(payload: { new: Notification }) => {
					const updatedNotification = payload.new;
					debugLog.addLog({
						type: 'realtime',
						message: 'Notification UPDATE received',
						data: { id: updatedNotification.id, is_read: updatedNotification.is_read },
					});
					setNotifications((prev) =>
						prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n)),
					);
					if (updatedNotification.is_read) {
						setUnreadCount((prev) => Math.max(0, prev - 1));
					}
				},
			)
			.subscribe((status: string, err?: unknown) => {
				debugLog.addLog({
					type: 'realtime',
					message: `Notifications channel status: ${status}`,
					data: { status },
				});
				if (err) {
					debugLog.addLog({
						type: 'error',
						message: 'Notifications channel error',
						data: { error: String(err) },
					});
				}
				setIsConnected(status === 'SUBSCRIBED');
			});

		setChannel(newChannel);
	}, [user, channel]);

	const unsubscribe = useCallback(() => {
		if (channel) {
			supabase.removeChannel(channel);
			debugLog.addLog({
				type: 'realtime',
				message: 'Channel removed',
				data: { channel: 'notifications' },
			});
			setChannel(null);
			setIsConnected(false);
		}
	}, [channel]);

	useEffect(() => {
		if (user) {
			fetchNotifications();
			fetchUnreadCount();
			fetchPreferences();
			subscribe();
		}

		return () => {
			unsubscribe();
		};
	}, [user, fetchNotifications, fetchUnreadCount, fetchPreferences, subscribe, unsubscribe]);

	useEffect(() => {
		updateBadge(unreadCount);
	}, [unreadCount, updateBadge]);

	useEffect(() => {
		return () => {
			updateBadge(0);
		};
	}, [updateBadge]);

	useVisibilityReconnect({
		enabled: !!user,
		onVisible: async () => {
			await Promise.all([fetchNotifications(), fetchUnreadCount()]);
			if (!channel || channel.state !== 'joined') {
				subscribe();
			}
		},
	});

	return (
		<NotificationContext.Provider
			value={{
				notifications,
				unreadCount,
				isLoading,
				isConnected,
				preferences,
				pushEnabled,
				fetchNotifications,
				fetchUnreadCount,
				fetchPreferences,
				updatePreferences,
				markAsRead,
				markAllAsRead,
				subscribe,
				unsubscribe,
			}}>
			{children}
		</NotificationContext.Provider>
	);
}

export { NotificationContext };
