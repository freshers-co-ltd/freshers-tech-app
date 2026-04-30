'use client';

import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useNotifications } from '../useNotifications';
import { NotificationItem } from './NotificationItem';

interface NotificationDropdownProps {
	onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
	const navigate = useNavigate();
	const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();

	const handleViewAll = () => {
		onClose();
		navigate('/notifications');
	};

	return (
		<div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-background border rounded-lg shadow-lg z-50 overflow-hidden">
			<div className="flex items-center justify-between p-3 border-b">
				<div className="flex items-center gap-2">
					<Bell className="size-4" />
					<span className="font-semibold text-sm">
						Notifications
						{unreadCount > 0 && <span className="ml-1 text-muted-foreground">({unreadCount})</span>}
					</span>
				</div>
				{unreadCount > 0 && (
					<Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => markAllAsRead()}>
						<CheckCheck className="size-3 mr-1" />
						Mark all read
					</Button>
				)}
			</div>

			<div className="max-h-96 overflow-y-auto">
				{isLoading ? (
					<div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
				) : notifications.length === 0 ? (
					<div className="p-4 text-center text-muted-foreground text-sm">No notifications yet</div>
				) : (
					notifications
						.slice(0, 5)
						.map((notification) => (
							<NotificationItem
								key={notification.id}
								notification={notification}
								onMarkRead={markAsRead}
							/>
						))
				)}
			</div>

			{notifications.length > 0 && (
				<div className="p-2 border-t">
					<Button variant="outline" className="w-full text-sm" onClick={handleViewAll}>
						View all notifications
					</Button>
				</div>
			)}
		</div>
	);
}
