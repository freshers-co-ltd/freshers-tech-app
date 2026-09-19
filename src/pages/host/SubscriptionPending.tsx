'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loading } from '@/components/Loading';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { DICT } from '@/dictionary';
import { useAuth } from '@/features/auth/AuthContext';
import { subscriptionService } from '@/features/subscription/services/subscriptionService';
import type { PricingResponse } from '@/features/subscription/types';
import { formatCurrency } from '@/lib/utils';

export function SubscriptionPendingPage() {
	const { profile, loading } = useAuth();
	const [submitting, setSubmitting] = useState(false);
	const [pricing, setPricing] = useState<PricingResponse | null>(null);

	useEffect(() => {
		if (profile && !loading) {
			if (profile.is_invited || profile.host_subscription_status === 'active') {
				window.location.href = '/host/dashboard';
			}
		}
	}, [profile, loading]);

	useEffect(() => {
		subscriptionService
			.getPricing()
			.then(({ data }) => {
				if (data) {
					setPricing(data);
				}
			})
			.catch(() => {
				setPricing(null);
			});
	}, []);

	if (loading) {
		return <Loading />;
	}

	if (!profile) {
		return <Navigate to="/login" replace />;
	}

	if (profile.is_invited || profile.host_subscription_status === 'active') {
		return <Loading />;
	}

	const handleSubscribe = async () => {
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

	const priceLabel = pricing
		? `${formatCurrency(pricing.amount / 100, pricing.currency)}/${pricing.interval}`
		: null;

	return (
		<main className="max-width-container p-2 md:p-8 flex items-center justify-center min-h-[80vh]">
			<div className="max-w-md w-full space-y-10 text-center">
				<div className="space-y-6">
					<h1 className="text-3xl font-bold">{DICT.SUBSCRIPTION.PENDING.TITLE}</h1>
					{priceLabel && (
						<p className="text-muted-foreground">
							{DICT.SUBSCRIPTION.PENDING.MESSAGE.replace('{price}', priceLabel)}
						</p>
					)}
				</div>

				<Button onClick={handleSubscribe} disabled={submitting} className="w-full" size="lg">
					{submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
					{submitting ? DICT.SUBSCRIPTION.PROCESSING : DICT.SUBSCRIPTION.PENDING.BUTTON_SUBSCRIBE}
				</Button>
			</div>
		</main>
	);
}
