'use client';

import { Bell, CheckCheck } from 'lucide-react';
import { Loading } from '@/components/Loading';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DICT } from '@/dictionary';
import { NotificationList } from '@/features/notifications/components/NotificationList';
import { useNotifications } from '@/features/notifications/useNotifications';

export function NotificationsPage() {
	const { notifications, isLoading, markAllAsRead } = useNotifications();
	const dict = DICT.NOTIFICATIONS;

	if (isLoading) {
		return (
			<main className="max-width-container">
				<div className="flex items-center justify-center p-12">
					<Loading />
				</div>
			</main>
		);
	}

	return (
		<main className="max-width-container p-2 md:p-8">
			<div className="mb-6 flex flex-col gap-6 md:flex-row md:justify-between">
				<h1 className="text-3xl font-bold uppercase text-center md:text-left">{dict.PAGE.TITLE}</h1>
				{notifications.some((n) => !n.is_read) && (
					<Button variant="outline" size="sm" onClick={() => markAllAsRead()}>
						<CheckCheck className="size-4 mr-1" />
						{dict.PAGE.BUTTON_READ}
					</Button>
				)}
			</div>

			{notifications.length === 0 ? (
				<Card className="p-8 text-center">
					<Bell className="size-12 text-muted-foreground mx-auto mb-4" />
					<p className="text-muted-foreground">{dict.EMPTY}</p>
				</Card>
			) : (
				<Card className="p-4 md:p-6">
					<NotificationList />
				</Card>
			)}
		</main>
	);
}
