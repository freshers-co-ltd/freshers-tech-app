import type { PricingResponse, SubscriptionStatusResponse } from '@/features/subscription/types';
import { supabase } from '@/lib/supabaseClient';

export const subscriptionService = {
	async createCheckoutSession(): Promise<{ data: string | null; error: string | null }> {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (!session) {
			return { data: null, error: 'Not authenticated' };
		}

		const response = await fetch(
			`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-billing/checkout`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${session.access_token}`,
					'Content-Type': 'application/json',
				},
			},
		);
		const result = await response.json();
		if (!response.ok) {
			return { data: null, error: result.error };
		}
		return { data: result.url, error: null };
	},

	async createPortalSession(): Promise<{ data: string | null; error: string | null }> {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (!session) {
			return { data: null, error: 'Not authenticated' };
		}

		const response = await fetch(
			`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-billing/portal`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${session.access_token}`,
					'Content-Type': 'application/json',
				},
			},
		);
		const result = await response.json();
		if (!response.ok) {
			return { data: null, error: result.error };
		}
		return { data: result.url, error: null };
	},

	async verifyCheckoutSession(
		sessionId: string,
	): Promise<{ data: { status: string } | null; error: string | null }> {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (!session) {
			return { data: null, error: 'Not authenticated' };
		}

		const response = await fetch(
			`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-billing/verify`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${session.access_token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ session_id: sessionId }),
			},
		);
		const result = await response.json();
		if (!response.ok) {
			return { data: null, error: result.error };
		}
		return { data: result, error: null };
	},

	async getSubscriptionStatus(): Promise<{
		data: SubscriptionStatusResponse | null;
		error: string | null;
	}> {
		const { data, error } = await supabase
			.from('subscriptions')
			.select('status, current_period_end, cancel_at')
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();
		if (error) {
			return { data: null, error: error.message };
		}
		return { data, error: null };
	},

	async getPricing(): Promise<{ data: PricingResponse | null; error: string | null }> {
		const CACHE_KEY = 'stripe_pricing_cache';
		const CACHE_TTL = 24 * 60 * 60 * 1000;

		try {
			const cached = localStorage.getItem(CACHE_KEY);
			if (cached) {
				const { data, timestamp } = JSON.parse(cached) as {
					data: PricingResponse;
					timestamp: number;
				};
				if (
					Date.now() - timestamp < CACHE_TTL &&
					typeof data === 'object' &&
					data !== null &&
					typeof data.amount === 'number' &&
					typeof data.currency === 'string'
				) {
					return { data, error: null };
				}
			}
		} catch {
			// corrupt cache, ignore and fetch
		}

		const response = await fetch(
			`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-billing/pricing`,
		);
		const result = await response.json();
		if (!response.ok) {
			return { data: null, error: result.error };
		}
		if (
			typeof result !== 'object' ||
			result === null ||
			typeof result.amount !== 'number' ||
			typeof result.currency !== 'string'
		) {
			return { data: null, error: 'Invalid pricing response' };
		}

		try {
			localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, timestamp: Date.now() }));
		} catch {
			// storage full, ignore
		}

		return { data: result, error: null };
	},

	async cancelSubscription(hostId: string): Promise<{ data: null; error: string | null }> {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (!session) {
			return { data: null, error: 'Not authenticated' };
		}

		const response = await fetch(
			`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-billing/cancel-subscription`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${session.access_token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ host_id: hostId }),
			},
		);
		const result = await response.json();
		if (!response.ok) {
			return { data: null, error: result.error };
		}
		return { data: null, error: null };
	},
};
