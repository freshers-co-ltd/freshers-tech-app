'use client';

import { Bell } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/components/Toast';
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
	onAction?: () => void;
}

export function PushOnboardingModal({ isOpen, onOpenChange, onAction }: PushOnboardingModalProps) {
	const { user } = useAuth();
	const { updatePreferences } = useNotifications();
	const { isSupported, requestPermission, subscribe } = usePushNotifications();
	const [isLoading, setIsLoading] = useState(false);

	const dict = DICT.NOTIFICATIONS.ONBOARDING;

	const handleEnable = async () => {
		if (!user) {
			return;
		}

		setIsLoading(true);
		try {
			const permission = await requestPermission();

			if (permission === 'granted') {
				const { success, error: subError } = await subscribe(user.id);

				if (success) {
					await updatePreferences({ push_enabled: true });
					onAction?.();
					toast.success(dict.MESSAGE_SUCCESS);
					onOpenChange(false);
				} else {
					toast.error(subError || dict.MESSAGE_ERROR);
				}
			} else if (permission === 'denied') {
				onAction?.();
				toast.error(dict.MESSAGE_BLOCKED);
				await updatePreferences({ push_enabled: false });
				onOpenChange(false);
			} else {
				onAction?.();
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

		try {
			await updatePreferences({ push_enabled: false });
			onAction?.();
			onOpenChange(false);
		} catch (err) {
			const message = err instanceof Error ? err.message : DICT.ERRORS.COMMON.GENERIC;
			toast.error(message);
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
					<DialogDescription className="mt-2">{dict.MESSAGE}</DialogDescription>
				</DialogHeader>

				<DialogFooter className="gap-2 flex-col">
					<Button onClick={handleEnable} disabled={isLoading} className="w-full">
						{isLoading ? dict.BUTTON_SUBMITTING : dict.BUTTON_SUBMIT}
					</Button>
					<Button variant="outline" onClick={handleDisable} disabled={isLoading} className="w-full">
						{dict.BUTTON_CANCEL}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
