'use client';

import { type ActionResult, mapDatabaseError } from '@/lib/serviceUtils';
import { supabase } from '@/lib/supabaseClient';
import type { Notification, NotificationPreferences } from './types';

export const notificationsService = {
	async getNotifications(
		userId: string,
		options?: {
			limit?: number;
			offset?: number;
			unreadOnly?: boolean;
		},
	): Promise<ActionResult<Notification[]>> {
		const { limit = 20, offset = 0, unreadOnly = false } = options ?? {};

		let query = supabase
			.from('notifications')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (unreadOnly) {
			query = query.eq('is_read', false);
		}

		const { data, error } = await query;

		if (error) {
			console.error('[Notifications] Error fetching notifications:', error);
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: data ?? [], error: null };
	},

	async getUnreadCount(userId: string): Promise<{ count: number; error: string | null }> {
		const { count, error } = await supabase
			.from('notifications')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', userId)
			.eq('is_read', false);

		if (error) {
			console.error('[Notifications] Error fetching unread count:', error);
			return { count: 0, error: mapDatabaseError(error) };
		}

		return { count: count ?? 0, error: null };
	},

	async markAsRead(notificationId: string): Promise<{ success: boolean; error: string | null }> {
		const { error } = await supabase
			.from('notifications')
			.update({ is_read: true })
			.eq('id', notificationId);

		if (error) {
			console.error('[Notifications] Error marking as read:', error);
			return { success: false, error: mapDatabaseError(error) };
		}

		return { success: true, error: null };
	},

	async markAllAsRead(userId: string): Promise<{ success: boolean; error: string | null }> {
		const { error } = await supabase
			.from('notifications')
			.update({ is_read: true })
			.eq('user_id', userId)
			.eq('is_read', false);

		if (error) {
			console.error('[Notifications] Error marking all as read:', error);
			return { success: false, error: mapDatabaseError(error) };
		}

		return { success: true, error: null };
	},

	async deleteNotification(
		notificationId: string,
	): Promise<{ success: boolean; error: string | null }> {
		const { error } = await supabase.from('notifications').delete().eq('id', notificationId);

		if (error) {
			console.error('[Notifications] Error deleting notification:', error);
			return { success: false, error: mapDatabaseError(error) };
		}

		return { success: true, error: null };
	},

	async getPreferences(userId: string): Promise<ActionResult<NotificationPreferences>> {
		const { data, error } = await supabase
			.from('notification_preferences')
			.select('*')
			.eq('user_id', userId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return { data: null, error: null };
			}
			console.error('[Notifications] Error fetching preferences:', error);
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: data ?? null, error: null };
	},

	async getOrCreatePreferences(): Promise<ActionResult<NotificationPreferences>> {
		const { data, error } = await supabase.rpc('get_or_create_notification_preferences');

		if (error) {
			console.error('[Notifications] Error getting preferences:', error);
			return { data: null, error: mapDatabaseError(error) };
		}

		const userId = data;
		if (!userId || typeof userId !== 'string') {
			return { data: null, error: null };
		}

		const { data: prefs, error: fetchError } = await supabase
			.from('notification_preferences')
			.select('*')
			.eq('user_id', userId)
			.single();

		if (fetchError || !prefs) {
			return { data: null, error: mapDatabaseError(fetchError) };
		}

		return { data: prefs, error: null };
	},

	async updatePreferences(
		userId: string,
		preferences: Partial<Pick<NotificationPreferences, 'enabled' | 'push_enabled'>>,
	): Promise<{ success: boolean; error: string | null }> {
		const { error } = await supabase
			.from('notification_preferences')
			.update({
				...preferences,
				updated_at: new Date().toISOString(),
			})
			.eq('user_id', userId);

		if (error) {
			console.error('[Notifications] Error updating preferences:', error);
			return { success: false, error: mapDatabaseError(error) };
		}

		return { success: true, error: null };
	},

	async shouldSendNotification(
		userId: string,
	): Promise<{ shouldSend: boolean; error: string | null }> {
		const { data: preferences, error } = await this.getPreferences(userId);

		if (error || !preferences) {
			return { shouldSend: true, error: null };
		}

		if (preferences.enabled === false) {
			return { shouldSend: false, error: null };
		}

		return { shouldSend: true, error: null };
	},
};
