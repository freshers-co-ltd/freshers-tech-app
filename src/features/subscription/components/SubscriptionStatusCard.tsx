'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from '@/components/Toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DICT } from '@/dictionary';
import type { Profile } from '@/features/auth/types';
import { subscriptionService } from '@/features/subscription/services/subscriptionService';
import { getSubscriptionDisplayStatus } from '@/features/subscription/utils/subscriptionUtils';
import { formatDate } from '@/lib/utils';

interface SubscriptionStatusCardProps {
	profile: Profile;
	onStatusChange?: () => void;
}

function getBadgeClassName(color: 'green' | 'yellow' | 'red' | 'gray'): string {
	switch (color) {
		case 'green':
			return 'bg-green-background text-green border-green-border';
		case 'yellow':
			return 'bg-yellow-background text-yellow border-yellow-border';
		case 'red':
			return 'bg-red-background text-red border-red-border';
		case 'gray':
			return 'bg-gray-background text-gray border-gray-border';
	}
}

export function SubscriptionStatusCard({ profile, onStatusChange }: SubscriptionStatusCardProps) {
	const [submitting, setSubmitting] = useState(false);
	const [periodEnd, setPeriodEnd] = useState<string | null>(null);

	const status = profile.host_subscription_status;
	const display = getSubscriptionDisplayStatus(status);

	const isPortal = status === 'active' || status === 'past_due' || status === 'unpaid';
	const buttonLabel =
		status === 'active'
			? DICT.SUBSCRIPTION.MANAGE
			: status === 'past_due' || status === 'unpaid'
				? DICT.SUBSCRIPTION.PAYMENT_FAILED.BUTTON_UPDATE
				: status === 'incomplete'
					? DICT.SUBSCRIPTION.PENDING.BUTTON_SUBSCRIBE
					: status === null
						? DICT.SUBSCRIPTION.PENDING.BUTTON_SUBSCRIBE
						: DICT.SUBSCRIPTION.RESUBSCRIBE;

	useEffect(() => {
		if (status === 'active') {
			subscriptionService.getSubscriptionStatus().then(({ data }) => {
				if (data?.current_period_end) {
					setPeriodEnd(data.current_period_end);
				}
			});
		}
	}, [status]);

	const handleAction = async () => {
		setSubmitting(true);
		try {
			if (isPortal) {
				const { data, error } = await subscriptionService.createPortalSession();
				if (error) {
					toast.error(error);
					return;
				}
				if (data) {
					window.location.href = data;
				} else {
					toast.error(DICT.SUBSCRIPTION.CHECKOUT_ERROR);
				}
			} else {
				const { data, error } = await subscriptionService.createCheckoutSession();
				if (error) {
					toast.error(error);
					return;
				}
				if (data) {
					window.location.href = data;
				} else {
					toast.error(DICT.SUBSCRIPTION.CHECKOUT_ERROR);
				}
			}
		} catch {
			toast.error(DICT.SUBSCRIPTION.CHECKOUT_ERROR);
		} finally {
			setSubmitting(false);
			onStatusChange?.();
		}
	};

	return (
		<Card className="p-4">
			<CardContent className="px-2">
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<span className="text-sm text-muted-foreground">{DICT.SUBSCRIPTION.STATUS_LABEL}</span>
						{display && (
							<Badge variant="outline" className={`uppercase ${getBadgeClassName(display.color)}`}>
								{display.label}
							</Badge>
						)}
					</div>

					{status === 'active' && (
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">
								{DICT.SUBSCRIPTION.RENEWAL_DATE}
							</span>
							<span className="text-sm">{periodEnd ? formatDate(periodEnd) : 'Unknown'}</span>
						</div>
					)}

					{(status === 'past_due' || status === 'unpaid') && (
						<div className="rounded-md bg-yellow-background border border-yellow-border p-3">
							<p className="text-sm text-yellow">{DICT.SUBSCRIPTION.PAYMENT_FAILED.MESSAGE}</p>
						</div>
					)}

					<Button onClick={handleAction} disabled={submitting} variant="default" className="w-full">
						{submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
						{submitting ? DICT.SUBSCRIPTION.PROCESSING : buttonLabel}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
