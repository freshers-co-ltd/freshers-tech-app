import { formatDistanceToNow } from 'date-fns';
import {
	BellRing,
	BrushCleaning,
	CalendarCheck,
	CalendarX,
	Clock,
	Sparkles,
	SquarePen,
	UserPen,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DICT } from '@/dictionary';
import type { Notification, NotificationType } from '@/features/notifications/types';
import { useNotifications } from '@/features/notifications/useNotifications';
import { cn } from '@/lib/utils';

interface NotificationListProps {
	maxItems?: number;
}

const getNotificationIcon = (type: NotificationType) => {
	switch (type) {
		case 'cleaning_requested':
			return <BellRing className="size-5 text-blue-500" />;
		case 'cleaning_confirmed':
			return <CalendarCheck className="size-5 text-green-500" />;
		case 'cleaning_started':
			return <BrushCleaning className="size-5 text-blue-500" />;
		case 'cleaning_completed':
			return <Sparkles className="size-5 text-yellow-400" />;
		case 'cleaning_cancelled':
			return <CalendarX className="size-5 text-red-500" />;
		case 'cleaning_assigned':
			return <BrushCleaning className="size-5 text-blue-500" />;
		case 'cleaning_reassigned':
			return <UserPen className="size-5 text-yellow-500" />;
		case 'cleaning_updated':
			return <SquarePen className="size-5 text-yellow-400" />;
		default:
			return <Clock className="size-5 text-muted-foreground" />;
	}
};

export function NotificationList({ maxItems }: NotificationListProps) {
	const navigate = useNavigate();
	const { notifications, isLoading, markAsRead } = useNotifications();

	const handleClick = (notification: Notification) => {
		if (!notification.is_read) {
			markAsRead(notification.id);
		}
		if (notification.link) {
			navigate(notification.link);
		}
	};

	const displayNotifications = maxItems ? notifications.slice(0, maxItems) : notifications;

	if (isLoading) {
		return (
			<div className="py-6 text-center text-muted-foreground text-sm">
				{DICT.COMMON.LOADING.MESSAGE}
			</div>
		);
	}

	if (notifications.length === 0) {
		return (
			<div className="py-6 text-center text-muted-foreground text-sm">
				{DICT.NOTIFICATIONS.EMPTY}
			</div>
		);
	}

	return (
		<div className="flex flex-col -my-1">
			{displayNotifications.map((notification) => (
				<button
					type="button"
					key={notification.id}
					className={cn(
						'w-full text-left py-1 px-2 mb-1 rounded-lg cursor-pointer bg-primary/2 hover:bg-primary/10 transition-colors',
						!notification.is_read && 'bg-primary/5',
					)}
					onClick={() => handleClick(notification)}>
					<div className="flex items-start gap-3 overflow-hidden">
						<div className="mt-0.5 shrink-0">{getNotificationIcon(notification.type)}</div>
						<div className="flex-1 min-w-0 flex flex-col">
							<div className="flex justify-between items-start gap-2">
								<p
									className={cn(
										'text-sm truncate leading-snug',
										!notification.is_read && 'font-semibold',
									)}>
									{notification.title}
								</p>
								{!notification.is_read && (
									<div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
								)}
							</div>
							<p className="text-xs text-muted-foreground whitespace-normal break-words">
								{notification.message}
							</p>
							<div className="flex justify-end mt-1">
								<p className="text-[10px] text-muted-foreground whitespace-nowrap">
									{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
								</p>
							</div>
						</div>
					</div>
				</button>
			))}
		</div>
	);
}
