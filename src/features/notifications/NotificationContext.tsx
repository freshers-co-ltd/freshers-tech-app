'use client';

import { createContext, type ReactNode, useCallback, useEffect, useState } from 'react';
import { toast } from '@/components/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import { useNotificationRealtime } from './hooks/useNotificationRealtime';
import { notificationsService } from './notificationsService';
import type { Notification, NotificationPreferences } from './types';

export interface NotificationContextType {
	notifications: Notification[];
	unreadCount: number;
	isLoading: boolean;
	isConnected: boolean;
	preferences: NotificationPreferences | null;
	pushEnabled: boolean | null;
	fetchNotifications: (skipLoadingState?: boolean) => Promise<void>;
	fetchUnreadCount: () => Promise<void>;
	fetchPreferences: () => Promise<void>;
	updatePreferences: (
		preferences: Partial<Pick<NotificationPreferences, 'enabled' | 'push_enabled'>>,
	) => Promise<void>;
	markAsRead: (id: string) => Promise<void>;
	markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [isConnected, setIsConnected] = useState(false);
	const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

	useNotificationRealtime({
		userId: user?.id,
		onInsert: useCallback((notification: Notification) => {
			setNotifications((prev) => [notification, ...prev]);
			setUnreadCount((prev) => prev + 1);
		}, []),
		onUpdate: useCallback((notification: Notification) => {
			setNotifications((prev) => prev.map((n) => (n.id === notification.id ? notification : n)));
			if (notification.is_read) {
				setUnreadCount((prev) => Math.max(0, prev - 1));
			}
		}, []),
		onConnectionChange: useCallback((connected: boolean) => {
			setIsConnected(connected);
		}, []),
	});

	const fetchNotifications = useCallback(
		async (skipLoadingState = false) => {
			if (!user) {
				setNotifications([]);
				setIsLoading(false);
				return;
			}

			if (!skipLoadingState) {
				setIsLoading(true);
			}

			const { data, error } = await notificationsService.getNotifications(user.id, { limit: 20 });

			if (error) {
				toast.error(error);
				setNotifications([]);
			} else if (data) {
				setNotifications(data);
			}

			if (!skipLoadingState) {
				setIsLoading(false);
			}
		},
		[user],
	);

	const fetchUnreadCount = useCallback(async () => {
		if (!user) {
			setUnreadCount(0);
			return;
		}

		const { count, error } = await notificationsService.getUnreadCount(user.id);

		if (error) {
			toast.error(error);
		} else {
			setUnreadCount(count);
		}
	}, [user]);

	const fetchPreferences = useCallback(async () => {
		if (!user) {
			setPreferences(null);
			return;
		}

		const { data, error } = await notificationsService.getOrCreatePreferences();

		if (error) {
			toast.error(error);
		} else if (data) {
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

	useEffect(() => {
		if (user) {
			fetchNotifications();
			fetchUnreadCount();
			fetchPreferences();
		}
	}, [user, fetchNotifications, fetchUnreadCount, fetchPreferences]);

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
			}}>
			{children}
		</NotificationContext.Provider>
	);
}

export { NotificationContext };
