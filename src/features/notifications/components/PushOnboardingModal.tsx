'use client';

import { Bell, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { DICT } from '@/dictionary';
import { useAuth } from '@/features/auth/AuthContext';
import { useNotifications } from '@/features/notifications/useNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushOnboardingModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export function PushOnboardingModal({ isOpen, onOpenChange }: PushOnboardingModalProps) {
	const { user } = useAuth();
	const { updatePreferences } = useNotifications();
	const { isSupported, requestPermission, subscribe } = usePushNotifications();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const dict = DICT.NOTIFICATIONS.ONBOARDING;

	const handleEnable = async () => {
		if (!user) {
			return;
		}

		setError(null);
		setIsLoading(true);
		try {
			const permission = await requestPermission();

			if (permission === 'granted') {
				const { success, error: subError } = await subscribe(user.id);

				if (success) {
					await updatePreferences({ push_enabled: true });
					onOpenChange(false);
				} else {
					setError(subError || dict.ERROR_SUBSCRIBE_FAILED);
					console.error('[PushOnboarding] Failed to subscribe:', subError);
				}
			} else if (permission === 'denied') {
				await updatePreferences({ push_enabled: false });
				onOpenChange(false);
			} else {
				await updatePreferences({ push_enabled: false });
				onOpenChange(false);
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleDisable = async () => {
		if (!user) {
			return;
		}

		setError(null);
		try {
			await updatePreferences({ push_enabled: false });
			onOpenChange(false);
		} catch (err) {
			console.error('[PushOnboarding] Error updating preferences:', err);
		}
	};

	if (!isSupported) {
		return null;
	}

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md" showCloseButton={false}>
				<DialogHeader className="text-center">
					<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
						<Bell className="size-6 text-primary" />
					</div>
					<DialogTitle className="text-xl">{dict.TITLE}</DialogTitle>
					<DialogDescription className="mt-2">{dict.DESCRIPTION}</DialogDescription>
				</DialogHeader>

				<div className="space-y-3 text-sm text-muted-foreground">
					<div className="flex items-start gap-3">
						<div className="mt-0.5 size-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<span className="text-xs font-medium text-primary">1</span>
						</div>
						<p>{dict.FEATURE_1}</p>
					</div>
					<div className="flex items-start gap-3">
						<div className="mt-0.5 size-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<span className="text-xs font-medium text-primary">2</span>
						</div>
						<p>{dict.FEATURE_2}</p>
					</div>
					<div className="flex items-start gap-3">
						<div className="mt-0.5 size-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<span className="text-xs font-medium text-primary">3</span>
						</div>
						<p>{dict.FEATURE_3}</p>
					</div>
				</div>

				{error && (
					<div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
						<XCircle className="size-4 shrink-0" />
						<p>{error}</p>
					</div>
				)}

				<DialogFooter className="flex-row gap-2 sm:flex-col">
					<Button onClick={handleEnable} disabled={isLoading} className="w-full">
						{isLoading ? dict.ENABLING : dict.ENABLE_BUTTON}
					</Button>
					<Button variant="ghost" onClick={handleDisable} disabled={isLoading} className="w-full">
						{dict.SKIP_BUTTON}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
