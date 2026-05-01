'use client';

import type { Database } from '@/lib/database.types';

export type NotificationType = Database['public']['Enums']['notification_type'];

export type Notification = Database['public']['Tables']['notifications']['Row'];

export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

export type NotificationPreferences =
	Database['public']['Tables']['notification_preferences']['Row'];

export interface NotificationData {
	cleaning_id?: string;
	property_id?: string;
	property_address?: string;
	cleaner_name?: string;
	host_name?: string;
	scheduled_date?: string;
	scheduled_time?: string;
	amount?: string;
	[key: string]: unknown;
}

export const NOTIFICATION_TYPES: Record<NotificationType, NotificationType> = {
	cleaning_requested: 'cleaning_requested',
	cleaning_confirmed: 'cleaning_confirmed',
	cleaning_started: 'cleaning_started',
	cleaning_completed: 'cleaning_completed',
	cleaning_cancelled: 'cleaning_cancelled',
	cleaning_assigned: 'cleaning_assigned',
	cleaning_reassigned: 'cleaning_reassigned',
	cleaning_updated: 'cleaning_updated',
	cleaning_reminder: 'cleaning_reminder',
	cleaning_starting_soon: 'cleaning_starting_soon',
	cleaning_missed_clockin: 'cleaning_missed_clockin',
};

export interface GetNotificationsOptions {
	limit?: number;
	offset?: number;
	unreadOnly?: boolean;
}
