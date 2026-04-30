'use client';

import { createContext, type ReactNode, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { notificationsService } from './notificationsService';
import type { Notification, NotificationPreferences } from './types';

export interface NotificationContextType {
	notifications: Notification[];
	unreadCount: number;
	isLoading: boolean;
	isConnected: boolean;
	preferences: NotificationPreferences | null;
	fetchNotifications: () => Promise<void>;
	fetchUnreadCount: () => Promise<void>;
	fetchPreferences: () => Promise<void>;
	updatePreferences: (
		preferences: Partial<Pick<NotificationPreferences, 'enabled'>>,
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
		async (prefs: Partial<Pick<NotificationPreferences, 'enabled'>>) => {
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
					setNotifications((prev) =>
						prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n)),
					);
					if (updatedNotification.is_read) {
						setUnreadCount((prev) => Math.max(0, prev - 1));
					}
				},
			)
			.subscribe((status: string) => {
				setIsConnected(status === 'SUBSCRIBED');
			});

		setChannel(newChannel);
	}, [user, channel]);

	const unsubscribe = useCallback(() => {
		if (channel) {
			supabase.removeChannel(channel);
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

	return (
		<NotificationContext.Provider
			value={{
				notifications,
				unreadCount,
				isLoading,
				isConnected,
				preferences,
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
