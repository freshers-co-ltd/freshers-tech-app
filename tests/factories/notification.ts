import type { Database } from '@/lib/database.types';

type NotificationType = Database['public']['Enums']['notification_type'];
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

export interface Notification {
	id: string;
	user_id: string;
	title: string;
	message: string;
	type: NotificationType;
	link: string | null;
	is_read: boolean | null;
	created_at: string;
	data: JsonValue | null;
}

export function buildNotification(overrides?: Partial<Notification>): Notification {
	return {
		id: 'notif_123',
		user_id: 'user_123',
		title: 'Test Notification',
		message: 'This is a test notification',
		type: 'cleaning_requested',
		link: '/cleanings',
		is_read: false,
		created_at: new Date().toISOString(),
		data: null,
		...overrides,
	};
}
