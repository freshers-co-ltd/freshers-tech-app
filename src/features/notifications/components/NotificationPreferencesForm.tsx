'use client';

import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { useNotifications } from '../useNotifications';

export function NotificationPreferencesForm() {
	const { preferences, fetchPreferences, updatePreferences } = useNotifications();
	const [enabled, setEnabled] = useState(true);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		fetchPreferences().finally(() => setIsLoading(false));
	}, [fetchPreferences]);

	useEffect(() => {
		if (preferences) {
			setEnabled(preferences.enabled ?? true);
		}
	}, [preferences]);

	const handleEnabledChange = async (checked: boolean) => {
		setEnabled(checked);
		setIsSaving(true);

		await updatePreferences({ enabled: checked });
		setIsSaving(false);
		toast.success(checked ? 'Notifications enabled' : 'Notifications disabled');
	};

	if (isLoading) {
		return <div className="text-sm text-muted-foreground">Loading preferences...</div>;
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between rounded-lg border p-4">
				<div className="flex gap-4">
					<Bell className="size-5 text-muted-foreground mt-0.5" />
					<div className="space-y-0.5">
						<p className="text-sm font-medium">Enable notifications</p>
						<p className="text-xs text-muted-foreground">
							Receive in-app notifications about your cleanings
						</p>
					</div>
				</div>
				<Switch checked={enabled} onCheckedChange={handleEnabledChange} disabled={isSaving} />
			</div>
		</div>
	);
}
