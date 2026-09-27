import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotificationRealtime } from '@/features/notifications/hooks/useNotificationRealtime';
import type { Notification } from '@/features/notifications/types';
import { buildNotification } from '~/factories/notification';

const { realtimeHandlers } = vi.hoisted(() => ({
	realtimeHandlers: [] as {
		event: string;
		handler: (payload: { new?: unknown; old?: unknown }) => void;
	}[],
}));

vi.mock('@/lib/supabaseClient', () => {
	const channelApi = {
		on(
			_kind: string,
			config: { event: string },
			handler: (payload: { new?: unknown; old?: unknown }) => void,
		) {
			realtimeHandlers.push({ event: config.event, handler });
			return channelApi;
		},
		subscribe(callback?: (status: string) => void) {
			callback?.('SUBSCRIBED');
			return { unsubscribe: () => {} };
		},
	};
	return {
		supabase: {
			channel: () => channelApi,
			removeChannel: () => {},
		},
	};
});

function Harness({
	onInsert,
	onUpdate,
	onDelete,
}: {
	onInsert: (notification: Notification) => void;
	onUpdate: (notification: Notification) => void;
	onDelete: (notificationId: string, wasUnread: boolean) => void;
}) {
	useNotificationRealtime({
		userId: 'user_123',
		onInsert,
		onUpdate,
		onDelete,
	});
	return null;
}

describe('useNotificationRealtime', () => {
	beforeEach(() => {
		realtimeHandlers.length = 0;
	});

	it('forwards delete events with unread state', async () => {
		const onInsert = vi.fn();
		const onUpdate = vi.fn();
		const onDelete = vi.fn();
		render(<Harness onInsert={onInsert} onUpdate={onUpdate} onDelete={onDelete} />);

		await waitFor(() => {
			expect(realtimeHandlers.some((entry) => entry.event === 'DELETE')).toBe(true);
		});

		const deleteHandler = realtimeHandlers.find((entry) => entry.event === 'DELETE');
		expect(deleteHandler).toBeDefined();
		deleteHandler?.handler({ old: { id: 'notif_1', is_read: false } });
		deleteHandler?.handler({ old: { id: 'notif_2', is_read: true } });

		expect(onDelete).toHaveBeenCalledWith('notif_1', true);
		expect(onDelete).toHaveBeenCalledWith('notif_2', false);
	});

	it('still forwards insert events', async () => {
		const onInsert = vi.fn();
		const onUpdate = vi.fn();
		const onDelete = vi.fn();
		render(<Harness onInsert={onInsert} onUpdate={onUpdate} onDelete={onDelete} />);

		await waitFor(() => {
			expect(realtimeHandlers.some((entry) => entry.event === 'INSERT')).toBe(true);
		});

		const notification = buildNotification({ id: 'notif_3' });
		realtimeHandlers.find((entry) => entry.event === 'INSERT')?.handler({ new: notification });
		expect(onInsert).toHaveBeenCalledWith(notification);
	});
});
