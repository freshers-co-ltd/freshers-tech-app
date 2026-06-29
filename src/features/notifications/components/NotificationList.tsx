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
			return <BellRing className="size-5 text-primary-light" />;
		case 'cleaning_confirmed':
			return <CalendarCheck className="size-5 text-success" />;
		case 'cleaning_started':
			return <BrushCleaning className="size-5 text-primary-light" />;
		case 'cleaning_completed':
			return <Sparkles className="size-5 text-warning-light" />;
		case 'cleaning_cancelled':
			return <CalendarX className="size-5 text-destructive-light" />;
		case 'cleaning_assigned':
			return <BrushCleaning className="size-5 text-primary-light" />;
		case 'cleaning_reassigned':
			return <UserPen className="size-5 text-warning-light" />;
		case 'cleaning_updated':
			return <SquarePen className="size-5 text-warning-light" />;
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
						'w-full text-left py-1.5 px-2.5 rounded-lg cursor-pointer mb-1 last:mb-0 bg-primary/2 hover:bg-primary/10 transition-colors',
						!notification.is_read && 'bg-primary/5',
					)}
					onClick={() => handleClick(notification)}>
					<div className="flex flex-col overflow-hidden">
						<div className="flex w-full gap-2 mb-0.5">
							<div className="mt-0.5 shrink-0">{getNotificationIcon(notification.type)}</div>
							<p className="text-sm font-semibold leading-snug truncate self-end flex-1 min-w-0">
								{notification.title}
							</p>
							{!notification.is_read && (
								<div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0 justify-self-end" />
							)}
						</div>
						<p className="text-xs whitespace-normal wrap-break-word">{notification.message}</p>
						<p className="self-end text-[10px] text-muted-foreground">
							{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
						</p>
					</div>
				</button>
			))}
		</div>
	);
}
