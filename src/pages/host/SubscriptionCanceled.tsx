'use client';

import { useState } from 'react';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { DICT } from '@/dictionary';
import { subscriptionService } from '@/features/subscription/services/subscriptionService';

export function SubscriptionCanceledPage() {
	const [submitting, setSubmitting] = useState(false);

	const handleRetry = async () => {
		setSubmitting(true);
		try {
			const { data, error: err } = await subscriptionService.createCheckoutSession();
			if (err) {
				toast.error(err);
				return;
			}
			if (data) {
				window.location.href = data;
			} else {
				toast.error(DICT.SUBSCRIPTION.CHECKOUT_ERROR);
			}
		} catch {
			toast.error(DICT.SUBSCRIPTION.CHECKOUT_ERROR);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<main className="max-width-container p-2 md:p-8 flex items-center justify-center min-h-[80vh]">
			<div className="max-w-md w-full space-y-10 text-center">
				<div className="space-y-2">
					<h1 className="text-3xl font-bold">{DICT.SUBSCRIPTION.CANCELED.TITLE}</h1>
					<p className="text-muted-foreground">{DICT.SUBSCRIPTION.CANCELED.MESSAGE}</p>
				</div>
				<div className="flex flex-col gap-3">
					<Button onClick={handleRetry} disabled={submitting} className="w-full" size="lg">
						{submitting ? DICT.SUBSCRIPTION.PROCESSING : DICT.SUBSCRIPTION.CANCELED.BUTTON_RETRY}
					</Button>
					<Button variant="outline" asChild className="w-full" size="lg">
						<a href="mailto:contact@freshersco.com">{DICT.SUBSCRIPTION.CANCELED.BUTTON_SUPPORT}</a>
					</Button>
				</div>
			</div>
		</main>
	);
}
