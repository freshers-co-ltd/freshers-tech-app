'use client';

import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNotifications } from '@/features/notifications/useNotifications';

export function NotificationsPage() {
	const navigate = useNavigate();
	const { notifications, isLoading, markAsRead, markAllAsRead } = useNotifications();

	if (isLoading) {
		return (
			<main className="max-width-container">
				<div className="flex items-center justify-center p-12">
					<span className="text-muted-foreground">Loading notifications...</span>
				</div>
			</main>
		);
	}

	return (
		<main className="max-width-container">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">Notifications</h1>
				{notifications.some((n) => !n.is_read) && (
					<Button variant="outline" size="sm" onClick={() => markAllAsRead()}>
						<CheckCheck className="size-4 mr-2" />
						Mark all as read
					</Button>
				)}
			</div>

			{notifications.length === 0 ? (
				<Card className="p-8 text-center">
					<Bell className="size-12 text-muted-foreground mx-auto mb-4" />
					<p className="text-muted-foreground">No notifications yet</p>
				</Card>
			) : (
				<Card>
					<div className="divide-y divide-border">
						{notifications.map((notification) => (
							<button
								type="button"
								key={notification.id}
								className={`w-full text-left p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
									!notification.is_read ? 'bg-muted/30' : ''
								}`}
								onClick={() => {
									if (!notification.is_read) {
										markAsRead(notification.id);
									}
									if (notification.link) {
										navigate(notification.link);
									}
								}}>
								<div className="flex items-start gap-4">
									<div className="flex-1 min-w-0">
										<p className={`text-sm ${!notification.is_read ? 'font-semibold' : ''}`}>
											{notification.title}
										</p>
										<p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
										<p className="text-xs text-muted-foreground mt-2">
											{new Date(notification.created_at).toLocaleString()}
										</p>
									</div>
									{!notification.is_read && (
										<div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
									)}
								</div>
							</button>
						))}
					</div>
				</Card>
			)}
		</main>
	);
}
