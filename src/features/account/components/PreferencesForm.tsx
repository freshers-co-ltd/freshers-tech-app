'use client';

import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { DICT } from '@/dictionary';
import { useNotifications } from '../../notifications/useNotifications';

export function NotificationPreferencesForm() {
	const { preferences, updatePreferences } = useNotifications();
	const dict = DICT.ACCOUNT;

	if (!preferences) {
		return <div className="text-sm text-muted-foreground">Loading preferences...</div>;
	}

	const handleEnabledChange = async (checked: boolean) => {
		await updatePreferences({ enabled: checked });
		toast.success(checked ? dict.TOASTS.NOTIFICATIONS_ENABLED : dict.TOASTS.NOTIFICATIONS_DISABLED);
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between rounded-lg border p-4">
				<div className="flex gap-4">
					<Bell className="size-5 text-muted-foreground mt-0.5" />
					<div className="space-y-0.5">
						<p className="text-sm font-medium">{dict.PREFERENCES.NOTIFICATIONS.TITLE}</p>
						<p className="text-xs text-muted-foreground">
							{dict.PREFERENCES.NOTIFICATIONS.SUBTITLE}
						</p>
					</div>
				</div>
				<Switch checked={preferences.enabled ?? true} onCheckedChange={handleEnabledChange} />
			</div>
		</div>
	);
}
