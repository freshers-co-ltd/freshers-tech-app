import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DICT } from '@/dictionary';
import { useAuth } from '@/features/auth/AuthContext';
import { NotificationList } from '@/features/notifications/components/NotificationList';

interface NotificationsCardProps {
	maxItems?: number;
}

export function NotificationsCard({ maxItems = 4 }: NotificationsCardProps) {
	const { profile } = useAuth();
	const dict = DICT.NOTIFICATIONS.CARD;

	return (
		<Card className="p-4 md:p-5 gap-2">
			<div className="flex items-center justify-between">
				<h2 className="text-lg md:text-xl font-bold uppercase">{dict.TITLE}</h2>
				<Button variant="link" className="px-0 font-bold h-auto" asChild>
					<Link to={`/${profile?.role}/notifications`}>{dict.BUTTON_VIEW_ALL}</Link>
				</Button>
			</div>
			<NotificationList maxItems={maxItems} />
		</Card>
	);
}
