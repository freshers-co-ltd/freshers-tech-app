// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { stripe } from "../_shared/stripe.ts";
import { corsHeaders, jsonResponse, getAllowedOrigin } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type Stripe from "npm:stripe@17.x";

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

serve(async (req: Request) => {
	const origin = getAllowedOrigin(req);

	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders(origin) });
	}

	try {
		const body = await req.text();
		const sig = req.headers.get('stripe-signature');
		if (!sig) return jsonResponse({ error: 'Missing signature' }, 400, origin);

		let event: Stripe.Event;
		try {
			event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
		} catch (err) {
			console.error('Webhook signature verification failed:', err);
			return jsonResponse({ error: 'Invalid signature' }, 400, origin);
		}

		const supabase = createClient(
			Deno.env.get('SUPABASE_URL')!,
			Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
		);

		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object as Stripe.Checkout.Session;
				const hostId = session.metadata?.host_id;
				const subscriptionId = session.subscription as string;
				if (!hostId || !subscriptionId) break;

				const subscription = await stripe.subscriptions.retrieve(subscriptionId);

				await supabase.from('subscriptions').upsert({
					host_id: hostId,
					stripe_customer_id: subscription.customer as string,
					stripe_subscription_id: subscription.id,
					stripe_price_id: subscription.items.data[0]?.price.id ?? '',
					status: subscription.status,
					current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
					current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
					cancel_at: subscription.cancel_at
						? new Date(subscription.cancel_at * 1000).toISOString()
						: null,
					canceled_at: subscription.canceled_at
						? new Date(subscription.canceled_at * 1000).toISOString()
						: null,
				}, { onConflict: 'stripe_subscription_id' });

				const { data: alreadyNotified } = await supabase
					.rpc('notification_exists', {
						p_user_id: hostId,
						p_type: 'subscription_active',
						p_interval: '5 minutes',
					});

				if (!alreadyNotified) {
					await supabase.from('notifications').insert({
						user_id: hostId,
						type: 'subscription_active',
						title: 'Subscription Activated',
						message: 'Your subscription is now active. Welcome to CleanerHire!',
					});
				}
				break;
			}

			case 'customer.subscription.updated': {
				const subscription = event.data.object as Stripe.Subscription;

				await supabase
					.from('subscriptions')
					.update({
						status: subscription.status,
						current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
						current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
						cancel_at: subscription.cancel_at
							? new Date(subscription.cancel_at * 1000).toISOString()
							: null,
						canceled_at: subscription.canceled_at
							? new Date(subscription.canceled_at * 1000).toISOString()
							: null,
						updated_at: new Date().toISOString(),
					})
					.eq('stripe_subscription_id', subscription.id);

				const hostId = subscription.metadata?.host_id;

				if (hostId && subscription.status === 'past_due') {
					const { data: alreadyNotified } = await supabase
						.rpc('notification_exists', {
							p_user_id: hostId,
							p_type: 'subscription_payment_failed',
							p_interval: '5 minutes',
						});
					if (!alreadyNotified) {
						await supabase.from('notifications').insert({
							user_id: hostId,
							type: 'subscription_payment_failed',
							title: 'Payment Failed',
							message: 'Your subscription payment failed. Please update your payment method to avoid interruption.',
							data: { action: 'update_payment' },
						});
					}
				}

				if (hostId && subscription.status === 'canceled') {
					const { data: alreadyNotified } = await supabase
						.rpc('notification_exists', {
							p_user_id: hostId,
							p_type: 'subscription_canceled',
							p_interval: '5 minutes',
						});
					if (!alreadyNotified) {
						await supabase.from('notifications').insert({
							user_id: hostId,
							type: 'subscription_canceled',
							title: 'Subscription Canceled',
							message: 'Your subscription has been canceled. Your data is preserved — resubscribe anytime to regain access.',
						});
					}
				}
				break;
			}

			case 'customer.subscription.deleted': {
				const subscription = event.data.object as Stripe.Subscription;
				await supabase
					.from('subscriptions')
					.update({
						status: 'canceled',
						canceled_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					})
					.eq('stripe_subscription_id', subscription.id);
				break;
			}

			case 'invoice.payment_failed': {
				const invoice = event.data.object as Stripe.Invoice;
				const subscriptionId = invoice.subscription as string;

				const { data: sub } = await supabase
					.from('subscriptions')
					.select('host_id')
					.eq('stripe_subscription_id', subscriptionId)
					.single();

				if (sub?.host_id) {
					const { data: alreadyNotified } = await supabase
						.rpc('notification_exists', {
							p_user_id: sub.host_id,
							p_type: 'subscription_payment_failed',
							p_interval: '5 minutes',
						});
					if (!alreadyNotified) {
						await supabase.from('notifications').insert({
							user_id: sub.host_id,
							type: 'subscription_payment_failed',
							title: 'Payment Failed',
							message: 'Your subscription payment failed. Please update your payment method.',
							data: { action: 'update_payment' },
						});
					}
				}
				break;
			}

			case 'invoice.paid': {
				const invoice = event.data.object as Stripe.Invoice;
				const subscriptionId = invoice.subscription as string;

				const { data: sub } = await supabase
					.from('subscriptions')
					.select('host_id')
					.eq('stripe_subscription_id', subscriptionId)
					.single();

				if (sub?.host_id) {
					const { data: alreadyNotified } = await supabase
						.rpc('notification_exists', {
							p_user_id: sub.host_id,
							p_type: 'subscription_active',
							p_interval: '5 minutes',
						});
					if (!alreadyNotified) {
						await supabase.from('notifications').insert({
							user_id: sub.host_id,
							type: 'subscription_active',
							title: 'Payment Received',
							message: 'Your subscription payment was successful.',
						});
					}
				}
				break;
			}
		}

		return jsonResponse({ received: true }, 200, origin);
	} catch (err) {
		console.error('Webhook error:', err);
		return jsonResponse({ error: 'Webhook handler failed' }, 500, origin);
	}
});
