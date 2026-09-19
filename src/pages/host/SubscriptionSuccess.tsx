'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Loading } from '@/components/Loading';
import { Button } from '@/components/ui/button';
import { DICT } from '@/dictionary';
import { useAuth } from '@/features/auth/AuthContext';
import { subscriptionService } from '@/features/subscription/services/subscriptionService';

export function SubscriptionSuccessPage() {
	const { profile, loading, refreshProfile } = useAuth();
	const [searchParams] = useSearchParams();
	const [verifying, setVerifying] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const sessionId = searchParams.get('session_id');
		if (!sessionId) {
			setError('No session ID found');
			setVerifying(false);
			return;
		}

		const verify = async () => {
			try {
				const { error: err } = await subscriptionService.verifyCheckoutSession(sessionId);
				if (err) {
					setError(err);
					setVerifying(false);
					return;
				}
				await refreshProfile();
				setVerifying(false);
			} catch {
				setError(DICT.SUBSCRIPTION.CHECKOUT_ERROR);
				setVerifying(false);
			}
		};

		verify();
	}, [searchParams, refreshProfile]);

	if (loading) {
		return <Loading />;
	}

	if (!profile) {
		return <Navigate to="/login" replace />;
	}

	if (verifying) {
		return (
			<main className="max-width-container p-2 md:p-8 flex items-center justify-center min-h-[80vh]">
				<div className="max-w-md w-full space-y-6 text-center">
					<Loader2 className="size-12 animate-spin text-primary mx-auto" />
					<p className="text-muted-foreground">Verifying your subscription...</p>
				</div>
			</main>
		);
	}

	if (error) {
		return (
			<main className="max-width-container p-2 md:p-8 flex items-center justify-center min-h-[80vh]">
				<div className="max-w-md w-full space-y-6 text-center">
					<h1 className="text-3xl font-bold">Verification Failed</h1>
					<p className="text-muted-foreground">{error}</p>
					<Button asChild>
						<a href="/host/subscription/pending">Try Again</a>
					</Button>
				</div>
			</main>
		);
	}

	return (
		<main className="max-width-container p-2 md:p-8 flex items-center justify-center min-h-[80vh]">
			<div className="max-w-md w-full space-y-6 text-center">
				<div className="space-y-2">
					<h1 className="text-3xl font-bold">{DICT.SUBSCRIPTION.SUCCESS.TITLE}</h1>
					<p className="text-muted-foreground">{DICT.SUBSCRIPTION.SUCCESS.MESSAGE}</p>
				</div>
				<Button asChild className="w-full" size="lg">
					<a href="/host/dashboard">{DICT.SUBSCRIPTION.SUCCESS.BUTTON_DASHBOARD}</a>
				</Button>
			</div>
		</main>
	);
}
