'use client';

import { Bell, BellOff } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/components/Toast';
import { Switch } from '@/components/ui/switch';
import { DICT } from '@/dictionary';
import { useAuth } from '@/features/auth/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNotifications } from '../../notifications/useNotifications';

export function NotificationPreferencesForm() {
	const { preferences, updatePreferences } = useNotifications();
	const { user } = useAuth();
	const {
		isSupported,
		permissionState,
		requestPermission,
		subscribe,
		unsubscribe,
		hasSubscription,
	} = usePushNotifications();
	const [isLoading, setIsLoading] = useState(false);
	const dict = DICT.ACCOUNT.PREFERENCES;

	if (!preferences) {
		return <div className="text-sm text-muted-foreground">Loading preferences...</div>;
	}

	const handlePushEnabledChange = async (checked: boolean) => {
		if (!user) {
			return;
		}

		setIsLoading(true);
		try {
			if (checked) {
				if (permissionState === 'granted') {
					const subExists = await hasSubscription(user.id);
					if (!subExists) {
						const { success } = await subscribe(user.id);
						if (!success) {
							toast.error(dict.TOAST_ERROR);
							setIsLoading(false);
							return;
						}
					}
					await updatePreferences({ push_enabled: true });
					toast.success(dict.TOAST_ENABLED);
				} else if (permissionState === 'default') {
					const permission = await requestPermission();
					if (permission === 'granted') {
						const { success } = await subscribe(user.id);
						if (!success) {
							toast.error(dict.TOAST_ERROR);
							setIsLoading(false);
							return;
						}
						await updatePreferences({ push_enabled: true });
						toast.success(dict.TOAST_ENABLED);
					} else {
						toast.error(dict.TOAST_DENIED);
					}
				} else {
					toast.error(dict.TOAST_BLOCKED);
				}
			} else {
				await unsubscribe();
				await updatePreferences({ push_enabled: false });
				toast.success(dict.TOAST_DISABLED);
			}
		} finally {
			setIsLoading(false);
		}
	};

	const isPushEnabled = preferences.push_enabled === true;
	const isToggleDisabled = permissionState === 'denied' || isLoading;

	return (
		<div className="space-y-4">
			{isSupported && (
				<div className="flex items-center justify-between rounded-lg border p-4">
					<div className="flex gap-4">
						{isPushEnabled ? (
							<Bell className="size-5 text-muted-foreground mt-0.5" />
						) : (
							<BellOff className="size-5 text-muted-foreground mt-0.5" />
						)}
						<div className="space-y-0.5">
							<p className="text-sm font-medium">{dict.PUSH_NOTIFICATIONS.TITLE}</p>
							<p className="text-xs text-muted-foreground">{dict.PUSH_NOTIFICATIONS.SUBTITLE}</p>
						</div>
					</div>
					<Switch
						checked={isPushEnabled}
						onCheckedChange={handlePushEnabledChange}
						disabled={isToggleDisabled}
					/>
				</div>
			)}

			{!isSupported && (
				<div className="rounded-lg border p-4 text-sm text-muted-foreground">
					{dict.PUSH_NOTIFICATIONS.NOT_SUPPORTED}
				</div>
			)}
		</div>
	);
}
