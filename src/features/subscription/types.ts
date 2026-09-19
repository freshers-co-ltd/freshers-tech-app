import type { Database } from '@/lib/database.types';

export type SubscriptionStatus = Database['public']['Enums']['subscription_status'];

export interface Subscription {
	id: string;
	host_id: string;
	stripe_customer_id: string;
	stripe_subscription_id: string;
	stripe_price_id: string;
	status: SubscriptionStatus;
	current_period_start: string | null;
	current_period_end: string | null;
	cancel_at: string | null;
	canceled_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface CheckoutSessionResponse {
	url: string;
}

export interface PortalSessionResponse {
	url: string;
}

export interface SubscriptionStatusResponse {
	status: SubscriptionStatus | null;
	current_period_end: string | null;
	cancel_at: string | null;
}

export interface PricingResponse {
	amount: number;
	currency: string;
	interval: string;
}
