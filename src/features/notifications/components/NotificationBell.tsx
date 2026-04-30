'use client';

import { Bell } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '../useNotifications';
import { NotificationDropdown } from './NotificationDropdown';

export function NotificationBell() {
	const { unreadCount } = useNotifications();
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="relative">
			<Button
				variant="ghost"
				size="icon"
				className="relative"
				onClick={() => setIsOpen(!isOpen)}
				aria-label="Notifications">
				<Bell className="size-5" />
				{unreadCount > 0 && (
					<span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-destructive rounded-full px-1">
						{unreadCount > 99 ? '99+' : unreadCount}
					</span>
				)}
			</Button>
			{isOpen && <NotificationDropdown onClose={() => setIsOpen(false)} />}
		</div>
	);
}
