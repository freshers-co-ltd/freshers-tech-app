'use client';

import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, Clock, Home, Sparkles, User, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '../types';

interface NotificationItemProps {
	notification: Notification;
	onMarkRead: (id: string) => void;
}

const getNotificationIcon = (type: NotificationType) => {
	switch (type) {
		case 'cleaning_requested':
			return <Home className="size-5 text-blue-500" />;
		case 'cleaning_confirmed':
			return <CheckCircle2 className="size-5 text-green-500" />;
		case 'cleaning_started':
			return <Sparkles className="size-5 text-orange-500" />;
		case 'cleaning_completed':
			return <CheckCircle2 className="size-5 text-green-600" />;
		case 'cleaning_cancelled':
			return <XCircle className="size-5 text-red-500" />;
		case 'cleaning_assigned':
			return <User className="size-5 text-purple-500" />;
		case 'cleaning_reassigned':
			return <User className="size-5 text-yellow-500" />;
		default:
			return <Clock className="size-5 text-muted-foreground" />;
	}
};

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
	const navigate = useNavigate();

	const handleClick = () => {
		if (!notification.is_read) {
			onMarkRead(notification.id);
		}
		if (notification.link) {
			navigate(notification.link);
		}
	};

	const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

	return (
		<button
			type="button"
			className={cn(
				'w-full flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors',
				!notification.is_read && 'bg-muted/30',
			)}
			onClick={handleClick}>
			<div className="mt-0.5 shrink-0">{getNotificationIcon(notification.type)}</div>
			<div className="flex-1 min-w-0">
				<p className={cn('text-sm', !notification.is_read && 'font-semibold')}>
					{notification.title}
				</p>
				<p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.message}</p>
				<p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
			</div>
			{!notification.is_read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
		</button>
	);
}
